// Stub pour les tests : le vrai package "server-only" leve une erreur des
// qu'il est importe hors du pipeline Next.js (qui l'alias normalement en
// no-op cote serveur). Vitest tourne en Node pur, donc on le neutralise ici.
export {};
