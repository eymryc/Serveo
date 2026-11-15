"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { PhoneInput } from "@/components/phone-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      setError("Compte créé, mais la connexion automatique a échoué — réessayez de vous connecter.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-[13px] font-semibold tracking-wide">
            Prénom
          </Label>
          <Input
            id="firstName"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-[13px] font-semibold tracking-wide">
            Nom
          </Label>
          <Input
            id="lastName"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-phone" className="text-[13px] font-semibold tracking-wide">
          Numéro de téléphone
        </Label>
        <PhoneInput
          id="signup-phone"
          autoComplete="tel"
          required
          value={phone}
          onChange={setPhone}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-[13px] font-semibold tracking-wide">
          Mot de passe
        </Label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="signup-confirm-password"
          className="text-[13px] font-semibold tracking-wide"
        >
          Confirmer le mot de passe
        </Label>
        <PasswordInput
          id="signup-confirm-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
