import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenseCategories, organizations, packageLabels, productCategories, unitLabels, users } from "@/db/schema";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PACKAGE_LABELS,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_UNIT_LABELS,
} from "@/lib/categories";
import { HttpError } from "@/lib/http-errors";

// Cree le bar (organisation) du compte courant, avec des categories de
// depart (modifiables ensuite dans Parametres) pour eviter un ecran vide au
// premier lancement. Le createur devient gerant (role admin) de ce bar —
// un compte ne peut creer/rejoindre qu'un seul bar (pas de multi-org).
export async function createOrganizationForUser(userId: string, name: string) {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, "Compte introuvable");
  if (user.organizationId) throw new HttpError(409, "Ce compte est deja rattache a un bar");

  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name }).returning();

    await tx.insert(productCategories).values(
      DEFAULT_PRODUCT_CATEGORIES.map((categoryName) => ({ organizationId: org.id, name: categoryName }))
    );
    await tx.insert(expenseCategories).values(
      DEFAULT_EXPENSE_CATEGORIES.map((categoryName) => ({ organizationId: org.id, name: categoryName }))
    );
    await tx.insert(unitLabels).values(
      DEFAULT_UNIT_LABELS.map((name) => ({ organizationId: org.id, name }))
    );
    await tx.insert(packageLabels).values(
      DEFAULT_PACKAGE_LABELS.map((name) => ({ organizationId: org.id, name }))
    );

    await tx.update(users).set({ organizationId: org.id, role: "admin" }).where(eq(users.id, userId));

    return org;
  });
}
