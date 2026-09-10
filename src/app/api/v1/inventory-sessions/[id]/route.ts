import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { getInventorySession, updateInventoryCounts } from "@/lib/inventory";
import { updateInventoryCountsSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const result = await getInventorySession(organizationId, id);
    return NextResponse.json(result);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const body = updateInventoryCountsSchema.parse(await req.json());
    const lines = await updateInventoryCounts(organizationId, id, body.lines);
    return NextResponse.json({ lines });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
