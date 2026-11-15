"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

export default function GlobalError({
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
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 20 }}>Une erreur est survenue</h1>
        <p style={{ color: "#666" }}>L&apos;equipe Serveo a ete prevenue.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px" }}>
          Reessayer
        </button>
      </body>
    </html>
  );
}
