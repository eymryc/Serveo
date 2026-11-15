import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { HttpError } from "@/lib/http-errors";
import { removeMembership, setMembershipRole } from "@/lib/memberships";
import { recordAudit } from "@/lib/audit";
import { updateTeamMemberSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;

    if (id === userId) {
      throw new HttpError(400, "Vous ne pouvez pas modifier votre propre role");
    }

    const body = updateTeamMemberSchema.parse(await req.json());
    const updated = await setMembershipRole(id, organizationId, body.role);
    if (!updated) throw new HttpError(404, "Membre introuvable");

    const [user] = await getDb().select().from(users).where(eq(users.id, id));

    await recordAudit({
      organizationId,
      action: "team.role_change",
      targetType: "user",
      targetId: id,
      metadata: { role: body.role },
    });

    return NextResponse.json({
      member: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: updated.role,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Retire le membre de CE bar. Un compte qui n'a plus aucun bar (et n'est pas
// super-admin) est supprime, comme avant l'arrivee du multi-bars ; un compte
// encore rattache a un autre bar garde son acces a celui-ci.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;

    if (id === userId) {
      throw new HttpError(400, "Vous ne pouvez pas vous retirer vous-meme");
    }

    const result = await removeMembership(id, organizationId);
    if (!result) throw new HttpError(404, "Membre introuvable");

    const db = getDb();
    if (result.remaining === 0) {
      const [user] = await db.select({ isPlatformAdmin: users.isPlatformAdmin }).from(users).where(eq(users.id, id));
      if (user && user.isPlatformAdmin !== 1) {
        await db.delete(users).where(eq(users.id, id));
      }
    }

    await recordAudit({
      organizationId,
      action: "team.remove",
      targetType: "user",
      targetId: id,
      metadata: { accountDeleted: result.remaining === 0 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
