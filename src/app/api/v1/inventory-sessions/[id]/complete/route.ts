import { NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { completeInventorySession } from "@/lib/inventory";

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
    return NextResponse.json(result);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
