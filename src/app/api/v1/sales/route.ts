import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createSaleSchema } from "@/lib/validation";
import { createSale, listSales } from "@/lib/sales";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

    const rows = await listSales(organizationId, from, to);
    return NextResponse.json({ sales: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireTenant();
    const body = createSaleSchema.parse(await req.json());

    const sale = await createSale({ organizationId, userId, ...body });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
