"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { PhoneInput } from "@/components/phone-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/logo-mark";

export function CustomSignUpForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, phone, password }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { phone, password, redirect: false });
    if (result?.error) {
      setError("Compte cree, mais la connexion automatique a echoue — reessayez de vous connecter.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prenom</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-phone">Numero de telephone</Label>
            <PhoneInput
              id="signup-phone"
              autoComplete="tel"
              required
              value={phone}
              onChange={setPhone}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Mot de passe</Label>
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-confirm-password">Confirmer le mot de passe</Label>
            <PasswordInput
              id="signup-confirm-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creation..." : "Creer mon compte"}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Deja un compte ?{" "}
        <Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
