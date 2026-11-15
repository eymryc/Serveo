import Link from "next/link";
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
        active="onboarding"
        title={addingAnother ? "Ajoutez un bar" : "Créez votre bar"}
        description={
          addingAnother
            ? "Nouveau commerce, même compte. Stock, caisse et équipe seront séparés."
            : "Donnez un nom à votre commerce pour démarrer ventes, stock et caisse."
        }
        footer={
          addingAnother ? (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/app"
                className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Retour au tableau de bord
              </Link>
            </p>
          ) : null
        }
      >
        <OnboardingClient />
      </AuthShell>
    </>
  );
}
