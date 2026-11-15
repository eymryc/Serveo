import { NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { completeInventorySession } from "@/lib/inventory";
import { recordAudit } from "@/lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, userId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const result = await completeInventorySession({
      organizationId,
      userId,
      sessionId: id,
    });
    await recordAudit({
      organizationId,
      action: "inventory.complete",
      targetType: "inventory_session",
      targetId: id,
      metadata: {
        adjustedLines: result.lines.filter((l) => l.variance !== 0).length,
        netVariance: result.lines.reduce((sum, l) => sum + l.variance, 0),
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
