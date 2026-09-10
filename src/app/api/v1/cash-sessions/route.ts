import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { listCashSessions, openCashSession } from "@/lib/cash-sessions";
import { openCashSessionSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 30);
    const sessions = await listCashSessions(organizationId, Math.min(Math.max(limit, 1), 100));
    return NextResponse.json({ sessions });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireTenant();
    const body = openCashSessionSchema.parse(await req.json().catch(() => ({})));
    const session = await openCashSession({
      organizationId,
      userId,
      openingFloat: body.openingFloat,
      openedAt: body.openedAt,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
