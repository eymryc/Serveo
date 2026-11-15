import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, users } from "@/db/schema";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { addMembership } from "@/lib/memberships";
import { recordAudit } from "@/lib/audit";
import { createTeamMemberSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);

    const db = getDb();
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: memberships.role,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organizationId, organizationId))
      .orderBy(memberships.createdAt);

    return NextResponse.json({ members });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Le gerant cree directement le compte du barman (telephone + mot de passe
// temporaire + role) — pas de flux d'invitation par email. Un numero deja
// inscrit est refuse : rattacher le compte de quelqu'un d'autre a son bar
// sans son accord n'est pas souhaitable.
export async function POST(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = createTeamMemberSchema.parse(await req.json());
    const phone = body.phone.trim();

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) {
      throw new HttpError(409, "Un compte existe deja avec ce numero de telephone");
    }

    const passwordHash = await hashPassword(body.password);
    const member = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ firstName: body.firstName, lastName: body.lastName, phone, passwordHash })
        .returning();
      await addMembership(tx, { userId: created.id, organizationId, role: body.role, makeActive: true });
      return {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        phone: created.phone,
        role: body.role,
        createdAt: created.createdAt,
      };
    });

    await recordAudit({
      organizationId,
      action: "team.create",
      targetType: "user",
      targetId: member.id,
      metadata: { role: member.role },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
