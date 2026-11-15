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
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f2f6f4",
          color: "#1a2e24",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#1f6b4f",
            }}
          >
            Serveo
          </p>
          <h1 style={{ margin: "16px 0 0", fontSize: 28, letterSpacing: "-0.02em" }}>
            Une erreur est survenue
          </h1>
          <p style={{ margin: "12px 0 0", color: "#5a6b62", lineHeight: 1.5 }}>
            L&apos;équipe Serveo a été prévenue. Réessayez dans un instant.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 12, fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#7a8a82" }}>
              Référence : {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: "12px 22px",
              border: 0,
              borderRadius: 6,
              background: "#1f6b4f",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
