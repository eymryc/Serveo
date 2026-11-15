import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { CustomSignUpForm } from "@/components/custom-sign-up-form";

export default async function Page() {
  const { userId, orgId, isPlatformAdmin } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && isPlatformAdmin) redirect("/admin");
  if (userId && !orgId) redirect("/onboarding");

  return (
    <AuthShell
      title="Créez votre compte"
      description="Le compte gérant d’abord. Votre bar se configure juste après."
      active="sign-up"
    >
      <CustomSignUpForm />
    </AuthShell>
  );
}
