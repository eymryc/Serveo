import "server-only";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";

// Cree la ligne organizations correspondante si elle n'existe pas encore.
// Idempotent — peut etre appelee a chaque connexion sans risque.
export async function ensureOrganizationSynced(organizationId: string) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  if (existing) return existing;

  const client = await clerkClient();
  const clerkOrg = await client.organizations.getOrganization({ organizationId });

  const [org] = await db
    .insert(organizations)
    .values({ id: organizationId, name: clerkOrg.name })
    .onConflictDoNothing()
    .returning();

  if (org) return org;

  const [afterConflict] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  return afterConflict;
}
