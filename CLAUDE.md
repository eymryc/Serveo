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

Un tenant = une `organization` (un bar). Un compte peut avoir accès à **plusieurs bars** via la table `memberships` (user, bar, rôle), qui est la source de vérité. `users.organizationId` / `users.role` désignent seulement le **bar actif** et le rôle dans ce bar ; ils ne s'écrivent que via `src/lib/memberships.ts`. Le bar actif est porté par le compte, pas par la session : changer de bar sur le web le change aussi sur le mobile, un choix assumé. Le reste du code (`auth()`, `requireTenant()`) lit le bar actif comme avant. **Toute route API doit passer par les gardes de `src/lib/tenant.ts`** avant de toucher la DB :

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

## Base de données & migrations

- ⚠️ **`.env.local` pointe sur la base de PRODUCTION** (récupéré depuis Vercel/Neon, vérifié le 2026-11-15 : vrais bars, vraies ventes). Ne jamais lancer de script d'écriture, de seed ni de test avec ce fichier.
- `src/db/migrations/` repart d'une **baseline** (`0000_baseline.sql`, générée depuis `schema.ts` le 2026-11-15) dont l'empreinte a été vérifiée identique à la prod, et marquée comme appliquée dans `drizzle.__drizzle_migrations` en prod. L'ancien historique (faux : il ne recréait pas la prod) est archivé dans `src/db/migrations-legacy/`, pour mémoire uniquement.
- Workflow : modifier `schema.ts` → `pnpm db:generate` → relire le SQL → commiter → `pnpm db:migrate` (applique uniquement les nouvelles migrations). **Ne plus utiliser `drizzle-kit push` sur la prod** (script retiré) : il contourne l'historique et peut supprimer des colonnes.
- La CI vérifie que `schema.ts` et les migrations n'ont pas divergé (`drizzle-kit generate` ne doit rien produire).
- `pnpm db:inspect` : contrôle en lecture seule de la prod (volumétrie, cohérence stock ↔ mouvements, stocks négatifs). `scripts/db-schema-fingerprint.mjs` : empreinte de schéma pour comparer deux bases.

## Tests

```bash
pnpm test              # unitaire, mocké, rapide
TEST_DATABASE_URL=postgres://postgres@localhost:5432/serveo_test pnpm test:integration
```
`vitest.config.mts` exclut `*.integration.test.ts`. `vitest.integration.config.mts` redirige `@/db` vers `src/test/integration-db.ts` (driver node-postgres) et **refuse toute URL non locale**. Préparer la base de test : `DATABASE_URL=<url locale> pnpm exec drizzle-kit migrate`. La CI fait tourner les deux suites, avec un service Postgres 16.

## Fuseau horaire & moyens de paiement

- `organizations.timezone` (liste fermée dans `ALLOWED_TIMEZONES`) : les séries du dashboard tronquent dans ce fuseau (`AT TIME ZONE`), pas en UTC.
- Catalogue par bar : table `organization_payment_methods` (code libre, libellé, kind, actif). Les colonnes `payment_method` sont du **texte**, plus un enum Postgres — un bar au Bénin peut ajouter « Moov Money » sans migration. `active_payment_methods[]` reste un cache dénormalisé pour le mobile.
- Clôture de caisse : `cash_sessions.counted_by_method` (jsonb). Les colonnes `counted_*` legacy sont encore remplies en miroir.

## Journal d'audit

`recordAudit()` (`src/lib/audit.ts`) trace les actions sensibles dans `audit_logs` (ajout seul) : annulations de vente, annulations de mouvements de stock, clôtures d'inventaire et de caisse, équipe, paramètres, actions du back-office, impersonation (avec `impersonator_user_id`). Ajouter un appel pour toute nouvelle action sensible. La page gérant `/app/journal` les affiche ; une action faite en impersonation y apparaît comme « Support Serveo ».

## Erreurs : suivi sans service payant

Toute réponse 500 de `errorResponse()` est enregistrée dans `error_logs` après l'envoi de la réponse (`after()`, `src/lib/error-log.ts`) ; les erreurs de rendu passent par `onRequestError` (`src/instrumentation.ts`), celles du navigateur par `error.tsx` / `global-error.tsx` → `POST /api/v1/client-errors` (publique, 20/10 min par IP). Regroupement par empreinte (message normalisé + 1re ligne de pile), consultation dans `/admin/erreurs`, purge après 30 jours. Alerte Telegram optionnelle (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`). `error-log.ts` importe `auth` dynamiquement : `http-errors` est importé partout, y compris par les tests d'intégration.

