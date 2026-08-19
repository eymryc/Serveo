import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { CustomSignUpForm } from "@/components/custom-sign-up-form";

export default async function Page() {
  const { userId, orgId } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && !orgId) redirect("/onboarding");

  return (
    <AuthShell title="Creez votre compte" description="Quelques secondes avant de gerer votre bar" active="sign-up">
      <CustomSignUpForm />
    </AuthShell>
  );
}
