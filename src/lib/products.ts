import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
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
  // Le stock reste toujours compte en unites (unitLabel : "bouteille",
  // "sachet"...). packageLabel/unitsPerPackage decrivent le conditionnement
  // d'achat (ex: "Casier" de 24) — uniquement pour convertir les
  // receptions de stock, la vente reste toujours a l'unite.
  unitLabel?: string;
  packageLabel?: string | null;
  unitsPerPackage?: number | null;
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
        unitLabel: input.unitLabel ?? "bouteille",
        packageLabel: input.packageLabel ?? null,
        unitsPerPackage: input.unitsPerPackage ?? null,
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

export type UpdateProductInput = Partial<{
  name: string;
  categoryId: string | null;
  unitPrice: number;
  purchasePrice: number;
  unitLabel: string;
  packageLabel: string | null;
  unitsPerPackage: number | null;
  stockMinThreshold: number;
  isActive: number;
}>;

// Modifie la fiche catalogue d'un article (nom, categorie, prix,
// conditionnement...) — pas le niveau de stock, qui ne bouge que par
// mouvement de stock (createStockMovement / createSale).
export async function updateProduct(organizationId: string, id: string, patch: UpdateProductInput) {
  const db = getDb();

  const values: Record<string, unknown> = { ...patch };
  if (patch.unitPrice !== undefined) values.unitPrice = patch.unitPrice.toString();
  if (patch.purchasePrice !== undefined) values.purchasePrice = patch.purchasePrice.toString();

  const [updated] = await db
    .update(products)
    .set(values)
    .where(and(eq(products.id, id), eq(products.organizationId, organizationId)))
    .returning();

  if (!updated) throw new HttpError(404, "Article introuvable");
  return updated;
}

export async function listProducts(organizationId: string, includeInactive = false) {
  const db = getDb();
  return db
    .select()
    .from(products)
    .where(
      includeInactive
        ? eq(products.organizationId, organizationId)
        : and(eq(products.organizationId, organizationId), eq(products.isActive, 1))
    )
    .orderBy(desc(products.createdAt));
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
  occurredAt?: Date;
  batchId?: string;
};

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

type ApplyMovementInput = {
  organizationId: string;
  userId: string;
  productId: string;
  type: "entry" | "adjustment";
  quantityDelta: number;
  note?: string;
  occurredAt?: Date;
  batchId?: string;
  reversalOfBatchId?: string;
};

// Applique un mouvement (verif stock, insert stock_movements, update
// currentStock) dans une transaction deja ouverte — reutilise par
// createStockMovement (sa propre transaction, un seul mouvement) et
// reverseStockMovementBatch (une transaction partagee par tout un lot,
// pour que l'annulation soit tout-ou-rien).
async function applyStockMovement(tx: Tx, input: ApplyMovementInput) {
  const [product] = await tx
    .select()
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.organizationId, input.organizationId)));

  if (!product) {
    throw new HttpError(404, "Article introuvable");
  }

  const newStock = product.currentStock + input.quantityDelta;
  if (newStock < 0) {
    throw new HttpError(409, `Stock insuffisant pour ${product.name}`);
  }

  const [movement] = await tx
    .insert(stockMovements)
    .values({
      organizationId: input.organizationId,
      productId: input.productId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      note: input.note,
      batchId: input.batchId,
      reversalOfBatchId: input.reversalOfBatchId,
      createdByUserId: input.userId,
      ...(input.occurredAt ? { createdAt: input.occurredAt } : {}),
    })
    .returning();

  await tx
    .update(products)
    .set({ currentStock: sql`${products.currentStock} + ${input.quantityDelta}` })
    .where(eq(products.id, input.productId));

  return movement;
}

export async function createStockMovement(input: CreateStockMovementInput) {
  const db = getDb();
  return db.transaction((tx) => applyStockMovement(tx, input));
}

export type ReverseStockMovementBatchInput = {
  organizationId: string;
  userId: string;
  batchId: string;
};

// Annule un lot de mouvements via une contre-ecriture tracee (jamais
// d'edition/suppression des lignes d'origine — cf. commentaire sur
// stockMovements : source de verite immuable). Tout-ou-rien : si annuler
// une seule ligne ferait passer un stock sous zero, rien n'est annule.
export async function reverseStockMovementBatch(input: ReverseStockMovementBatchInput) {
  const db = getDb();

  const original = await db
    .select()
    .from(stockMovements)
    .where(
      and(eq(stockMovements.organizationId, input.organizationId), eq(stockMovements.batchId, input.batchId))
    );

  if (original.length === 0) {
    throw new HttpError(404, "Lot introuvable");
  }

  const [alreadyReversed] = await db
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.organizationId, input.organizationId),
        eq(stockMovements.reversalOfBatchId, input.batchId)
      )
    );

  if (alreadyReversed) {
    throw new HttpError(409, "Ce lot a deja ete annule");
  }

  const reversalBatchId = randomUUID();
  const originalNote = original[0].note;
  const note = originalNote ? `Annulation — ${originalNote}` : "Annulation";

  return db.transaction(async (tx) => {
    const reversed = [];
    for (const m of original) {
      reversed.push(
        await applyStockMovement(tx, {
          organizationId: input.organizationId,
          userId: input.userId,
          productId: m.productId,
          type: "adjustment",
          quantityDelta: -m.quantityDelta,
          note,
          batchId: reversalBatchId,
          reversalOfBatchId: input.batchId,
        })
      );
    }
    return reversed;
  });
}
