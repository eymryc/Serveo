import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { createOrganizationForUser } from "@/lib/organization";
import {
  addMembership,
  listUserOrganizations,
  removeMembership,
  setMembershipRole,
  switchActiveOrganization,
} from "@/lib/memberships";

const createdOrgs: string[] = [];
const createdUsers: string[] = [];

async function createUser() {
  const [user] = await getDb()
    .insert(users)
    .values({
      phone: `+225${Math.floor(Math.random() * 1e10)}`,
      passwordHash: "x",
      firstName: "Test",
      lastName: "Vitest",
    })
    .returning();
  createdUsers.push(user.id);
  return user;
}

async function createBar(userId: string, name: string) {
  const org = await createOrganizationForUser(userId, name);
  createdOrgs.push(org.id);
  return org;
}

async function activeOf(userId: string) {
  const [u] = await getDb().select().from(users).where(eq(users.id, userId));
  return { organizationId: u.organizationId, role: u.role };
}

afterEach(async () => {
  const db = getDb();
  if (createdUsers.length) await db.delete(users).where(inArray(users.id, createdUsers.splice(0)));
  if (createdOrgs.length) await db.delete(organizations).where(inArray(organizations.id, createdOrgs.splice(0)));
});

describe("multi-bars", () => {
  it("un patron cree plusieurs bars, le dernier cree devient actif, il peut basculer", async () => {
    const owner = await createUser();
    const barA = await createBar(owner.id, "Maquis A");
    const barB = await createBar(owner.id, "Maquis B");

    expect(await activeOf(owner.id)).toEqual({ organizationId: barB.id, role: "admin" });
    expect((await listUserOrganizations(owner.id)).map((o) => o.name)).toEqual(["Maquis A", "Maquis B"]);

    await switchActiveOrganization(owner.id, barA.id);
    expect((await activeOf(owner.id)).organizationId).toBe(barA.id);
  });

  it("refuse de basculer vers un bar dont on n'est pas membre", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const bar = await createBar(owner.id, "Maquis prive");

    await expect(switchActiveOrganization(stranger.id, bar.id)).rejects.toMatchObject({ status: 404 });
    expect((await activeOf(stranger.id)).organizationId).toBeNull();
  });

  it("le role est propre a chaque bar : gerant ici, barman la-bas", async () => {
    const owner = await createUser();
    const barA = await createBar(owner.id, "A");
    const otherOwner = await createUser();
    const barB = await createBar(otherOwner.id, "B");

    await addMembership(getDb(), { userId: owner.id, organizationId: barB.id, role: "member" });
    await switchActiveOrganization(owner.id, barB.id);
    expect(await activeOf(owner.id)).toEqual({ organizationId: barB.id, role: "member" });

    await switchActiveOrganization(owner.id, barA.id);
    expect(await activeOf(owner.id)).toEqual({ organizationId: barA.id, role: "admin" });
  });

  it("changer le role met a jour le role actif seulement si c'est le bar actif", async () => {
    const owner = await createUser();
    const bar = await createBar(owner.id, "Bar");
    const barman = await createUser();
    await addMembership(getDb(), { userId: barman.id, organizationId: bar.id, role: "member", makeActive: true });

    await setMembershipRole(barman.id, bar.id, "admin");
    expect(await activeOf(barman.id)).toEqual({ organizationId: bar.id, role: "admin" });
  });

  it("retirer un membre de son bar actif le bascule sur son autre bar, puis sur aucun", async () => {
    const ownerA = await createUser();
    const barA = await createBar(ownerA.id, "A");
    const ownerB = await createUser();
    const barB = await createBar(ownerB.id, "B");
    const barman = await createUser();
    await addMembership(getDb(), { userId: barman.id, organizationId: barA.id, role: "member" });
    await addMembership(getDb(), { userId: barman.id, organizationId: barB.id, role: "member", makeActive: true });

    expect(await removeMembership(barman.id, barB.id)).toEqual({ remaining: 1 });
    expect((await activeOf(barman.id)).organizationId).toBe(barA.id);

    expect(await removeMembership(barman.id, barA.id)).toEqual({ remaining: 0 });
    expect((await activeOf(barman.id)).organizationId).toBeNull();
    const rows = await getDb().select().from(memberships).where(eq(memberships.userId, barman.id));
    expect(rows).toHaveLength(0);
  });

  it("retirer un membre d'un bar qui n'est pas son bar actif ne change pas son bar actif", async () => {
    const ownerA = await createUser();
    const barA = await createBar(ownerA.id, "A");
    const ownerB = await createUser();
    const barB = await createBar(ownerB.id, "B");
    const barman = await createUser();
    await addMembership(getDb(), { userId: barman.id, organizationId: barA.id, role: "member", makeActive: true });
    await addMembership(getDb(), { userId: barman.id, organizationId: barB.id, role: "member" });

    await removeMembership(barman.id, barB.id);
    expect((await activeOf(barman.id)).organizationId).toBe(barA.id);
  });
});
