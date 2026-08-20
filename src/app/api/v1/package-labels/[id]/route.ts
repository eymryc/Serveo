import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createCategorySchema } from "@/lib/validation";
import { deletePackageLabel, updatePackageLabel } from "@/lib/categories";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const body = createCategorySchema.parse(await req.json());
    const category = await updatePackageLabel(organizationId, id, body.name.trim());
    return NextResponse.json({ category });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    await deletePackageLabel(organizationId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
