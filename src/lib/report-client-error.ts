export function reportClientError(error: Error & { digest?: string }) {
  // Les erreurs serveur (digest present) sont deja enregistrees cote serveur.
  if (error.digest) return;
  try {
    void fetch("/api/v1/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "web",
        message: (error.message || error.name || "Erreur inconnue").slice(0, 2000),
        stack: error.stack?.slice(0, 8000),
        path: window.location.pathname.slice(0, 500),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Le signalement ne doit jamais provoquer une seconde erreur.
  }
}
