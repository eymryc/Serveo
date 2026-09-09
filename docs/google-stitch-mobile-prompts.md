# Serveo — Prompts Google Stitch (Mobile)

Document prêt à coller dans **Google Stitch** pour générer les écrans de l’app mobile Serveo.

- **Produit :** gestion de bar / buvette (Côte d’Ivoire)
- **Devise :** FCFA
- **Auth mobile :** JWT Bearer (`POST /api/v1/auth/login`)
- **Rôles :** Gérant (`admin`) · Barman (`member`) · Super-admin plateforme (hors scope mobile bar)
- **1 utilisateur = 1 bar (organization)**

---

## 0. Prompt global — Design system & contexte produit

```text
Design a complete mobile app UI kit for "Serveo", a bar / buvette management app for Côte d'Ivoire.

PRODUCT CONTEXT
- Serveo helps bar managers (Gérant) and bartenders (Barman) track sales (POS), stock, expenses, team, and reports.
- Currency: FCFA everywhere. Phone numbers: international format, default country Côte d'Ivoire (+225).
- Language: French UI copy only.
- Platform: iOS/Android phone, portrait, primary use on the counter during service.

ROLES (affect which screens / fields are visible)
1) Barman (member): Dashboard restricted, Ventes, Stock (entries/exits). NO purchase price, NO charges, NO reports, NO team, NO settings.
2) Gérant (admin): Full access — Dashboard financials, Articles CRUD, Charges, Rapports, Equipe, Paramètres.

VISUAL DIRECTION
- Clean operational tool, not a consumer social app.
- Strong hierarchy for money (large FCFA figures), fast POS actions, high-contrast CTAs.
- Avoid purple gradients, cream terracotta newspaper looks, and generic AI dashboard clutter.
- Brand name "Serveo" must be a hero-level signal on auth / marketing screens.
- Dense but readable forms; large tap targets (min ~44pt) for cashier use.
- Dark-friendly optional; prefer light professional bar/ops aesthetic with clear borders, tabular numbers for money.

NAVIGATION (bottom tab for staff app)
- Activité: Tableau de bord · Ventes · Stock
- Gérant only extra tabs or "Plus" menu: Articles · Charges · Rapports · Equipe · Paramètres

COMMON UI PATTERNS
- Period selector: Aujourd'hui | Semaine | Mois | Année | Personnalisé (from/to)
- Payment method chips (only those enabled for the bar): Espèces · Orange Money · MTN MoMo · Wave · Carte / Virement · Crédit client
- Empty states with one clear CTA
- Toast / inline error: "Stock insuffisant pour cette vente", "Authentification requise", etc.
- Money format: "34 400 FCFA" (French grouping)

Generate consistent screens sharing the same components: header, KPI strip, list rows, primary button, search field, date picker, payment chips, bottom sheet for details.
```

---

## 1. Connexion (Login)

**API :** `POST /api/v1/auth/login`  
**Body :** `{ phone: string, password: string }`  
**Response :** `{ token, user: { id, phone, firstName, lastName, organizationId, role, isPlatformAdmin } }`

```text
SCREEN: Serveo Mobile — Connexion

PURPOSE
Sign in an existing user with phone + password. After success, if organizationId is null → go to Onboarding; else → Tableau de bord.

LAYOUT
- Full-bleed brand area with large Serveo logo (hero branding, not tiny nav logo)
- Short subtitle: "Gérez votre bar en toute simplicité"
- Form card / block below

FIELDS (exact)
1) Téléphone
   - type: phone international input
   - default country: CI (+225)
   - required
   - validation: 8–20 chars, digits + optional + ( ) -
   - maps to API: phone (E.164 preferred, e.g. +2250788323276)
2) Mot de passe
   - type: password, reveal toggle
   - required, min length client-side 1 (server checks credentials)
   - maps to API: password

ACTIONS
- Primary button: "Se connecter" (full width, large)
- Secondary link: "Créer un compte" → Inscription
- Error states: "Identifiants invalides" (401), "Compte désactivé" (403)

STATES
- Loading on submit
- Keyboard-friendly, phone keyboard for téléphone
```

