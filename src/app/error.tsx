"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        L&apos;equipe Serveo a ete prevenue. Vos donnees deja enregistrees ne sont pas perdues.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Reference : {error.digest}</p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>Reessayer</Button>
        <Button variant="outline" asChild>
          <Link href="/app">Retour a l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
