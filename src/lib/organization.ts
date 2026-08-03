import "server-only";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { expenseCategories, organizations, productCategories } from "@/db/schema";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES } from "@/lib/categories";

// Cree la ligne organizations correspondante si elle n'existe pas encore,
// avec des categories de depart (modifiables ensuite dans Parametres) pour
// eviter un ecran vide au premier lancement. Idempotent — peut etre
// appelee a chaque connexion sans risque.
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

  if (!org) {
    const [afterConflict] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return afterConflict;
  }

  await db.insert(productCategories).values(
    DEFAULT_PRODUCT_CATEGORIES.map((name) => ({ organizationId, name }))
  );
  await db.insert(expenseCategories).values(
    DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ organizationId, name }))
  );

  return org;
}
