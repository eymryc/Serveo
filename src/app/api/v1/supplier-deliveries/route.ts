import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createSupplierDelivery, listSupplierDeliveries } from "@/lib/suppliers";
import { createSupplierDeliverySchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
    const deliveries = await listSupplierDeliveries(
      organizationId,
      Math.min(Math.max(limit, 1), 100)
    );
    return NextResponse.json({ deliveries });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createSupplierDeliverySchema.parse(await req.json());
    const result = await createSupplierDelivery({
      organizationId,
      userId,
      supplierId: body.supplierId,
      lines: body.lines,
      paidAmount: body.paidAmount,
      paymentMethod: body.paymentMethod,
      note: body.note,
      deliveryDate: body.deliveryDate,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
