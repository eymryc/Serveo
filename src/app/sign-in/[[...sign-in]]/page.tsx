import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { CustomSignInForm } from "@/components/custom-sign-in-form";

export default async function Page() {
  const { userId, orgId, isPlatformAdmin } = await auth();

  if (userId && orgId) redirect("/app");
  if (userId && isPlatformAdmin) redirect("/admin");
  if (userId && !orgId) redirect("/onboarding");

  return (
    <AuthShell title="Content de vous revoir" description="Connectez-vous a votre bar" active="sign-in">
      <CustomSignInForm />
    </AuthShell>
  );
}
