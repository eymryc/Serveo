import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export class TenantError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// A appeler au debut de chaque route API : garantit qu'un utilisateur
// authentifie ET rattache a une organisation (bar) fait la requete,
// et renvoie l'org_id a utiliser pour scoper toutes les requetes DB.
export async function requireTenant() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new TenantError(401, "Authentification requise");
  }
  if (!orgId) {
    throw new TenantError(403, "Aucune organisation active — rejoignez ou creez un bar");
  }

  return { userId, organizationId: orgId, orgRole };
}

export function tenantErrorResponse(error: unknown) {
  if (error instanceof TenantError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
}
