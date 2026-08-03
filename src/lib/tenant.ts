import "server-only";
import { auth } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/http-errors";

export { errorResponse as tenantErrorResponse } from "@/lib/http-errors";

// A appeler au debut de chaque route API : garantit qu'un utilisateur
// authentifie ET rattache a une organisation (bar) fait la requete,
// et renvoie l'org_id a utiliser pour scoper toutes les requetes DB.
export async function requireTenant() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new HttpError(401, "Authentification requise");
  }
  if (!orgId) {
    throw new HttpError(403, "Aucune organisation active — rejoignez ou creez un bar");
  }

  return { userId, organizationId: orgId, orgRole };
}

export function requireAdmin(orgRole: string | null | undefined) {
  if (orgRole !== "org:admin") {
    throw new HttpError(403, "Reserve au gerant");
  }
}
