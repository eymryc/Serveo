import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

// Point d'entree pour la creation du PREMIER bar apres inscription. Un
// utilisateur deja rattache a une organisation qui atterrit ici (lien
// direct, retour arriere...) est renvoye vers l'app plutot que de risquer
// de creer un second bar par accident — pour un bar supplementaire,
// passer par le bouton "Creer une organisation" du selecteur d'organisation.
export default async function OnboardingPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  if (orgId) {
    redirect("/app");
  }

  return (
    <AuthShell
      title="Creez votre bar"
      description="Chaque bar est un espace independant : ventes, stock et charges y sont isoles"
    >
      <CreateOrganization afterCreateOrganizationUrl="/onboarding/sync" skipInvitationScreen />
    </AuthShell>
  );
}
