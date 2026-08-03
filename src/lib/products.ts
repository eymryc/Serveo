import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

export type CreateProductInput = {
  organizationId: string;
  userId: string;
  name: string;
  categoryId?: string | null;
  unitPrice: number;
  purchasePrice: number;
  initialStock: number;
  stockMinThreshold: number;
};

export async function createProduct(input: CreateProductInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        organizationId: input.organizationId,
        categoryId: input.categoryId ?? null,
        name: input.name,
        unitPrice: input.unitPrice.toString(),
        purchasePrice: input.purchasePrice.toString(),
        currentStock: input.initialStock,
        stockMinThreshold: input.stockMinThreshold,
      })
      .returning();

    if (input.initialStock > 0) {
      await tx.insert(stockMovements).values({
        organizationId: input.organizationId,
        productId: created.id,
        type: "initial",
        quantityDelta: input.initialStock,
        createdByUserId: input.userId,
      });
    }

    return created;
  });
}

export async function listProducts(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(products)
    .where(and(eq(products.organizationId, organizationId), eq(products.isActive, 1)));
}

// Le prix d'achat revele la marge par article : masque pour tout role qui
// n'est pas gerant (utilise sur /products et sur les alertes du dashboard).
export function stripPurchasePrice<T extends { purchasePrice: string }>(rows: T[]) {
  return rows.map((row) => {
    const rest: Omit<T, "purchasePrice"> & { purchasePrice?: string } = { ...row };
    delete rest.purchasePrice;
    return rest;
  });
}

export type CreateStockMovementInput = {
  organizationId: string;
  userId: string;
  productId: string;
  type: "entry" | "adjustment";
  quantityDelta: number;
  note?: string;
};

export async function createStockMovement(input: CreateStockMovementInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.organizationId, input.organizationId)));

    if (!product) {
      throw new HttpError(404, "Article introuvable");
    }

    const newStock = product.currentStock + input.quantityDelta;
    if (newStock < 0) {
      throw new HttpError(409, "Stock insuffisant pour cette sortie");
    }

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        organizationId: input.organizationId,
        productId: input.productId,
        type: input.type,
        quantityDelta: input.quantityDelta,
        note: input.note,
        createdByUserId: input.userId,
      })
      .returning();

    await tx
      .update(products)
      .set({ currentStock: sql`${products.currentStock} + ${input.quantityDelta}` })
      .where(eq(products.id, input.productId));

    return movement;
  });
}
