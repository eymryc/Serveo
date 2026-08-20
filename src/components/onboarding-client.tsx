"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/logo-mark";

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
      setError(err instanceof Error ? err.message : "Erreur de creation du bar");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full space-y-4 overflow-hidden rounded-md border border-border bg-card p-6 shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />

      <div className="flex justify-center pb-2">
        <LogoMark
          size="xl"
          priority
          className="h-14 w-auto object-contain object-center sm:h-16"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bar-name">Nom du bar</Label>
        <Input
          id="bar-name"
          required
          placeholder="Le Comptoir"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creation..." : "Creer mon bar"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
