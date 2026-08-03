import "server-only";
import { auth } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/http-errors";
import { ensureOrganizationSynced } from "@/lib/organization";

export { errorResponse as tenantErrorResponse } from "@/lib/http-errors";

// A appeler au debut de chaque route API : garantit qu'un utilisateur
// authentifie ET rattache a une organisation (bar) fait la requete,
// et renvoie l'org_id a utiliser pour scoper toutes les requetes DB.
//
// ensureOrganizationSynced est appelee ici (pas seulement depuis
// /onboarding/sync) car Clerk expose PLUSIEURS chemins pour creer une
// organisation — notamment le bouton "Creer une organisation" integre
// au OrganizationSwitcher — qui ne passent pas par notre page
// d'onboarding. Sans ce filet, un bar cree par ce chemin n'a jamais de
// ligne correspondante en base et toute requete (categories, produits,
// ventes...) echoue en "Organisation introuvable" ou en violation de
// contrainte de cle etrangere. L'appel est idempotent (SELECT puis INSERT
// seulement si absent), donc sans risque de doublon.
export async function requireTenant() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new HttpError(401, "Authentification requise");
  }
  if (!orgId) {
    throw new HttpError(403, "Aucune organisation active — rejoignez ou creez un bar");
  }

  await ensureOrganizationSynced(orgId);

  return { userId, organizationId: orgId, orgRole };
}

export function requireAdmin(orgRole: string | null | undefined) {
  if (orgRole !== "org:admin") {
    throw new HttpError(403, "Reserve au gerant");
  }
}
