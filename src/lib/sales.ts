import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products, sales, stockMovements, customers } from "@/db/schema";
import { getOpenCashSession } from "@/lib/cash-sessions";
import { HttpError } from "@/lib/http-errors";

export type CreateSaleInput = {
  organizationId: string;
  userId: string;
  productId: string;
  quantity: number;
  discount: number;
  paymentMethod: string;
  soldAt?: Date;
  batchId?: string;
  customerId?: string | null;
};

export type CancelSaleBatchInput = {
  organizationId: string;
  userId: string;
  /** batchId de la facture, ou id d'une ligne si vente sans batch. */
  batchKey: string;
  reason?: string;
  /** Role org NextAuth (`org:admin` / `org:member`) — pour appliquer memberCanCancelSales. */
  orgRole?: string | null;
};

// Une vente cree TOUJOURS son mouvement de stock (sale_exit) dans la meme
// transaction — c'est le correctif direct du bug du template Sheets ou
// Ventes et Stock etaient deux feuilles saisies independamment. Extrait de
// la route pour etre teste directement, sans passer par HTTP.
export async function createSale(input: CreateSaleInput) {
  if (input.paymentMethod === "credit_client" && !input.customerId) {
    throw new HttpError(400, "Un client est requis pour une vente a credit");
  }

  const openSession = await getOpenCashSession(input.organizationId);
  const db = getDb();

  return db.transaction(async (tx) => {
    if (input.paymentMethod === "credit_client" && input.customerId) {
      const [customer] = await tx
        .select({ id: customers.id, isActive: customers.isActive })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.organizationId, input.organizationId)
          )
        )
        .limit(1);
      if (!customer) {
        throw new HttpError(404, "Client introuvable");
      }
      if (customer.isActive !== 1) {
        throw new HttpError(409, "Ce client est inactif");
      }
    }

    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.organizationId, input.organizationId)));

    if (!product) {
      throw new HttpError(404, "Article introuvable");
    }
    if (product.isActive !== 1) {
      throw new HttpError(409, "Cet article est inactif");
    }
    if (product.currentStock < input.quantity) {
      throw new HttpError(409, "Stock insuffisant pour cette vente");
    }

    const unitPrice = Number(product.unitPrice);
    const grossAmount = unitPrice * input.quantity;
    const discount = Math.min(Math.max(0, input.discount), grossAmount);
    const netAmount = grossAmount - discount;

    const [sale] = await tx
      .insert(sales)
      .values({
        organizationId: input.organizationId,
        productId: input.productId,
        soldAt: input.soldAt ?? new Date(),
        unitPrice: product.unitPrice,
        quantity: input.quantity,
        discount: discount.toString(),
        grossAmount: grossAmount.toString(),
        netAmount: netAmount.toString(),
        paymentMethod: input.paymentMethod as (typeof sales.$inferInsert)["paymentMethod"],
        customerId: input.paymentMethod === "credit_client" ? (input.customerId ?? null) : null,
        cashSessionId: openSession?.id ?? null,
        createdByUserId: input.userId,
        batchId: input.batchId,
      })
      .returning();

    await tx.insert(stockMovements).values({
      organizationId: input.organizationId,
      productId: input.productId,
      type: "sale_exit",
      quantityDelta: -input.quantity,
      referenceSaleId: sale.id,
      batchId: input.batchId,
      createdByUserId: input.userId,
    });

    await tx
      .update(products)
      .set({ currentStock: sql`${products.currentStock} - ${input.quantity}` })
      .where(eq(products.id, input.productId));

    return sale;
  });
}

export async function listSales(organizationId: string, from: Date, to: Date) {
  const db = getDb();
  return db
    .select()
    .from(sales)
    .where(and(eq(sales.organizationId, organizationId), gte(sales.soldAt, from), lte(sales.soldAt, to)))
    .orderBy(desc(sales.soldAt), desc(sales.createdAt));
}

/** Predicat SQL : ventes actives (non annulees) — a reutiliser dans les KPI. */
export function activeSalesOnly() {
  return isNull(sales.cancelledAt);
}

/**
 * Annule une facture (lot) via marquage + contre-ecriture stock.
 * Jamais de suppression des lignes d'origine.
 */
