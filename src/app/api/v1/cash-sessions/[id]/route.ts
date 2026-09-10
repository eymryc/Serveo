import { NextResponse } from "next/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { getCashSessionSummary } from "@/lib/cash-sessions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireTenant();
    const { id } = await params;
    const summary = await getCashSessionSummary(organizationId, id);
    return NextResponse.json(summary);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
