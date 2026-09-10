import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import {
  getCustomer,
  getCustomerBalance,
  listCustomerLedger,
  updateCustomer,
} from "@/lib/customers";
import { updateCustomerSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireTenant();
    const { id } = await params;
    const customer = await getCustomer(organizationId, id);
    const balance = await getCustomerBalance(organizationId, id);
    const ledger = await listCustomerLedger(organizationId, id, 30);
    return NextResponse.json({ customer, balance, ledger });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireTenant();
    const { id } = await params;
    const body = updateCustomerSchema.parse(await req.json());
    const customer = await updateCustomer(organizationId, id, body);
    return NextResponse.json({ customer });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