---

## 2. Inscription (Register) — prompt détaillé

**API :** `POST /api/v1/auth/register`  
**Body :**
```json
{
  "firstName": "string 1–200",
  "lastName": "string 1–200",
  "phone": "string 8–20, format +225…",
  "password": "string min 8 max 200"
}
```
**Response 201 :** `{ "user": { "id", "firstName", "lastName", "phone" } }`  
**Ensuite (mobile) :** `POST /api/v1/auth/login` → stocker `token` → naviguer vers Onboarding  
**Erreurs :** 409 `"Un compte existe deja avec ce numero de telephone"` · 400 validation Zod

```text
SCREEN: Serveo Mobile — Inscription / Créer un compte

PRODUCT
Serveo is a bar management app (Côte d'Ivoire, FCFA). This screen creates a personal account ONLY — the bar is created on the NEXT screen. Do not ask for bar name here.

LAYOUT (mobile portrait)
- Safe-area top
- Large Serveo logo centered (hero brand, not a tiny favicon)
- Optional thin primary accent line under logo / card
- Single scrollable form card on light background
- Footer link under the card

HEADER COPY
- Title (optional under logo): "Créer un compte"
- Helper text: "Vous créerez votre bar juste après l'inscription."

FIELDS — exact order, all required unless noted

1) Prénom
   - Label: "Prénom"
   - API key: firstName
   - Type: text, autocomplete given-name
   - Required, length 1–200
   - Layout: half width on tablet; full width stacked on phone (or 2-col grid with Nom)

2) Nom
   - Label: "Nom"
   - API key: lastName
   - Type: text, autocomplete family-name
   - Required, length 1–200
   - Same row as Prénom when space allows

3) Numéro de téléphone
   - Label: "Numéro de téléphone"
   - API key: phone
   - Type: international phone input
   - Default country: Côte d'Ivoire (CI), dial code +225
   - Separate dial code + national number UI
   - Required; send E.164 to API (example +2250700000000)
   - Validation: 8–20 chars after normalize; digits and + ( ) - allowed
   - Keyboard: phone pad

4) Mot de passe
   - Label: "Mot de passe"
   - API key: password
   - Type: password with show/hide eye toggle
   - Required, minLength 8, maxLength 200
   - Helper under field: "Minimum 8 caractères"
   - Autocomplete: new-password

5) Confirmer le mot de passe
   - Label: "Confirmer le mot de passe"
   - Client-only field (NOT sent to API)
   - Same rules as password
   - Must equal password before submit
   - Error if mismatch: "Les mots de passe ne correspondent pas"

PRIMARY ACTION
- Button full width, large tap target
- Label idle: "Créer mon compte"
- Label loading: "Création…"
- Disabled while loading

SECONDARY
- Text centered: "Déjà un compte ? Se connecter"
- "Se connecter" is a tappable link → Login screen

VALIDATION & ERRORS (inline alert, destructive)
- Mismatch passwords → "Les mots de passe ne correspondent pas"
- Phone already used (409) → "Un compte existe déjà avec ce numéro de téléphone"
- Generic → "Erreur d'inscription"
- After register OK but auto-login fails → "Compte créé, mais la connexion automatique a échoué — réessayez de vous connecter."

SUCCESS FLOW (do not show a separate success screen)
1. POST /api/v1/auth/register
2. POST /api/v1/auth/login with same phone + password
3. Persist JWT token
4. Navigate immediately to screen "Créer votre bar" (Onboarding)
   User still has organizationId = null at this point.

VISUAL NOTES
- Same auth shell as Login for consistency
- No social login, no email field, no OTP on this version
- No terms checkbox unless you add a discreet legal line
```

---

## 3. Process complet d’inscription → bar (flow multi-écrans)

Utilise ce prompt pour générer la **séquence entière** (Register + Onboarding + arrivée app).

