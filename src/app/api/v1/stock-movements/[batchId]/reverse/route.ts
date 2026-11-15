import { NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { reverseStockMovementBatch } from "@/lib/products";
import { recordAudit } from "@/lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { organizationId, userId } = await requireTenant();
    const { batchId } = await params;

    const movements = await reverseStockMovementBatch({ organizationId, userId, batchId });
    await recordAudit({
      organizationId,
      action: "stock.reverse",
      targetType: "stock_batch",
      targetId: batchId,
      metadata: { lines: movements.length },
    });
    return NextResponse.json({ movements }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
