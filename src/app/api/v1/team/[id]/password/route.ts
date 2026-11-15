import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, users } from "@/db/schema";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { HttpError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/password";
import { recordAudit } from "@/lib/audit";
import { resetTeamMemberPasswordSchema } from "@/lib/validation";

// Le gerant redefinit le mot de passe d'un membre qui l'a oublie (pas encore
// de reinitialisation autonome par SMS). Limite aux comptes rattaches a CE
// SEUL bar : sinon un gerant pourrait prendre la main sur un compte qui
// donne aussi acces a un autre bar.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const { id } = await params;
    if (id === userId) {
      throw new HttpError(400, "Changez votre propre mot de passe depuis votre profil");
    }
    const body = resetTeamMemberPasswordSchema.parse(await req.json());

    const db = getDb();
    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, id), eq(memberships.organizationId, organizationId)));
    if (!membership) throw new HttpError(404, "Membre introuvable");

    const all = await db.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, id));
    const [target] = await db.select({ isPlatformAdmin: users.isPlatformAdmin }).from(users).where(eq(users.id, id));
    if (all.length > 1 || target?.isPlatformAdmin === 1) {
      throw new HttpError(403, "Ce compte est aussi rattache a un autre bar : son titulaire doit changer son mot de passe lui-meme");
    }

    await db.update(users).set({ passwordHash: await hashPassword(body.password) }).where(eq(users.id, id));

    await recordAudit({ organizationId, action: "team.password_reset", targetType: "user", targetId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
