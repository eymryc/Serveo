import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { updateSupplier } from "@/lib/suppliers";
import { updateSupplierSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const body = updateSupplierSchema.parse(await req.json());
    const supplier = await updateSupplier(organizationId, id, body);
    return NextResponse.json({ supplier });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
