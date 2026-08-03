import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { deleteExpenseCategory } from "@/lib/categories";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    await deleteExpenseCategory(organizationId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
