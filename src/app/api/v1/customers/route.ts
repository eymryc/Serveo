import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createCustomer, listCustomers } from "@/lib/customers";
import { createCustomerSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    const includeInactive =
      req.nextUrl.searchParams.get("includeInactive") === "1" && orgRole === "org:admin";
    const rows = await listCustomers(organizationId, includeInactive);
    return NextResponse.json({ customers: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const body = createCustomerSchema.parse(await req.json());
    const customer = await createCustomer({ organizationId, ...body });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
