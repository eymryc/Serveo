"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pas grave si ca echoue (navigateur non compatible, etc.) — l'app
        // reste utilisable en ligne, seul le mode hors-ligne est degrade.
      });
    }
  }, []);

  return null;
}
