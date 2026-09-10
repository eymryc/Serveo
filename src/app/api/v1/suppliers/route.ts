import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createSupplier, listSuppliers } from "@/lib/suppliers";
import { createSupplierSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
    const rows = await listSuppliers(organizationId, includeInactive);
    return NextResponse.json({ suppliers: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createSupplierSchema.parse(await req.json());
    const supplier = await createSupplier({ organizationId, ...body });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
