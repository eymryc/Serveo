import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
  foreignKey,
  jsonb,
} from "drizzle-orm/pg-core";

export const paymentMethodValues = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
  "credit_client",
] as const;

// Un tenant = un bar/buvette.
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city"),
  country: text("country").default("Cote d'Ivoire"),
  currency: text("currency").notNull().default("FCFA"),
  monthlyRevenueTarget: numeric("monthly_revenue_target", { precision: 12, scale: 2 }),
  monthlyMarginTargetPct: numeric("monthly_margin_target_pct", { precision: 5, scale: 2 }),
  defaultStockAlertThreshold: integer("default_stock_alert_threshold").notNull().default(5),
  // Quels moyens de paiement apparaissent dans les formulaires Ventes/Charges
  // — evite d'afficher "Wave" a un bar qui ne l'accepte pas.
  activePaymentMethods: text("active_payment_methods")
    .array()
    .notNull()
    .default(sql`ARRAY['especes','orange_money','mtn_momo','wave','carte_virement','credit_client']::text[]`),
  paystackCustomerCode: text("paystack_customer_code"),
  // Soft-disable par le super-admin plateforme (le bar reste en base).
  isActive: integer("is_active").notNull().default(1),
  // Droit barman : annuler une vente (sinon reserve au gerant).
  memberCanCancelSales: integer("member_can_cancel_sales").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);

// Un utilisateur appartient a exactement un bar (pas de multi-org) —
// organizationId est null jusqu'a ce que le compte cree son bar
// (POST /api/v1/organization) ou soit rattache par un gerant via la page
// Equipe.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Noms de contraintes explicites (users_phone_key, *_fkey) : ce sont ceux
  // deja presents en prod — les noms par defaut de Drizzle feraient
  // supprimer/recreer les contraintes a chaque push/generate.
  phone: text("phone").notNull().unique("users_phone_key"),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  organizationId: uuid("organization_id"),
  role: userRoleEnum("role").notNull().default("member"),
  // Super-admin plateforme (back-office /admin) — orthogonal au role gérant/barman.
  isPlatformAdmin: integer("is_platform_admin").notNull().default(0),
  // Soft-disable compte (refus de connexion).
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("users_org_idx").on(t.organizationId),
  foreignKey({ name: "users_organization_id_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] })
    .onDelete("set null"),
]);

// Rattachement utilisateur ↔ bar : source de verite des bars auxquels un
// compte a acces (un patron peut gerer plusieurs etablissements, un barman
// travailler dans deux bars). users.organizationId / users.role ne sont que
// le bar ACTIF et le role dans ce bar — toujours ecrits via
// src/lib/memberships.ts, qui garantit qu'ils correspondent a une ligne ici.
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("memberships_user_org_key").on(t.userId, t.organizationId),
  index("memberships_org_idx").on(t.organizationId),
]);

// Journal d'audit des actions sensibles (annulations, droits, impersonation,
// mots de passe...) — en ajout seul, jamais modifie ni supprime par l'app.
// organizationId null = action plateforme hors bar.
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  actorUserId: uuid("actor_user_id"),
  // Super-admin reellement aux commandes pendant une impersonation.
  impersonatorUserId: uuid("impersonator_user_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_org_created_idx").on(t.organizationId, t.createdAt),
]);

// Compteurs de rate limiting partages entre toutes les instances Vercel.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("rate_limits_reset_at_idx").on(t.resetAt),
]);

// Erreurs serveur inattendues (500), consultables dans /admin/erreurs.
export const errorLogs = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Regroupe les occurrences d'une meme erreur (message + 1re ligne de pile).
  fingerprint: text("fingerprint").notNull(),
  source: text("source").notNull(),
  method: text("method"),
  path: text("path"),
  message: text("message").notNull(),
  stack: text("stack"),
  organizationId: uuid("organization_id"),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("error_logs_created_idx").on(t.createdAt),
  index("error_logs_fingerprint_created_idx").on(t.fingerprint, t.createdAt),
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Un seul enregistrement d'abonnement par organisation : on suit l'etat
  // courant, l'historique de facturation reste dans Paystack.
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  paystackSubscriptionCode: text("paystack_subscription_code"),
  planCode: text("plan_code").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("subscriptions_org_idx").on(t.organizationId)]);

