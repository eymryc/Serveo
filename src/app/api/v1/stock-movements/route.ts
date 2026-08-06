import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";

// Journal des mouvements de stock de tout le catalogue (pas un seul
// article) — alimente l'onglet Historique de la page Stock.
export async function GET() {
  try {
    const { organizationId } = await requireTenant();
    const db = getDb();

    const rows = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        type: stockMovements.type,
        quantityDelta: stockMovements.quantityDelta,
        note: stockMovements.note,
        batchId: stockMovements.batchId,
        reversalOfBatchId: stockMovements.reversalOfBatchId,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(eq(stockMovements.organizationId, organizationId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(200);

    return NextResponse.json({ movements: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
