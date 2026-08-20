import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Journal des mouvements de stock de tout le catalogue (pas un seul
// article) — alimente l'onglet Historique de la page Stock.
export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
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
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          gte(stockMovements.createdAt, from),
          lte(stockMovements.createdAt, to)
        )
      )
      .orderBy(desc(stockMovements.createdAt));

    return NextResponse.json({ movements: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
