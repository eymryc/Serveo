import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { products, sales, stockMovements } from "@/db/schema";
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
};

export type CancelSaleBatchInput = {
  organizationId: string;
  userId: string;
  /** batchId de la facture, ou id d'une ligne si vente sans batch. */
  batchKey: string;
  reason?: string;
};

// Une vente cree TOUJOURS son mouvement de stock (sale_exit) dans la meme
// transaction — c'est le correctif direct du bug du template Sheets ou
// Ventes et Stock etaient deux feuilles saisies independamment. Extrait de
// la route pour etre teste directement, sans passer par HTTP.
export async function createSale(input: CreateSaleInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.organizationId, input.organizationId)));

    if (!product) {
      throw new HttpError(404, "Article introuvable");
    }
    if (product.currentStock < input.quantity) {
      throw new HttpError(409, "Stock insuffisant pour cette vente");
    }

    const unitPrice = Number(product.unitPrice);
    const grossAmount = unitPrice * input.quantity;
    const netAmount = grossAmount - input.discount;

    const [sale] = await tx
      .insert(sales)
      .values({
        organizationId: input.organizationId,
        productId: input.productId,
        soldAt: input.soldAt ?? new Date(),
        unitPrice: product.unitPrice,
        quantity: input.quantity,
        discount: input.discount.toString(),
        grossAmount: grossAmount.toString(),
        netAmount: netAmount.toString(),
        paymentMethod: input.paymentMethod as (typeof sales.$inferInsert)["paymentMethod"],
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

  let rows = await db
    .select()
    .from(sales)
    .where(
      and(eq(sales.organizationId, input.organizationId), eq(sales.batchId, input.batchKey))
    );

  if (rows.length === 0) {
    rows = await db
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
  const reason = input.reason?.trim() || null;
  const note = reason ? `Annulation vente — ${reason}` : "Annulation vente";
  const reversalBatchId = randomUUID();
  const cancelledAt = new Date();

  return db.transaction(async (tx) => {
    const cancelled = [];
    for (const sale of rows) {
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

      const [updated] = await tx
        .update(sales)
        .set({
          cancelledAt,
          cancelledByUserId: input.userId,
          cancelReason: reason,
        })
        .where(eq(sales.id, sale.id))
        .returning();

      cancelled.push(updated);
    }
    return cancelled;
  });
}