```text
FLOW: Serveo Mobile — Process d'inscription complet (Register → Onboarding → App)

GOAL
Design a clear 3-step acquisition process for a new bar owner in Côte d'Ivoire.

STEP MAP (progress indicator optional: 1/2 compte · 2/2 bar)

═══════════════════════════════════════
STEP A — Écran Inscription (Créer un compte)
═══════════════════════════════════════
Entry points:
- From Login via link "Créer un compte"
- Cold start deep link / first open CTA

User fills:
- firstName, lastName, phone (+225), password, confirmPassword
CTA: "Créer mon compte"
API: POST /auth/register then POST /auth/login
Result: authenticated user WITHOUT bar (organizationId = null, role still default member until org create)

═══════════════════════════════════════
STEP B — Écran Onboarding (Créer votre bar)
═══════════════════════════════════════
Shown ONLY if authenticated AND organizationId == null
Cannot skip; blocking gate before /app tabs

User fills:
- name (Nom du bar) only
CTA: "Créer mon bar"
API: POST /organization { name }
Server effects:
- Creates organization (country default "Cote d'Ivoire", currency "FCFA")
- Attaches user as Gérant (role = admin)
- Seeds default product categories, expense categories, unit labels, package labels
Result: user enters app as Gérant

═══════════════════════════════════════
STEP C — Première arrivée dans l'app
═══════════════════════════════════════
Navigate to Tableau de bord (Gérant)
Optional empty-state welcome card:
- Title: "Bienvenue dans {barName}"
- Body: "Ajoutez vos articles, puis enregistrez votre première vente."
- CTAs: "Ajouter un article" · "Nouvelle vente"

ALSO DESIGN EDGE PATHS
1) User closes app after register, before creating bar
   → Next login: skip register, land again on Onboarding (Créer votre bar)
2) User already has account
   → Login → if org exists → Dashboard; if not → Onboarding
3) Barman account
   → Never uses Register+Onboarding for joining; Gérant creates them in Équipe
   → Barman only uses Login

VISUAL CONTINUITY
- Same logo, same card style, same primary button from A → B
- Step B feels like continuation of A (same auth shell), not a different product
- French copy only; money later in FCFA
```

---

## 4. Onboarding — Créer le bar (prompt détaillé)

**API :** `POST /api/v1/organization` (Bearer token required)  
**Body :** `{ "name": "string 1–200" }`  
**Response 201 :** `{ organization: { id, name, city, country, currency, … } }`  
**Erreurs :** 401 non authentifié · 409 déjà rattaché à un bar · 400 nom invalide

```text
SCREEN: Serveo Mobile — Onboarding / Créer votre bar

PURPOSE
Second and final step after registration. The user already has an account and a JWT.
They must create their first bar before accessing Ventes / Stock / Dashboard.
This screen is a HARD GATE: no bottom tabs, no skip, no "plus tard".

WHEN TO SHOW
- After successful register+login
- After login when user.organizationId === null
- NEVER show if organizationId is set (redirect to app)

LAYOUT (mobile portrait)
- Same auth shell as Login / Register for brand continuity
- Large Serveo logo centered
- Title: "Créez votre bar"
- Description under title:
  "Chaque bar est un espace indépendant : ventes, stock et charges y sont isolés"
- One focused form card
- Optional subtle step hint: "Étape 2 sur 2 — Votre établissement"

FIELDS (exact)

1) Nom du bar
   - Label: "Nom du bar"
   - API key: name
   - Type: text
   - Required, length 1–200
   - Placeholder: "Le Comptoir" (or "Ex. Bar Le Plateau")
   - Autofocus on open
   - Keyboard: default text, capitalize words

DO NOT SHOW ON THIS SCREEN
- City, country, currency (defaults applied server-side: Cote d'Ivoire / FCFA)
- Payment methods, categories, team
- Phone / password (already done)

PRIMARY ACTION
- Button full width
- Idle: "Créer mon bar"
- Loading: "Création…"
- Disabled while loading or if name empty

ERRORS
- Inline destructive alert
- "Erreur de création du bar" (generic)
- "Vous avez déjà un bar" / 409 style if already attached

SUCCESS
- No intermediate celebration screen required
- Navigate to Tableau de bord with empty-state welcome for new bar
- User role is now Gérant (admin)

MICROCOPY IDEAS (optional secondary line)
- "Vous pourrez modifier les infos du bar plus tard dans Paramètres."
```

