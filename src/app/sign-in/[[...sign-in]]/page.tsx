import { AuthShell } from "@/components/auth-shell";
import { CustomSignInForm } from "@/components/custom-sign-in-form";

export default function Page() {
  return (
    <AuthShell title="Content de vous revoir" description="Connectez-vous a votre bar">
      <CustomSignInForm />
    </AuthShell>
  );
}
