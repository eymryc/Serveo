import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryLines, inventorySessions, products, stockMovements } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

export async function listInventorySessions(organizationId: string, limit = 30) {
  const db = getDb();
  return db
    .select()
    .from(inventorySessions)
    .where(eq(inventorySessions.organizationId, organizationId))
    .orderBy(desc(inventorySessions.createdAt))
    .limit(limit);
}

export async function getInventorySession(organizationId: string, sessionId: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(inventorySessions)
    .where(
      and(
        eq(inventorySessions.id, sessionId),
        eq(inventorySessions.organizationId, organizationId)
      )
    );
  if (!session) throw new HttpError(404, "Session d'inventaire introuvable");

  const lines = await db
    .select({
      id: inventoryLines.id,
      sessionId: inventoryLines.sessionId,
      productId: inventoryLines.productId,
      productName: products.name,
      theoreticalQty: inventoryLines.theoreticalQty,
      countedQty: inventoryLines.countedQty,
      variance: inventoryLines.variance,
    })
    .from(inventoryLines)
    .innerJoin(products, eq(products.id, inventoryLines.productId))
    .where(eq(inventoryLines.sessionId, sessionId));

  return { session, lines };
}

/** Snapshot du stock courant en lignes draft (counted = theoretical au demarrage). */
export async function createInventorySession(input: {
  organizationId: string;
  userId: string;
  note?: string | null;
}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [existingDraft] = await tx
      .select({ id: inventorySessions.id })
      .from(inventorySessions)
      .where(
        and(
          eq(inventorySessions.organizationId, input.organizationId),
          eq(inventorySessions.status, "draft")
        )
      )
      .limit(1);
    if (existingDraft) {
      throw new HttpError(
        409,
        "Un inventaire est deja en cours — terminez-le avant d'en creer un autre"
      );
    }

    const activeProducts = await tx
      .select()
      .from(products)
      .where(and(eq(products.organizationId, input.organizationId), eq(products.isActive, 1)));

    if (activeProducts.length === 0) {
      throw new HttpError(400, "Aucun article actif a inventorier");
    }

    const [session] = await tx
      .insert(inventorySessions)
      .values({
        organizationId: input.organizationId,
        createdByUserId: input.userId,
        note: input.note ?? null,
        status: "draft",
      })
      .returning();

    const lines = await tx
      .insert(inventoryLines)
      .values(
        activeProducts.map((p) => ({
          sessionId: session.id,
          productId: p.id,
          theoreticalQty: p.currentStock,
          countedQty: p.currentStock,
          variance: 0,
        }))
      )
      .returning();

    return { session, lines };
  });
}

export async function updateInventoryCounts(
  organizationId: string,
  sessionId: string,
  lines: { productId: string; countedQty: number }[]
) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(inventorySessions)
    .where(
      and(
        eq(inventorySessions.id, sessionId),
        eq(inventorySessions.organizationId, organizationId)
      )
    );

  if (!session) throw new HttpError(404, "Session d'inventaire introuvable");
  if (session.status !== "draft") {
    throw new HttpError(409, "Inventaire deja cloture — comptages non modifiables");
  }

  return db.transaction(async (tx) => {
    const updated = [];
    for (const line of lines) {
      const [existing] = await tx
        .select()
        .from(inventoryLines)
        .where(
          and(eq(inventoryLines.sessionId, sessionId), eq(inventoryLines.productId, line.productId))
        );

      if (!existing) {
        throw new HttpError(404, `Ligne inventaire introuvable pour le produit ${line.productId}`);
      }

      const variance = line.countedQty - existing.theoreticalQty;
      const [row] = await tx
        .update(inventoryLines)
        .set({ countedQty: line.countedQty, variance })
        .where(eq(inventoryLines.id, existing.id))
        .returning();
      updated.push(row);
    }
    return updated;
  });
}

export async function completeInventorySession(input: {
  organizationId: string;
  userId: string;
  sessionId: string;
}) {
  const db = getDb();
  const { session, lines } = await getInventorySession(input.organizationId, input.sessionId);

  if (session.status !== "draft") {
    throw new HttpError(409, "Cet inventaire est deja cloture");
  }

  const batchId = randomUUID();
  const now = new Date();

  return db.transaction(async (tx) => {
    // Cloture atomique d'abord : empêche un double complete concurrent.
    const [updated] = await tx
      .update(inventorySessions)
      .set({ status: "completed", completedAt: now })
      .where(
        and(
          eq(inventorySessions.id, input.sessionId),
          eq(inventorySessions.organizationId, input.organizationId),
          eq(inventorySessions.status, "draft")
        )
      )
      .returning();

    if (!updated) {
      throw new HttpError(409, "Cet inventaire est deja cloture");
    }

    for (const line of lines) {
      if (line.variance === 0) continue;

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, line.productId));

      if (!product) {
        throw new HttpError(404, `Article introuvable: ${line.productName}`);
      }

      // Applique l'ecart sur le stock courant (peut avoir bouge depuis le snapshot).
      if (product.currentStock + line.variance < 0) {
        throw new HttpError(
          409,
          `Stock insuffisant apres inventaire pour ${line.productName}`
        );
      }

      await tx.insert(stockMovements).values({
        organizationId: input.organizationId,
        productId: line.productId,
        type: "adjustment",
        quantityDelta: line.variance,
        note: "Ajustement inventaire",
        batchId,
        createdByUserId: input.userId,
      });

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} + ${line.variance}` })
        .where(eq(products.id, line.productId));
    }

    return { session: updated, lines, stockBatchId: batchId };
  });
}
