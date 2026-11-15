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
      setError(
        result.code === "rate_limited"
          ? "Trop de tentatives. Réessayez dans quelques minutes."
          : "Numéro de téléphone ou mot de passe incorrect"
      );
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-[13px] font-semibold tracking-wide">
          Numéro de téléphone
        </Label>
        <PhoneInput
          id="phone"
          autoComplete="tel"
          required
          value={phone}
          onChange={setPhone}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className="text-[13px] font-semibold tracking-wide">
            Mot de passe
          </Label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-[12px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="auth-submit h-12 w-full text-[15px] tracking-wide"
        disabled={loading}
      >
        {loading ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
