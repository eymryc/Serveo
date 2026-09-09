# serveo-web-api

API + dashboard web de **Serveo**, une app de gestion de bar/buvette (Côte d'Ivoire — FCFA, Orange Money, MTN MoMo, Wave, Paystack). C'est la **source de vérité backend** : consommée par le dashboard web (gérant) et par l'app mobile `../serveo-mobile` (voir [../CLAUDE.md](../CLAUDE.md) pour la vue d'ensemble workspace).

## Stack

- **Next.js 16** (App Router, React 19.2, Turbopack/Webpack forcé — voir `next.config.ts` et l'historique git "Force webpack for next build to match next dev").
- **Drizzle ORM** + **Neon Postgres** serverless (`src/db/`), migrations dans `src/db/migrations/`.
- **NextAuth v5 (beta)** avec provider Credentials (téléphone + mot de passe, pas d'OAuth) — **Clerk a été entièrement retiré**, ne pas réintroduire de dépendance Clerk sans raison explicite.
- **Zod** pour la validation d'entrée (`src/lib/validation.ts`).
- **Vitest** pour les tests unitaires + un set de tests d'intégration séparé qui tape la vraie base Neon de dev.
- **shadcn/ui** + Radix + Tailwind v4 pour l'UI.
- Déployé sur **Vercel** (projet lié, voir `.vercel/project.json`).

## Architecture : multi-tenant strict

Un tenant = une `organization` (un bar). Un `user` appartient à **exactement une** organisation (`organizationId` nullable jusqu'à onboarding). **Toute route API doit passer par les gardes de `src/lib/tenant.ts`** avant de toucher la DB :

- `requireUser()` — authentifié, pas encore forcément rattaché à un bar (ex. `POST /api/v1/organization`).
- `requireTenant()` — authentifié **et** rattaché à une organisation active ; renvoie `organizationId` à utiliser pour scoper la requête.
- `requireAdmin(orgRole)` — restreint au rôle `org:admin` (le gérant, par opposition à `org:member` le barman).
- `requirePlatformAdmin()` — super-admin plateforme (`/admin`, back-office), orthogonal au rôle gérant/barman.

Ne jamais écrire une requête Drizzle sur une table qui a `organizationId` sans filtrer dessus — c'est la seule barrière d'isolation entre bars.

## Auth : deux mécanismes, une seule fonction `auth()`

- **Web** : NextAuth, session JWT posée en cookie (`src/lib/auth.ts`).
- **Mobile** : pas de cookie possible côté React Native → JWT Bearer autonome signé avec le même `AUTH_SECRET` mais un `aud` distinct (`serveo-mobile`), émis par `POST /api/v1/auth/login` (`src/lib/mobile-token.ts`).
- `auth()` (`src/lib/auth.ts`) essaie d'abord le header `Authorization: Bearer`, retombe sur la session cookie sinon. **Toujours appeler cette fonction plutôt que `nextAuthSession()` directement**, sinon le mobile casse silencieusement.
- Impersonation admin plateforme : gérée dans le callback `jwt()` via `trigger === "update"` avec `impersonateUserId` / `stopImpersonating` — pendant l'impersonation, `isPlatformAdmin` est forcé à `false` côté session (on se comporte comme le compte cible, jamais super-admin pendant l'impersonation).

## Conventions de code observées

- Chaque route API : `try { requireTenant() → parse Zod → logique métier (src/lib/*.ts) → NextResponse.json } catch { return tenantErrorResponse(error) }`. Garder ce pattern pour toute nouvelle route.
- Logique métier extraite dans `src/lib/{sales,products,organization,categories}.ts` — les fichiers `route.ts` restent fins (routing + garde + validation seulement).
- Commentaires en français, expliquant le **pourquoi** (contrainte métier, décision d'archi) jamais le quoi — à respecter en continuant sur ce fichier.
- `import "server-only"` en tête de tout module qui ne doit jamais être bundlé côté client (auth, db, password, tenant...).

## Tests

```bash
pnpm test              # unitaire, mocké, rapide — tourne dans la CI
pnpm test:integration  # tape la vraie base Neon de dev — jamais dans le test par défaut
```
`vitest.config.mts` exclut explicitement `*.integration.test.ts` ; `vitest.integration.config.mts` cible uniquement ceux-là avec `DATABASE_URL` chargé via `.env.local`. Ne pas fusionner les deux configs — la séparation est volontaire (pas de dépendance DB dans le test par défaut).

## Ce qui a été audité (2026-09-09)

- ✅ `npx tsc --noEmit` — 0 erreur.
- ✅ `pnpm test` — 47/47 tests passent.
- ✅ `pnpm build` — OK sans variables d'environnement (toutes les routes sont dynamiques).
- ✅ `pnpm lint` — **0 erreur** (16 erreurs `react-hooks/set-state-in-effect` corrigées dans cette session : chaque cas était un pattern volontaire — fetch au montage/changement de période, reset de pagination sur filtre, lecture d'API navigateur post-hydratation — documenté par un `eslint-disable-next-line` justifié plutôt qu'une réécriture risquée sous contrainte de temps). Il reste 9 warnings `react-hooks/exhaustive-deps` pré-existants, non bloquants.
- ✅ Rate limiting ajouté sur `/api/v1/auth/login` (10 tentatives/5min, par IP et par téléphone) et `/auth/register` (5/heure par IP) — voir `src/lib/rate-limit.ts`. **Limite connue** : store en mémoire par instance, pas distribué — suffisant en stopgap, mais passer à un store partagé (Upstash Redis) si une garantie stricte cross-instance est nécessaire en prod à forte échelle.
- ⚠️ Toujours aucun monitoring d'erreurs (Sentry ou équivalent) — les erreurs 500 ne sont que `console.error`-ées (`src/lib/http-errors.ts`), invisibles en prod sauf logs Vercel. Nécessite un choix d'outil/compte externe, pas fait dans cette session.
- ✅ `pnpm-workspace.yaml` : résidu `@clerk/shared` supprimé (Clerk totalement absent du lockfile, migration NextAuth terminée).
- ✅ Fichier `Untitled` (résidu, 14 octets) supprimé.
- ✅ `.env.local` correctement ignoré par git, jamais commité, aucun secret trouvé dans l'historique lors de l'audit.
- ✅ Mots de passe hashés avec bcrypt (10 rounds) — cohérent avec les pratiques actuelles.

## CI/CD

Pas de workflow CI avant cette session. Ajouté : [.github/workflows/ci.yml](.github/workflows/ci.yml) — lint + typecheck + `pnpm test` sur push/PR vers `main`. Ne fait **pas** tourner `test:integration` (nécessiterait un secret `DATABASE_URL` pointant vers une base de test dédiée, à mettre en place séparément si souhaité — ne jamais pointer une CI publique vers la base Neon de dev/prod).

Déploiement : Vercel, probablement auto-déployé sur push vers `main` (projet lié via `.vercel/project.json`) — vérifier la config de déploiement Vercel (Preview Deployments sur PR notamment) plutôt que de dupliquer cette logique en Actions.

## Pour Claude : rappels utiles

- Le mobile (`../serveo-mobile`) consomme cette API — un changement de forme de réponse JSON sur une route `/api/v1/*` existante doit être répercuté côté mobile (`serveo-mobile/src/lib/api.ts` et les écrans qui consomment cette route).
- Ne jamais logguer ou renvoyer `passwordHash`, `AUTH_SECRET`, ou le contenu brut d'un token Bearer.
- Avant d'ajouter une nouvelle table avec des données par-bar, penser à l'index sur `organizationId` (pattern systématique dans `schema.ts`, ex. `index("products_org_idx").on(t.organizationId)`).
