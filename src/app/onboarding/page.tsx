import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingClient } from "@/components/onboarding-client";
import { ImpersonationBanner } from "@/components/impersonation-banner";

// Point d'entree pour la creation du PREMIER bar apres inscription.
// Si une org est deja active, on envoie vers l'app. Sinon le client
// reactive une membership existante ou affiche CreateOrganization.
export default async function OnboardingPage() {
  const { userId, orgId, isPlatformAdmin } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  if (orgId) {
    redirect("/app");
  }
  if (isPlatformAdmin) {
    redirect("/admin");
  }

  return (
    <>
      <ImpersonationBanner />
      <AuthShell
        title="Creez votre bar"
        description="Chaque bar est un espace independant : ventes, stock et charges y sont isoles"
      >
        <OnboardingClient />
      </AuthShell>
    </>
  );
}
