import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  products,
  stockMovements,
  supplierDeliveries,
  supplierDeliveryLines,
  suppliers,
} from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

export async function listSuppliers(organizationId: string, includeInactive = false) {
  const db = getDb();
  return db
    .select()
    .from(suppliers)
    .where(
      includeInactive
        ? eq(suppliers.organizationId, organizationId)
        : and(eq(suppliers.organizationId, organizationId), eq(suppliers.isActive, 1))
    )
    .orderBy(desc(suppliers.createdAt));
}

export async function createSupplier(input: {
  organizationId: string;
  name: string;
  phone?: string | null;
  note?: string | null;
}) {
  const db = getDb();
  const [created] = await db
    .insert(suppliers)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      phone: input.phone ?? null,
      note: input.note ?? null,
    })
    .returning();
  return created;
}

export type UpdateSupplierInput = Partial<{
  name: string;
  phone: string | null;
  note: string | null;
  isActive: number;
}>;

export async function updateSupplier(
  organizationId: string,
  id: string,
  patch: UpdateSupplierInput
) {
  const db = getDb();
  const [updated] = await db
    .update(suppliers)
    .set(patch)
    .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)))
    .returning();

  if (!updated) throw new HttpError(404, "Fournisseur introuvable");
  return updated;
}

export async function getSupplier(organizationId: string, supplierId: string) {
  const db = getDb();
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, organizationId)));
  if (!supplier) throw new HttpError(404, "Fournisseur introuvable");
  return supplier;
}

export async function listSupplierDeliveries(organizationId: string, limit = 50) {
  const db = getDb();
  return db
    .select({
      id: supplierDeliveries.id,
      organizationId: supplierDeliveries.organizationId,
      supplierId: supplierDeliveries.supplierId,
      supplierName: suppliers.name,
      deliveryDate: supplierDeliveries.deliveryDate,
      note: supplierDeliveries.note,
      totalAmount: supplierDeliveries.totalAmount,
      paidAmount: supplierDeliveries.paidAmount,
      paymentMethod: supplierDeliveries.paymentMethod,
      stockBatchId: supplierDeliveries.stockBatchId,
      createdByUserId: supplierDeliveries.createdByUserId,
      createdAt: supplierDeliveries.createdAt,
    })
    .from(supplierDeliveries)
    .innerJoin(suppliers, eq(suppliers.id, supplierDeliveries.supplierId))
    .where(eq(supplierDeliveries.organizationId, organizationId))
    .orderBy(desc(supplierDeliveries.deliveryDate))
    .limit(limit);
}

export async function createSupplierDelivery(input: {
  organizationId: string;
  userId: string;
  supplierId: string;
  lines: { productId: string; quantity: number; unitCost: number }[];
  paidAmount: number;
  paymentMethod?: string | null;
  note?: string | null;
  deliveryDate?: Date;
}) {
  if (input.lines.length === 0) {
    throw new HttpError(400, "Au moins une ligne de livraison est requise");
  }

  await getSupplier(input.organizationId, input.supplierId);

  const totalAmount = input.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  const stockBatchId = randomUUID();
  const db = getDb();

  return db.transaction(async (tx) => {
    for (const line of input.lines) {
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(eq(products.id, line.productId), eq(products.organizationId, input.organizationId))
        );
      if (!product) {
        throw new HttpError(404, `Article introuvable: ${line.productId}`);
      }
    }

    const [delivery] = await tx
      .insert(supplierDeliveries)
      .values({
        organizationId: input.organizationId,
        supplierId: input.supplierId,
        deliveryDate: input.deliveryDate ?? new Date(),
        note: input.note ?? null,
        totalAmount: totalAmount.toString(),
        paidAmount: input.paidAmount.toString(),
        paymentMethod: (input.paymentMethod ?? null) as
          | (typeof supplierDeliveries.$inferInsert)["paymentMethod"]
          | null,
        stockBatchId,
        createdByUserId: input.userId,
      })
      .returning();

    const createdLines = await tx
      .insert(supplierDeliveryLines)
      .values(
        input.lines.map((l) => ({
          deliveryId: delivery.id,
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost.toString(),
        }))
      )
      .returning();

    for (const line of input.lines) {
      await tx.insert(stockMovements).values({
        organizationId: input.organizationId,
        productId: line.productId,
        type: "entry",
        quantityDelta: line.quantity,
        note: input.note ? `Livraison fournisseur — ${input.note}` : "Livraison fournisseur",
        batchId: stockBatchId,
        createdByUserId: input.userId,
        ...(input.deliveryDate ? { createdAt: input.deliveryDate } : {}),
      });

      const patch: { currentStock: ReturnType<typeof sql>; purchasePrice?: string } = {
        currentStock: sql`${products.currentStock} + ${line.quantity}`,
      };
      // Met a jour le prix d'achat quand un cout unitaire est fourni.
      if (line.unitCost > 0) {
        patch.purchasePrice = line.unitCost.toString();
      }

      await tx.update(products).set(patch).where(eq(products.id, line.productId));
    }

    return { delivery, lines: createdLines };
  });
}
