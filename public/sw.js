// Service worker minimal et volontairement simple : le but n'est pas un
// offline-first complet (CRDT/sync generalisee) mais de couvrir le
// scenario le plus critique sur le terrain — pouvoir ouvrir la page
// Ventes et voir la liste des articles/prix meme quand le reseau vient de
// tomber en plein coup de feu. La creation de vente hors-ligne elle-meme
// est geree par l'app (file d'attente localStorage), pas ici.

const SHELL_CACHE = "serveo-shell-v3";
const DATA_CACHE = "serveo-data-v3";
const ASSET_CACHE = "serveo-assets-v3";

const SHELL_URLS = ["/app/ventes", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, DATA_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Assets Next (JS/CSS hashés) : cache-first pour que le shell offline charge.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Navigation (chargement de page) : reseau en priorite, cache en secours.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/app/ventes")))
    );
    return;
  }

  // Liste des articles : derniere reponse connue pour la saisie hors-ligne.
  if (url.pathname === "/api/v1/products") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
