import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Role = "admin" | "member";

// Seul module autorise a ecrire users.organizationId / users.role (bar actif
// et role dans ce bar) : ils doivent toujours correspondre a une ligne de
// memberships, sinon un compte retire d'un bar y garderait l'acces.
//
// Choix assume : le bar actif est porte par le compte, pas par la session.
// Changer de bar sur le web change aussi le bar vu par l'app mobile du meme
// compte — sans risque (le compte a acces aux deux), et ca evite de
// re-signer les tokens Bearer mobiles.

export async function listUserOrganizations(userId: string) {
  const db = getDb();
  return db
    .select({
      organizationId: memberships.organizationId,
      name: organizations.name,
      role: memberships.role,
      isActive: organizations.isActive,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(organizations.name));
}

export async function addMembership(
  tx: Tx | Db,
  input: { userId: string; organizationId: string; role: Role; makeActive?: boolean }
) {
  await tx
    .insert(memberships)
    .values({ userId: input.userId, organizationId: input.organizationId, role: input.role })
    .onConflictDoUpdate({
      target: [memberships.userId, memberships.organizationId],
      set: { role: input.role },
    });

  if (input.makeActive) {
    await tx
      .update(users)
      .set({ organizationId: input.organizationId, role: input.role })
      .where(eq(users.id, input.userId));
  } else {
    // Le role en cache doit suivre si ce bar est deja le bar actif.
    await tx
      .update(users)
      .set({ role: input.role })
      .where(and(eq(users.id, input.userId), eq(users.organizationId, input.organizationId)));
  }
}

export async function switchActiveOrganization(userId: string, organizationId: string) {
  const db = getDb();
  const [membership] = await db
    .select({ role: memberships.role, orgActive: organizations.isActive })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
    .limit(1);

  if (!membership) throw new HttpError(404, "Vous n'avez pas acces a ce bar");
  if (membership.orgActive !== 1) throw new HttpError(403, "Ce bar est desactive");

  await db.update(users).set({ organizationId, role: membership.role }).where(eq(users.id, userId));
  return { organizationId, role: membership.role };
}

export async function setMembershipRole(userId: string, organizationId: string, role: Role) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
      .returning();
    if (!updated) return null;

    await tx
      .update(users)
      .set({ role })
      .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));
    return updated;
  });
}

// Retire l'acces d'un compte a un bar. Si c'etait son bar actif, bascule sur
// un autre de ses bars (ou plus aucun). Renvoie le nombre de bars restants.
export async function removeMembership(userId: string, organizationId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
      .returning();
    if (!deleted) return null;

    const remaining = await tx
      .select({ organizationId: memberships.organizationId, role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.userId, userId), ne(memberships.organizationId, organizationId)))
      .orderBy(asc(memberships.createdAt));

    const [user] = await tx
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId));
    if (user?.organizationId === organizationId) {
      const next = remaining[0];
      await tx
        .update(users)
        .set(next ? { organizationId: next.organizationId, role: next.role } : { organizationId: null, role: "member" })
        .where(eq(users.id, userId));
    }

    return { remaining: remaining.length };
  });
}
