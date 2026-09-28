import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import {
  getInventorySession,
  updateInventoryCounts,
  updateInventorySessionMeta,
} from "@/lib/inventory";
import { updateInventorySessionSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const result = await getInventorySession(organizationId, id);
    return NextResponse.json(result);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    const body = updateInventorySessionSchema.parse(await req.json());

    let session = undefined;
    if (body.inventoryDate !== undefined) {
      session = await updateInventorySessionMeta(organizationId, id, {
        inventoryDate: body.inventoryDate,
      });
    }

    let lines = undefined;
    if (body.lines) {
      lines = await updateInventoryCounts(organizationId, id, body.lines);
    }

    return NextResponse.json({
      ...(session ? { session } : {}),
      ...(lines ? { lines } : {}),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
