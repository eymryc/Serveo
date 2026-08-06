// Service worker minimal et volontairement simple : le but n'est pas un
// offline-first complet (CRDT/sync generalisee) mais de couvrir le
// scenario le plus critique sur le terrain — pouvoir ouvrir la page
// Ventes et voir la liste des articles/prix meme quand le reseau vient de
// tomber en plein coup de feu. La creation de vente hors-ligne elle-meme
// est geree par l'app (file d'attente localStorage), pas ici.

const SHELL_CACHE = "serveo-shell-v2";
const DATA_CACHE = "serveo-data-v2";

const SHELL_URLS = ["/app/ventes", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POST/PATCH restent geres par l'app (file d'attente)

  const url = new URL(request.url);

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

  // Liste des articles : on garde la derniere reponse connue pour que la
  // saisie de vente reste possible hors-ligne (prix/stock potentiellement
  // legerement perimes, la synchro server-side reste la source de verite).
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
    return;
  }
});
