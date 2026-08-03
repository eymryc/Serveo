import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createStockMovementSchema } from "@/lib/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireTenant();
    const { id } = await params;
    const db = getDb();

    const rows = await db
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.organizationId, organizationId), eq(stockMovements.productId, id)))
      .orderBy(stockMovements.createdAt);

    return NextResponse.json({ movements: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, userId } = await requireTenant();
    const { id } = await params;
    const body = createStockMovementSchema.parse(await req.json());
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, id), eq(products.organizationId, organizationId)));

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const newStock = product.currentStock + body.quantityDelta;
      if (newStock < 0) {
        throw new Error("NEGATIVE_STOCK");
      }

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          organizationId,
          productId: id,
          type: body.type,
          quantityDelta: body.quantityDelta,
          note: body.note,
          createdByUserId: userId,
        })
        .returning();

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} + ${body.quantityDelta}` })
        .where(eq(products.id, id));

      return movement;
    });

    return NextResponse.json({ movement: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") {
      return NextResponse.json({ error: "Stock insuffisant pour cette sortie" }, { status: 409 });
    }
    return tenantErrorResponse(error);
  }
}
