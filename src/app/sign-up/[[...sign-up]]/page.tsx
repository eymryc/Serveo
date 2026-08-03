import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell title="Creez votre compte" description="Quelques secondes avant de gerer votre bar">
      <SignUp />
    </AuthShell>
  );
}
