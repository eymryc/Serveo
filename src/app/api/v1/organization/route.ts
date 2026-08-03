import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, subscriptions } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { ensureOrganizationSynced } from "@/lib/organization";
import { updateOrganizationSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { organizationId } = await requireTenant();
    const db = getDb();

    const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));

    if (!org) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));

    return NextResponse.json({ organization: org, subscription: subscription ?? null });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Appelee une seule fois par le flux d'onboarding, juste apres la creation
// de l'organisation Clerk (le "bar"), pour creer la ligne correspondante
// cote base de donnees. Idempotent (ON CONFLICT DO NOTHING).
export async function POST() {
  try {
    const { organizationId } = await requireTenant();
    const organization = await ensureOrganizationSynced(organizationId);
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
