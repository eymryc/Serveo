import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createInventorySession, listInventorySessions } from "@/lib/inventory";
import { createInventorySessionSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 30);
    const sessions = await listInventorySessions(organizationId, Math.min(Math.max(limit, 1), 100));
    return NextResponse.json({ sessions });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createInventorySessionSchema.parse(await req.json().catch(() => ({})));
    const result = await createInventorySession({
      organizationId,
      userId,
      note: body.note,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
