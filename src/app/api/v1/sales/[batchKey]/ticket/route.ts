import { NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { getSaleTicket } from "@/lib/sales";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchKey: string }> }
) {
  try {
    const { organizationId } = await requireTenant();
    const { batchKey } = await params;
    const ticket = await getSaleTicket(organizationId, batchKey);
    return NextResponse.json({ ticket });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
