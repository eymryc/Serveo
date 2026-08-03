import { CreateOrganization } from "@clerk/nextjs";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Creez votre bar</h1>
        <p className="mt-1 text-neutral-500">
          Chaque bar est un espace independant : ventes, stock et charges y sont isoles.
        </p>
      </div>
      <CreateOrganization afterCreateOrganizationUrl="/onboarding/sync" skipInvitationScreen />
    </div>
  );
}
