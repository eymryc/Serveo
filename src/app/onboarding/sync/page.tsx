"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api-client";

/**
 * Synchronise le bar Clerk vers Neon puis entre dans l'app.
 * Attend que orgId soit present (et l'active si besoin) pour eviter la
 * boucle /onboarding/sync → /onboarding quand le JWT n'est pas encore a jour.
 */
export default function OnboardingSyncPage() {
  const router = useRouter();
  const { isLoaded, userId, orgId } = useAuth();
  const { isLoaded: listLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [message, setMessage] = useState("Preparation de votre bar…");
  const [error, setError] = useState<string | null>(null);
  const ranSync = useRef(false);
  const activatingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !listLoaded) return;

    if (!userId) {
      router.replace("/sign-in");
      return;
    }

    if (!orgId) {
      const memberships = userMemberships.data ?? [];
      if (memberships.length === 0) {
        router.replace("/onboarding");
        return;
      }
      if (!setActive || activatingRef.current) return;
      activatingRef.current = true;
      setMessage("Activation de votre bar…");
      void setActive({ organization: memberships[0].organization.id }).finally(() => {
        activatingRef.current = false;
      });
      return;
    }

    if (ranSync.current) return;
    ranSync.current = true;

    setMessage("Synchronisation…");

    async function syncWithRetry() {
      let lastError: unknown;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await apiFetch("/api/v1/organization", { method: "POST" });
          setMessage("Redirection…");
          router.replace("/app");
          router.refresh();
          return;
        } catch (err) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
      ranSync.current = false;
      setError(lastError instanceof Error ? lastError.message : "Erreur de synchronisation");
    }

    void syncWithRetry();
  }, [isLoaded, listLoaded, userId, orgId, userMemberships.data, setActive, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm border border-border bg-card p-6 text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <button
              type="button"
              className="mt-4 text-sm font-medium text-primary underline underline-offset-4"
              onClick={() => {
                setError(null);
                ranSync.current = false;
                router.replace("/onboarding");
              }}
            >
              Revenir a l&apos;onboarding
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">{message}</p>
            <p className="mt-2 text-xs text-muted-foreground">Un instant…</p>
          </>
        )}
      </div>
    </div>
  );
}
