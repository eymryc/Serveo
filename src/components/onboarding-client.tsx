"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateOrganization, useAuth, useOrganizationList } from "@clerk/nextjs";

/**
 * Apres CreateOrganization, Clerk navigue vers /onboarding/sync avant que
 * le JWT session ait forcement l'org active → auth().orgId est null cote
 * serveur → redirect boucle vers /onboarding.
 *
 * Ici on:
 * 1. Reactive une membership existante s'il n'y a pas d'org active
 * 2. Affiche CreateOrganization seulement si l'utilisateur n'a aucun bar
 */
export function OnboardingClient() {
  const router = useRouter();
  const { isLoaded, orgId } = useAuth();
  const { isLoaded: listLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [status, setStatus] = useState<"loading" | "create" | "activating">("loading");
  const activatingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !listLoaded || !setActive) return;

    if (orgId) {
      router.replace("/onboarding/sync");
      return;
    }

    const memberships = userMemberships.data ?? [];
    if (memberships.length > 0) {
      if (activatingRef.current) return;
      activatingRef.current = true;
      setStatus("activating");
      const organizationId = memberships[0].organization.id;
      void setActive({ organization: organizationId })
        .then(() => {
          router.replace("/onboarding/sync");
        })
        .catch(() => {
          activatingRef.current = false;
          setStatus("create");
        });
      return;
    }

    setStatus("create");
  }, [isLoaded, listLoaded, orgId, userMemberships.data, setActive, router]);

  if (status === "loading" || status === "activating") {
    return (
      <div className="border border-border bg-card p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          {status === "activating" ? "Activation de votre bar…" : "Chargement…"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Redirection en cours</p>
      </div>
    );
  }

  return (
    <CreateOrganization afterCreateOrganizationUrl="/onboarding/sync" skipInvitationScreen />
  );
}
