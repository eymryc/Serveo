import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

export { errorResponse as tenantErrorResponse } from "@/lib/http-errors";

// A appeler pour toute route qui ne requiert qu'un compte authentifie, pas
// encore forcement rattache a un bar (ex: creation d'organisation).
export async function requireUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new HttpError(401, "Authentification requise");
  }
  return { userId };
}

// A appeler au debut de chaque route API : garantit qu'un utilisateur
// authentifie ET rattache a une organisation (bar) fait la requete, et
// renvoie l'org_id a utiliser pour scoper toutes les requetes DB.
export async function requireTenant() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new HttpError(401, "Authentification requise");
  }
  if (!orgId) {
    throw new HttpError(403, "Aucune organisation active — rejoignez ou creez un bar");
  }

  const db = getDb();
  const [org] = await db
    .select({ isActive: organizations.isActive })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!org || org.isActive !== 1) {
    throw new HttpError(403, "Ce bar est desactive");
  }

  return { userId, organizationId: orgId, orgRole };
}

export function requireAdmin(orgRole: string | null | undefined) {
  if (orgRole !== "org:admin") {
    throw new HttpError(403, "Reserve au gerant");
  }
}

// Super-admin plateforme (back-office /admin) — orthogonal au role gérant.
export async function requirePlatformAdmin() {
  const { userId, isPlatformAdmin } = await auth();
  if (!userId) {
    throw new HttpError(401, "Authentification requise");
  }
  if (!isPlatformAdmin) {
    throw new HttpError(403, "Reserve a l'administration plateforme");
  }
  return { userId };
}