---

## 5. Tableau de bord — Gérant (full)

**API :** `GET /api/v1/dashboard?period=today|week|month|year` or `from&to`

```text
SCREEN: Serveo Mobile — Tableau de bord (Gérant)

PURPOSE
Financial overview for the bar manager for a selected period.

TOP BAR
- Bar name (organization.name)
- Period selector chips: Aujourd'hui · Semaine · Mois · Année · Personnalisé

KPI STRIP (large numbers, FCFA)
1) CA net — revenue.net
2) Charges — expenses.total
3) Résultat (CA − charges) — result.netProfit
4) Objectif — result.goalProgressPct % + monthlyRevenueTarget if set
5) Ticket moyen — revenue.avgTicket
6) Nb ventes — revenue.salesCount
7) Delta vs période précédente — revenue.deltaPct (↑↓)

SECTIONS
A) Courbe / sparkline CA — timeSeries[{ bucket, net }]
B) Répartition paiements — paymentMethodBreakdown[{ method, amount, percentage }]
   Labels: Espèces, Orange Money, MTN MoMo, Wave, Carte / Virement, Crédit client
C) CA par catégorie produit — revenueByCategory[{ category, amount, percentage }]
D) Top articles — topProducts[{ name, quantity, amount, profit, marginPct }]
E) Charges par catégorie — expenses.byCategory[]
F) Alertes stock — stock.alertsCount + list of products where currentStock <= stockMinThreshold
   Show: product.name, currentStock, stockMinThreshold, unitLabel

NO purchase prices on this screen for clutter; margin shown at product row level only.
```

---

## 6. Tableau de bord — Barman (restricted)

**API :** same dashboard, response `restricted: true`

```text
SCREEN: Serveo Mobile — Tableau de bord (Barman)

PURPOSE
Operational home without financial secrets.

VISIBLE ONLY
- Period selector (optional / simplified)
- KPI: Nombre de ventes (salesCount)
- KPI: Articles actifs (activeProductsCount)
- Block: Alertes stock (stock.alerts[]) — name, stock restant, seuil, unité

HIDDEN
- CA, charges, marge, objectifs, top produits rentables, prix d'achat

CTA
- "Nouvelle vente" → Ventes
- "Mouvement de stock" → Stock
```

---

## 7. Ventes — Caisse (POS)

**API :** `POST /api/v1/sales` (one call per line, shared `batchId`)  
**Body per line :**
```ts
{
  productId: uuid,          // required
  quantity: int > 0,        // required
  discount: number >= 0,    // default 0, FCFA
  paymentMethod: enum,      // required — from org.activePaymentMethods
  soldAt?: ISO datetime,    // optional — past date allowed, not future
  batchId?: uuid            // client-generated for multi-line ticket
}
```
**Rules :** stock check → 409 if `currentStock < quantity`. Creates stock `sale_exit` automatically.

