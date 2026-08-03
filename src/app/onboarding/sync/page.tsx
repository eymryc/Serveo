import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationSynced } from "@/lib/organization";

// Etape intermediaire silencieuse : synchronise l'organisation Clerk
// fraichement creee vers la table organizations, puis redirige vers l'app.
export default async function OnboardingSyncPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  await ensureOrganizationSynced(orgId);
  redirect("/app");
}
