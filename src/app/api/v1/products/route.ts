import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createProductSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { organizationId } = await requireTenant();
    const db = getDb();

    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.organizationId, organizationId), eq(products.isActive, 1)));

    return NextResponse.json({ products: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireTenant();
    const body = createProductSchema.parse(await req.json());
    const db = getDb();

    const product = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          organizationId,
          categoryId: body.categoryId ?? null,
          name: body.name,
          unitPrice: body.unitPrice.toString(),
          purchasePrice: body.purchasePrice.toString(),
          currentStock: body.initialStock,
          stockMinThreshold: body.stockMinThreshold,
        })
        .returning();

      if (body.initialStock > 0) {
        await tx.insert(stockMovements).values({
          organizationId,
          productId: created.id,
          type: "initial",
          quantityDelta: body.initialStock,
          createdByUserId: userId,
        });
      }

      return created;
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