```text
SCREEN: Serveo Mobile — Ventes / Caisse

PURPOSE
Cashier registers a multi-item ticket quickly during service.

STRUCTURE
- Top: title "Ventes", tabs: Caisse | Historique
- Main: cart lines list
- Sticky bottom / sheet: ticket recap + payment + date + Encaisser

CART LINE (repeatable)
For each line show:
1) Article — searchable select of active products
   option label: name
   option meta: "Stock {currentStock} · {unitPrice} FCFA"
   disable if currentStock <= 0
2) Quantité — stepper / number int ≥ 1, max = currentStock
3) Remise (FCFA) — optional number ≥ 0 — API: discount
4) Line total = unitPrice * quantity − discount (display only)
5) Delete line control

ACTIONS ON CART
- "Ajouter un article"
- Cannot pick the same product twice in one ticket (UX)

TICKET FOOTER
1) Date de vente — advanced date picker (FR)
   presets: Aujourd'hui · Hier · Il y a 7 jours
   max = today
   maps to soldAt (keep current time of day)
2) Paiement — chip grid from activePaymentMethods only
   values: especes | orange_money | mtn_momo | wave | carte_virement | credit_client
3) Total ticket — sum of line nets (large)
4) Buttons: "Vider" · primary "Encaisser"

SUCCESS
Toast: "Facture enregistrée — {total} FCFA"
Clear cart, reset date to today.
On stock error: keep failed lines, show "Stock insuffisant pour cette vente".
```

---

## 8. Ventes — Historique

**API :** `GET /api/v1/sales?from&to`  
Group client-side by `batchId` (or sale.id if null)

```text
SCREEN: Serveo Mobile — Ventes / Historique

PURPOSE
Browse past tickets for a period.

CONTROLS
- Period selector
- Search: product names / payment label / time
- Filter chips by payment method used in period

KPI STRIP (period)
- CA · Nb factures · Ticket moyen · Articles vendus

LIST ROW (ticket / SaleGroup)
- Date/heure (soldAt)
- Content summary (1 product name or "A, B +N")
- Quantité agrégée (by unitLabel)
- Payment label
- Total FCFA (sum netAmount)

DETAIL BOTTOM SHEET
- Full datetime
- Payment
- Lines: product name, qty × unitPrice, discount, line net
- Grand total
- Optional: no delete sale in v1 (read-only detail)
```

---

## 9. Stock — Liste articles & alertes

**API :** `GET /api/v1/products` (Barman: no purchasePrice)

```text
SCREEN: Serveo Mobile — Stock

TABS: Articles | Historique

ARTICLES TAB
- Search by name
- CTA buttons: "Entrée de stock" · "Sortie de stock"

LIST ROW
- product.name
- category name (if any)
- Stock: "{currentStock} {unitLabel}"
- Badge "Alerte" if currentStock <= stockMinThreshold
- Gérant only secondary: purchasePrice / margin hint (optional)

EMPTY / LOW STOCK SECTION
- "Alertes stock" sticky group at top
```

---

## 10. Stock — Entrée / Sortie (mouvement multi-lignes)

**API :** `POST /api/v1/products/{id}/stock-movements`  
**Body :**
```ts
{
  type: "entry" | "adjustment",
  quantityDelta: int ≠ 0,     // entry: positive; sortie: negative
  note?: string ≤ 500,        // REQUIRED if quantityDelta < 0
  occurredAt?: ISO date,      // optional backdate
  batchId?: uuid              // shared across lines of one form
}
```

```text
SCREEN: Serveo Mobile — Entrée de stock
SCREEN: Serveo Mobile — Sortie de stock

SHARED LAYOUT
- Title depends on mode
- Date (advanced picker, max today) → occurredAt
- Motif / note
  - Entrée: optional ("Livraison, note…")
  - Sortie: REQUIRED ("Casse, péremption, vol…")
- Multi-line articles (like POS)

LINE FIELDS
1) Article — searchable select
2) Quantité
   - Mode unités: integer of unitLabel (bouteille, canette…)
   - Optional toggle "Par format d'achat" if product.packageLabel && unitsPerPackage
     e.g. 2 casiers × 24 = 48 bouteilles → quantityDelta computed in units
3) Preview new stock (currentStock ± delta) — cannot go below 0

FOOTER
- Primary: "Enregistrer le mouvement"
- On success → Stock historique

BUSINESS RULES TO REFLECT IN UI
- Sortie without motif: block submit
- Negative resulting stock: block with error
```

---

## 11. Stock — Historique mouvements

**API :** `GET /api/v1/stock-movements?from&to`  
**Reverse :** `POST /api/v1/stock-movements/{batchId}/reverse`

