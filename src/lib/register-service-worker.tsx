"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Jamais en dev : le SW met en cache le HTML/JS servi par Turbopack,
    // dont les hash de chunk changent a chaque recompilation. Un cache
    // perime pointant vers un chunk qui n'existe plus provoque des
    // ChunkLoadError en boucle (rechargement infini).
    if (process.env.NODE_ENV !== "production") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pas grave si ca echoue (navigateur non compatible, etc.) — l'app
        // reste utilisable en ligne, seul le mode hors-ligne est degrade.
      });
    }
  }, []);

  return null;
}
