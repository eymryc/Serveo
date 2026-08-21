"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { PhoneInput } from "@/components/phone-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/logo-mark";

export function CustomSignInForm() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", { phone, password, redirect: false });

    if (result?.error) {
      setError("Numero de telephone ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const user = session?.user;
    if (user?.organizationId) {
      router.push("/app");
    } else if (user?.isPlatformAdmin) {
      router.push("/admin");
    } else {
      router.push("/onboarding");
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full space-y-4 overflow-hidden rounded-md border border-border bg-card p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />

        <div className="flex justify-center pb-2">
          <LogoMark
            size="xl"
            priority
            className="h-14 w-auto object-contain object-center sm:h-16"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Numero de telephone</Label>
            <PhoneInput
              id="phone"
              autoComplete="tel"
              required
              value={phone}
              onChange={setPhone}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/sign-up" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
          Creer un compte
        </Link>
      </p>
    </div>
  );
}
