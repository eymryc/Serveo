"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OnboardingClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/v1/organization", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de création du bar");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="bar-name" className="text-[13px] font-semibold tracking-wide">
          Nom du bar
        </Label>
        <Input
          id="bar-name"
          required
          placeholder="Le Comptoir"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11"
        />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Visible par votre équipe. Vous pourrez le modifier plus tard.
        </p>
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
        {loading ? "Création…" : "Créer mon bar"}
      </Button>
    </form>
  );
}