```text
SCREEN: Serveo Mobile — Stock / Historique

LIST (grouped by batchId when present)
Row fields:
- createdAt / occurred time
- productName
- type label: Stock initial | Entrée | Vente | Ajustement
- quantityDelta (+ green / − red) + unit
- note (or "Sans motif")
- If batch already reversed: badge "Annulé"

ACTIONS
- On a reversible batch (type entry/adjustment, not already reversed):
  "Annuler le mouvement" → confirm → reverse API
- Sale_exit rows: no reverse from stock UI (tied to sales)
```

---

## 12. Articles — Catalogue (Gérant)

**API :**  
- `GET /api/v1/products?includeInactive=1`  
- `POST /api/v1/products`  
- `PATCH /api/v1/products/{id}`

**Create fields :**
| Champ UI | API | Contrainte |
|----------|-----|------------|
| Nom | name | 1–200 required |
| Catégorie | categoryId | uuid \| null |
| Prix de vente (FCFA) | unitPrice | ≥ 0 |
| Prix d'achat (FCFA) | purchasePrice | ≥ 0 default 0 |
| Unité | unitLabel | 1–50 default "bouteille" |
| Format d'achat | packageLabel | optional |
| Unités / format | unitsPerPackage | int > 0 if package |
| Stock initial | initialStock | int ≥ 0 default 0 (create only) |
| Seuil d'alerte | stockMinThreshold | int ≥ 0 default 5 |
| Actif | isActive | 0 \| 1 (update) |

```text
SCREEN: Serveo Mobile — Articles (liste)
- Search, filter Actifs / Désactivés
- FAB "Nouvel article"
- Row: name, category, unitPrice FCFA, stock, active badge
- Tap → détail / edit sheet

SCREEN: Serveo Mobile — Article (créer / éditer)
Form with exact fields above.
Show computed margin hint: ((unitPrice − purchasePrice) / unitPrice) when purchasePrice set.
Note: editing stock is NOT on this form — stock changes only via Stock movements or sales.
Actions: Enregistrer · Désactiver / Réactiver
```

---

## 13. Charges (Gérant)

**API :** `GET/POST /api/v1/expenses`  
**Create body :**
```ts
{
  expenseDate: date,           // required
  label: string 1–200,         // required
  categoryId?: uuid | null,
  amount: number > 0,          // FCFA
  paymentMethod: enum,         // required
  frequency?: string ≤ 50,     // optional (UI may hide)
  remark?: string ≤ 500        // optional
}
```

```text
SCREEN: Serveo Mobile — Charges

LIST
- Period selector
- KPI: total charges période
- Row: expenseDate, label, category name, amount FCFA, payment label

CREATE SHEET / SCREEN
1) Date — date picker (past allowed)
2) Libellé — text "Ex. Loyer du mois"
3) Catégorie — select from expense-categories (Loyer, Salaires, Électricité…)
4) Montant (FCFA) — number > 0
5) Paiement — chips (activePaymentMethods)
6) Optional advanced: Fréquence, Remarque
Primary: "Enregistrer la charge"
```

---

## 14. Rapports (Gérant)

**API :** reuse dashboard (and/or same aggregates)

```text
SCREEN: Serveo Mobile — Rapports

Tabs or sections:
1) Ventes — CA brut/net, time series, by category, payment mix
2) Articles — topProducts table: qty, CA, COGS, profit, marginPct
3) Charges — expenses.total and byCategory; formula line:
   "CA {net} − Charges {total} = {netProfit}"
4) Stock — valeur stock (stock.totalValue), alertes

Period selector always visible.
Dense charts + tables suitable for phone (horizontal scroll tables OK).
```

---

## 15. Équipe (Gérant)

**API :**  
- `GET /api/v1/team`  
- `POST /api/v1/team` `{ firstName, lastName, phone, password, role }`  
- `PATCH /api/v1/team/{id}` `{ role }`  
- `DELETE /api/v1/team/{id}`  
**Rules :** cannot change/delete self