// Categories de produits (Bieres, Vins, Liqueurs...) — parametrables par
// bar, pas figees dans le code : chaque etablissement a sa propre carte.
// (nom de table SQL inchange "categories" pour eviter une migration de
// renommage ; seul le nom TypeScript est clarifie)
export const productCategories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [index("categories_org_idx").on(t.organizationId)]);

// Categories de charges (Loyer, Salaires...) — meme logique, parametrables
// plutot que codees en dur cote frontend.
export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [index("expense_categories_org_idx").on(t.organizationId)]);

// Unites de vente/stock (bouteille, canette...) — parametrables par bar,
// meme logique que les categories : liste geree en Parametres, pas figee
// dans le code.
export const unitLabels = pgTable("unit_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
}, (t) => [
  index("unit_labels_org_idx").on(t.organizationId),
  foreignKey({ name: "unit_labels_organization_id_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] })
    .onDelete("cascade"),
]);

// Formats d'achat fournisseur (casier, carton...) — meme logique.
export const packageLabels = pgTable("package_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
}, (t) => [
  index("package_labels_org_idx").on(t.organizationId),
  foreignKey({ name: "package_labels_organization_id_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] })
    .onDelete("cascade"),
]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  // Le stock est TOUJOURS compte et vendu a l'unite (ex: la bouteille) —
  // c'est le format d'achat fournisseur qui varie. unitLabel nomme cette
  // unite (liste geree par bar, cf. table unit_labels) ; packageLabel +
  // unitsPerPackage decrivent le colis d'appro (cf. table package_labels,
  // ex. casier de 24) pour convertir automatiquement les receptions de
  // stock en unites.
  unitLabel: text("unit_label").notNull().default("bouteille"),
  packageLabel: text("package_label"),
  unitsPerPackage: integer("units_per_package"),
  // Cache derive de la somme des stock_movements — source de verite = stock_movements.
  currentStock: integer("current_stock").notNull().default(0),
  stockMinThreshold: integer("stock_min_threshold").notNull().default(5),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("products_org_idx").on(t.organizationId)]);

export const paymentMethodEnum = pgEnum("payment_method", paymentMethodValues);

// Clients a credit (carnet de dettes) — distinct des users/equipe.
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  note: text("note"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("customers_org_idx").on(t.organizationId)]);

// Session de caisse = service / shift : fond d'ouverture + clôture avec
// comptages par moyen de paiement (especes, MoMo…). Une seule session
// ouverte a la fois par bar.
export const cashSessionStatusEnum = pgEnum("cash_session_status", ["open", "closed"]);

