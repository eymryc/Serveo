import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { requireTenant, requireUser, tenantErrorResponse } from "@/lib/tenant";
import { createOrganizationForUser } from "@/lib/organization";
import { createOrganizationSchema, updateOrganizationSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { organizationId } = await requireTenant();
    const db = getDb();

    const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));

    if (!org) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Appelee par le flux d'onboarding pour creer le bar du compte courant
// (un compte n'a pas encore d'organisation active a ce stade, donc on
// n'utilise que requireUser() ici, pas requireTenant()).
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = createOrganizationSchema.parse(await req.json());
    const organization = await createOrganizationForUser(userId, body.name);
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    if (orgRole !== "org:admin") {
      return NextResponse.json(
        { error: "Seul le gerant peut modifier les parametres" },
        { status: 403 }
      );
    }

    const body = updateOrganizationSchema.parse(await req.json());
    const db = getDb();

    const [updated] = await db
      .update(organizations)
      .set({
        ...body,
        monthlyRevenueTarget: body.monthlyRevenueTarget?.toString(),
        monthlyMarginTargetPct: body.monthlyMarginTargetPct?.toString(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    return NextResponse.json({ organization: updated });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
