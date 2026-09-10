import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createCustomerPayment } from "@/lib/customers";
import { createCustomerPaymentSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, userId } = await requireTenant();
    const { id } = await params;
    const body = createCustomerPaymentSchema.parse(await req.json());

    const payment = await createCustomerPayment({
      organizationId,
      userId,
      customerId: id,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      note: body.note,
      paidAt: body.paidAt,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
