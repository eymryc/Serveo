import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireUser, tenantErrorResponse } from "@/lib/tenant";
import { listUserOrganizations, switchActiveOrganization } from "@/lib/memberships";
import { switchOrganizationSchema } from "@/lib/validation";

// Bars accessibles au compte courant, avec le bar actif.
export async function GET() {
  try {
    const { userId } = await requireUser();
    const { orgId } = await auth();
    const organizations = await listUserOrganizations(userId);
    return NextResponse.json({
      activeOrganizationId: orgId,
      organizations: organizations.map((o) => ({
        id: o.organizationId,
        name: o.name,
        role: o.role,
        isActive: o.isActive === 1,
      })),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Change le bar actif (web et mobile : le bar actif est porte par le compte).
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const { organizationId } = switchOrganizationSchema.parse(await req.json());
    const active = await switchActiveOrganization(userId, organizationId);
    return NextResponse.json({ activeOrganizationId: active.organizationId, role: active.role });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
