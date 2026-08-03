import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { stockMovements } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createStockMovementSchema } from "@/lib/validation";
import { createStockMovement } from "@/lib/products";

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

    const movement = await createStockMovement({
      organizationId,
      userId,
      productId: id,
      ...body,
    });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