## App mobile : version minimale

`GET /api/v1/app-config` (public) renvoie `MIN_MOBILE_APP_VERSION` et `NEXT_PUBLIC_ANDROID_APK_URL`. Une app mobile plus ancienne affiche un écran bloquant « Mettre à jour ». Monter `MIN_MOBILE_APP_VERSION` seulement après avoir distribué l'APK correspondant, et seulement si l'API a cassé la compatibilité.

## Ventes : invariants à préserver

- `POST /api/v1/sales` accepte `{ batchId, lines[] }` (facture entière : une transaction, tout ou rien, **idempotente sur `batchId`**, que le client réutilise à chaque nouvelle tentative) et l'ancien format une-ligne-par-requête, gardé tant que d'anciens APK circulent.
- Toute écriture qui vérifie puis modifie `products.current_stock` doit verrouiller la ligne (`.for("update")`). Les tests d'intégration de concurrence échouent sans ce verrou.
- `sales.purchase_unit_price` fige le prix d'achat à la vente (marge historique stable). Il n'est jamais renvoyé aux clients (`publicSaleColumns` dans `src/lib/sales.ts`).

## Ce qui a été audité (2026-09-09)

- ✅ `npx tsc --noEmit` — 0 erreur.
- ✅ `pnpm test` — 47/47 tests passent.
- ✅ `pnpm build` — OK sans variables d'environnement (toutes les routes sont dynamiques).
- ✅ `pnpm lint` — **0 erreur** (16 erreurs `react-hooks/set-state-in-effect` corrigées dans cette session : chaque cas était un pattern volontaire — fetch au montage/changement de période, reset de pagination sur filtre, lecture d'API navigateur post-hydratation — documenté par un `eslint-disable-next-line` justifié plutôt qu'une réécriture risquée sous contrainte de temps). Il reste 9 warnings `react-hooks/exhaustive-deps` pré-existants, non bloquants.
- ✅ Rate limiting sur `/api/v1/auth/login`, la connexion web NextAuth (mêmes compteurs : 10 tentatives/5min, par IP et par téléphone) et `/auth/register` (5/heure par IP) — `src/lib/rate-limit.ts`, compteurs dans la table Postgres `rate_limits` (partagés entre instances Vercel, fail-open si la base est injoignable).
- ⚠️ Toujours aucun monitoring d'erreurs (Sentry ou équivalent) — les erreurs 500 ne sont que `console.error`-ées (`src/lib/http-errors.ts`), invisibles en prod sauf logs Vercel. Nécessite un choix d'outil/compte externe, pas fait dans cette session.
- ✅ `pnpm-workspace.yaml` : résidu `@clerk/shared` supprimé (Clerk totalement absent du lockfile, migration NextAuth terminée).
- ✅ Fichier `Untitled` (résidu, 14 octets) supprimé.
- ✅ `.env.local` correctement ignoré par git, jamais commité, aucun secret trouvé dans l'historique lors de l'audit.
- ✅ Mots de passe hashés avec bcrypt (10 rounds) — cohérent avec les pratiques actuelles.

## CI/CD

[.github/workflows/ci.yml](.github/workflows/ci.yml) : lint, typecheck, tests unitaires, migrations sur un Postgres de service, contrôle de dérive du schéma, tests d'intégration, build. Le `packageManager` est fixé dans `package.json` (requis par `pnpm/action-setup`).

Déploiement : Vercel, probablement auto-déployé sur push vers `main` (projet lié via `.vercel/project.json`) — vérifier la config de déploiement Vercel (Preview Deployments sur PR notamment) plutôt que de dupliquer cette logique en Actions.

## Pour Claude : rappels utiles

- Le mobile (`../serveo-mobile`) consomme cette API — un changement de forme de réponse JSON sur une route `/api/v1/*` existante doit être répercuté côté mobile (`serveo-mobile/src/lib/api.ts` et les écrans qui consomment cette route).
- Ne jamais logguer ou renvoyer `passwordHash`, `AUTH_SECRET`, ou le contenu brut d'un token Bearer.
- Avant d'ajouter une nouvelle table avec des données par-bar, penser à l'index sur `organizationId` (pattern systématique dans `schema.ts`, ex. `index("products_org_idx").on(t.organizationId)`).