```text
SCREEN: Serveo Mobile — Équipe

LIST ROW
- Avatar initials
- firstName lastName
- phone
- Role badge: Gérant | Barman
- createdAt

CREATE MEMBER SHEET
1) Prénom
2) Nom
3) Téléphone (+225)
4) Mot de passe temporaire (min 8)
5) Rôle — segmented: Gérant (admin) | Barman (member) — default Barman
CTA: "Ajouter au bar"

ROW ACTIONS
- Changer le rôle
- Supprimer (confirm) — disabled for current user
Helper copy: "Le gérant crée le compte du barman (pas d'invitation email)."
```

---

## 16. Paramètres (Gérant)

**API :** `GET/PATCH /api/v1/organization`  
+ CRUD categories / expense-categories / unit-labels / package-labels

```text
SCREEN: Serveo Mobile — Paramètres

TABS
1) Général
2) Catégories
3) Unités
4) Paiements

TAB GÉNÉRAL — fields
- Nom du bar → name (1–200)
- Ville → city ≤ 100 optional
- Pays → country ≤ 100 (default "Cote d'Ivoire")
- Devise → currency ≤ 10 (default "FCFA")
- Objectif CA mensuel (FCFA) → monthlyRevenueTarget ≥ 0
- Objectif marge % → monthlyMarginTargetPct 0–100 (optional)
- Seuil d'alerte stock (unités) → defaultStockAlertThreshold int ≥ 0

TAB CATÉGORIES
- Deux listes: Catégories produits | Catégories de charges
- Inline add/rename/delete
- Seed examples produits: Bières, Vins, Liqueurs & Spiritueux, Sodas & Jus, Eaux, Cocktails, Snacks, Autres
- Seed charges: Loyer, Salaires, Électricité, Achats boissons, Achats snacks, Téléphone, Entretien, Autres

TAB UNITÉS
- Unités de vente (unit-labels): bouteille, canette, sachet, verre, bidon
- Formats d'achat (package-labels): casier, carton, pack, caisse, fût
- Rename propagates to products

TAB PAIEMENTS
- Multi-select toggles for activePaymentMethods (min 1 required)
- Labels FR as listed above
```

---

## 17. Navigation shell

```text
SCREEN: Serveo Mobile — App Shell

- Top safe area with bar name + avatar menu (Déconnexion)
- Bottom tabs:
  Barman: Accueil · Ventes · Stock
  Gérant: Accueil · Ventes · Stock · Plus
- "Plus" menu (Gérant): Articles, Charges, Rapports, Équipe, Paramètres
- Floating primary actions contextuel (Nouvelle vente on Accueil/Ventes)
```

---

## 18. États transverses (à générer une fois)

```text
Also generate these shared mobile states for Serveo:
1) Loading skeleton lists / KPI
2) Empty state Ventes: "Aucune facture sur cette période"
3) Empty state Stock: "Aucun article — créez votre catalogue"
4) Offline / erreur réseau toast
5) Confirm dialog: Annuler un mouvement de stock
6) Confirm dialog: Supprimer un membre
7) Success toast patterns for Encaisser / Charge / Mouvement
```

---

## Ordre recommandé dans Stitch

1. Prompt global (§0)  
2. Login (§1)  
3. **Process Register → Onboarding** (§2 + §3 + §4) — coller le flow §3 en premier, puis les écrans détaillés  
4. Shell navigation (§17)  
5. Ventes (Caisse + Historique) — cœur métier  
6. Stock (liste + entrée/sortie + historique)  
7. Dashboard Gérant + Barman  
8. Articles · Charges · Rapports · Équipe · Paramètres  
9. États vides / erreurs  

---

## Référence enums (copier tel quel)

```text
payment_method = especes | orange_money | mtn_momo | wave | carte_virement | credit_client
user_role = admin (Gérant) | member (Barman)
stock_movement_type = initial | entry | sale_exit | adjustment
period = today | week | month | year | custom
```
