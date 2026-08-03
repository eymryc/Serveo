import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell title="Content de vous revoir" description="Connectez-vous a votre bar">
      <SignIn />
    </AuthShell>
  );
}
