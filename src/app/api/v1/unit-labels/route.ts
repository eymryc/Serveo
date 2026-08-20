import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createCategorySchema } from "@/lib/validation";
import { createUnitLabel, listUnitLabels } from "@/lib/categories";

export async function GET() {
  try {
    const { organizationId } = await requireTenant();
    const categories = await listUnitLabels(organizationId);
    return NextResponse.json({ categories });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createCategorySchema.parse(await req.json());
    const category = await createUnitLabel(organizationId, body.name);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