export async function cancelSaleBatch(input: CancelSaleBatchInput) {
  const db = getDb();

  if (input.orgRole === "org:member") {
    const [org] = await db
      .select({ memberCanCancelSales: organizations.memberCanCancelSales })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .limit(1);
    if (org && org.memberCanCancelSales === 0) {
      throw new HttpError(403, "L'annulation de ventes est reservee au gerant");
    }
  }

  const reason = input.reason?.trim() || null;
  const note = reason ? `Annulation vente — ${reason}` : "Annulation vente";
  const reversalBatchId = randomUUID();
  const cancelledAt = new Date();

  return db.transaction(async (tx) => {
    let rows = await tx
      .select()
      .from(sales)
      .where(
        and(eq(sales.organizationId, input.organizationId), eq(sales.batchId, input.batchKey))
      );

    if (rows.length === 0) {
      rows = await tx
        .select()
        .from(sales)
        .where(and(eq(sales.organizationId, input.organizationId), eq(sales.id, input.batchKey)));
    }

    if (rows.length === 0) {
      throw new HttpError(404, "Facture introuvable");
    }

    if (rows.some((r) => r.cancelledAt != null)) {
      throw new HttpError(409, "Cette facture a deja ete annulee");
    }

    const cancelKey = rows[0].batchId ?? rows[0].id;
    const cancelled = [];

    for (const sale of rows) {
      // Garde concurrente : n'annule que si encore active.
      const [updated] = await tx
        .update(sales)
        .set({
          cancelledAt,
          cancelledByUserId: input.userId,
          cancelReason: reason,
        })
        .where(and(eq(sales.id, sale.id), isNull(sales.cancelledAt)))
        .returning();

      if (!updated) {
        throw new HttpError(409, "Cette facture a deja ete annulee");
      }

      await tx.insert(stockMovements).values({
        organizationId: input.organizationId,
        productId: sale.productId,
        type: "adjustment",
        quantityDelta: sale.quantity,
        referenceSaleId: sale.id,
        note,
        batchId: reversalBatchId,
        reversalOfBatchId: cancelKey,
        createdByUserId: input.userId,
      });

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} + ${sale.quantity}` })
        .where(eq(products.id, sale.productId));

      cancelled.push(updated);
    }
    return cancelled;
  });
}

/** Payload ticket / recu pour impression ou partage. */
export async function getSaleTicket(organizationId: string, batchKey: string) {
  const db = getDb();

  let rows = await db
    .select({
      id: sales.id,
      productId: sales.productId,
      productName: products.name,
      soldAt: sales.soldAt,
      unitPrice: sales.unitPrice,
      quantity: sales.quantity,
      discount: sales.discount,
      grossAmount: sales.grossAmount,
      netAmount: sales.netAmount,
      paymentMethod: sales.paymentMethod,
      batchId: sales.batchId,
      cancelledAt: sales.cancelledAt,
      customerId: sales.customerId,
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(and(eq(sales.organizationId, organizationId), eq(sales.batchId, batchKey)));

  if (rows.length === 0) {
    rows = await db
      .select({
        id: sales.id,
        productId: sales.productId,
        productName: products.name,
        soldAt: sales.soldAt,
        unitPrice: sales.unitPrice,
        quantity: sales.quantity,
        discount: sales.discount,
        grossAmount: sales.grossAmount,
        netAmount: sales.netAmount,
        paymentMethod: sales.paymentMethod,
        batchId: sales.batchId,
        cancelledAt: sales.cancelledAt,
        customerId: sales.customerId,
      })
      .from(sales)
      .innerJoin(products, eq(products.id, sales.productId))
      .where(and(eq(sales.organizationId, organizationId), eq(sales.id, batchKey)));
  }

  if (rows.length === 0) {
    throw new HttpError(404, "Facture introuvable");
  }

  const [org] = await db
    .select({ name: organizations.name, currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  let customerName: string | null = null;
  const customerId = rows[0].customerId;
  if (customerId) {
    const [customer] = await db
      .select({ name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .limit(1);
    customerName = customer?.name ?? null;
  }

  const grossTotal = rows.reduce((s, r) => s + Number(r.grossAmount), 0);
  const discountTotal = rows.reduce((s, r) => s + Number(r.discount), 0);
  const netTotal = rows.reduce((s, r) => s + Number(r.netAmount), 0);

  return {
    organizationName: org?.name ?? "",
    currency: org?.currency ?? "FCFA",
    batchId: rows[0].batchId ?? rows[0].id,
    soldAt: rows[0].soldAt,
    paymentMethod: rows[0].paymentMethod,
    customerId,
    customerName,
    cancelledAt: rows[0].cancelledAt,
    lines: rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity,
      unitPrice: Number(r.unitPrice),
      discount: Number(r.discount),
      grossAmount: Number(r.grossAmount),
      netAmount: Number(r.netAmount),
    })),
    totals: {
      gross: grossTotal,
      discount: discountTotal,
      net: netTotal,
    },
  };
}