export const cashSessions = pgTable("cash_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  status: cashSessionStatusEnum("status").notNull().default("open"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  openedByUserId: text("opened_by_user_id").notNull(),
  closedByUserId: text("closed_by_user_id"),
  // Fond de caisse (especes) au demarrage du service.
  openingFloat: numeric("opening_float", { precision: 12, scale: 2 }).notNull().default("0"),
  // Comptages saisis a la cloture (null tant que session ouverte).
  countedEspeces: numeric("counted_especes", { precision: 12, scale: 2 }),
  countedOrangeMoney: numeric("counted_orange_money", { precision: 12, scale: 2 }),
  countedMtnMomo: numeric("counted_mtn_momo", { precision: 12, scale: 2 }),
  countedWave: numeric("counted_wave", { precision: 12, scale: 2 }),
  countedCarteVirement: numeric("counted_carte_virement", { precision: 12, scale: 2 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("cash_sessions_org_status_idx").on(t.organizationId, t.status),
  uniqueIndex("cash_sessions_one_open_per_org").on(t.organizationId).where(sql`${t.status} = 'open'`),
]);

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  soldAt: timestamp("sold_at", { withTimezone: true }).notNull().defaultNow(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  // Obligatoire si paymentMethod = credit_client.
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  // Session de caisse active au moment de la vente (peut etre null si
  // aucune session ouverte — les ventes restent possibles).
  cashSessionId: uuid("cash_session_id").references(() => cashSessions.id, { onDelete: "set null" }),
  // Prix d'achat fige au moment de la vente : la marge d'une vente passee ne
  // doit pas changer quand le prix fournisseur de l'article evolue. Null
  // pour les ventes anterieures a ce champ (repli sur le prix courant).
  purchaseUnitPrice: numeric("purchase_unit_price", { precision: 12, scale: 2 }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  // Etiquette partagee par toutes les lignes d'un meme encaissement
  // multi-articles — pour les regrouper comme une facture a l'affichage.
  batchId: uuid("batch_id"),
  // Annulation tracee (jamais de suppression) — null = facture active.
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledByUserId: text("cancelled_by_user_id"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("sales_org_soldat_idx").on(t.organizationId, t.soldAt),
  index("sales_batch_idx").on(t.batchId),
  index("sales_customer_idx").on(t.customerId),
  index("sales_cash_session_idx").on(t.cashSessionId),
]);

// Encaissements de dettes clients (remboursements credit).
export const customerPayments = pgTable("customer_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  note: text("note"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  cashSessionId: uuid("cash_session_id").references(() => cashSessions.id, { onDelete: "set null" }),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("customer_payments_org_idx").on(t.organizationId),
  index("customer_payments_customer_idx").on(t.customerId),
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "initial",
  "entry",
  "sale_exit",
  "adjustment",
]);

// Toute variation de stock passe par ici, y compris celle generee automatiquement
// par une vente — c'est ce qui relie Ventes <-> Stock sans double saisie.
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  type: stockMovementTypeEnum("type").notNull(),
  quantityDelta: integer("quantity_delta").notNull(), // positif = entree, negatif = sortie
  referenceSaleId: uuid("reference_sale_id").references(() => sales.id, { onDelete: "set null" }),
  note: text("note"),
  // Etiquette de correlation (pas une FK) partagee par toutes les lignes
  // d'une meme saisie multi-articles, pour les regrouper a l'affichage.
  // Null pour les mouvements individuels (vente, stock initial).
  batchId: uuid("batch_id"),
  // Quand ce mouvement fait partie d'une annulation, pointe vers le
  // batchId du lot annule — sert a la fois de trace et de garde-fou
  // contre une double annulation.
  reversalOfBatchId: uuid("reversal_of_batch_id"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("stock_movements_org_product_idx").on(t.organizationId, t.productId),
  index("stock_movements_batch_idx").on(t.batchId),
]);

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull(),
  label: text("label").notNull(),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  frequency: text("frequency"),
  remark: text("remark"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("expenses_org_date_idx").on(t.organizationId, t.expenseDate),
]);

// Inventaire physique : session de comptage puis ecriture des ecarts.
export const inventorySessionStatusEnum = pgEnum("inventory_session_status", [
  "draft",
  "completed",
]);

export const inventorySessions = pgTable("inventory_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  status: inventorySessionStatusEnum("status").notNull().default("draft"),
  // Date métier du comptage (modifiable) — distincte de createdAt / completedAt.
  inventoryDate: timestamp("inventory_date", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  createdByUserId: text("created_by_user_id").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("inventory_sessions_org_idx").on(t.organizationId),
  index("inventory_sessions_org_date_idx").on(t.organizationId, t.inventoryDate),
  uniqueIndex("inventory_sessions_one_draft_per_org").on(t.organizationId).where(sql`${t.status} = 'draft'`),
]);

export const inventoryLines = pgTable("inventory_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => inventorySessions.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  theoreticalQty: integer("theoretical_qty").notNull(),
  countedQty: integer("counted_qty").notNull(),
  // counted - theoretical (negatif = manque)
  variance: integer("variance").notNull(),
}, (t) => [
  index("inventory_lines_session_idx").on(t.sessionId),
]);

// Fournisseurs + livraisons (receptions de stock avec cout).
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  note: text("note"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("suppliers_org_idx").on(t.organizationId)]);

export const supplierDeliveries = pgTable("supplier_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "restrict" }),
  deliveryDate: timestamp("delivery_date", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: paymentMethodEnum("payment_method"),
  // batchId des mouvements de stock generes par cette livraison.
  stockBatchId: uuid("stock_batch_id"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("supplier_deliveries_org_idx").on(t.organizationId),
  index("supplier_deliveries_supplier_idx").on(t.supplierId),
]);

export const supplierDeliveryLines = pgTable("supplier_delivery_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: uuid("delivery_id")
    .notNull()
    .references(() => supplierDeliveries.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
}, (t) => [index("supplier_delivery_lines_delivery_idx").on(t.deliveryId)]);
