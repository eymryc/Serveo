import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { closeCashSession } from "@/lib/cash-sessions";
import { closeCashSessionSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, userId } = await requireTenant();
    const { id } = await params;
    const body = closeCashSessionSchema.parse(await req.json());

    const result = await closeCashSession({
      organizationId,
      userId,
      sessionId: id,
      ...body,
    });

    return NextResponse.json(result);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
