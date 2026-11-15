import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingClient } from "@/components/onboarding-client";
import { ImpersonationBanner } from "@/components/impersonation-banner";

// Creation d'un bar : le premier apres inscription, ou un bar
// supplementaire (?nouveau=1, depuis le selecteur de bar). Sans ce
// parametre, un compte qui a deja un bar actif est renvoye vers l'app.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { userId, orgId, isPlatformAdmin } = await auth();
  const addingAnother = (await searchParams).nouveau === "1";

  if (!userId) {
    redirect("/sign-in");
  }
  if (orgId && !addingAnother) {
    redirect("/app");
  }
  if (isPlatformAdmin && !orgId) {
    redirect("/admin");
  }

  return (
    <>
      <ImpersonationBanner />
      <AuthShell
        title={addingAnother ? "Ajoutez un bar" : "Creez votre bar"}
        description="Chaque bar est un espace independant : ventes, stock et charges y sont isoles"
      >
        <OnboardingClient />
      </AuthShell>
    </>
  );
}
