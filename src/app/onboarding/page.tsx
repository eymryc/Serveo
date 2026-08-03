import { CreateOrganization } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function OnboardingPage() {
  return (
    <AuthShell
      title="Creez votre bar"
      description="Chaque bar est un espace independant : ventes, stock et charges y sont isoles"
    >
      <CreateOrganization afterCreateOrganizationUrl="/onboarding/sync" skipInvitationScreen />
    </AuthShell>
  );
}
