"use client";

import { useEffect } from "react";
import { AuthStatusShell } from "@/components/auth-status-shell";
import { reportClientError } from "@/lib/report-client-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <AuthStatusShell
      eyebrow={error.digest ? `Réf. ${error.digest}` : "Erreur"}
      title="Une erreur est survenue"
      description="L’équipe Serveo a été prévenue. Vos données déjà enregistrées ne sont pas perdues."
      primary={{ label: "Réessayer", onClick: reset }}
      secondary={{ href: "/", label: "Accueil" }}
    />
  );
}
