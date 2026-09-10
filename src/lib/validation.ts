import { z } from "zod";
import { paymentMethodValues } from "@/db/schema";

export const paymentMethods = paymentMethodValues;

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid().optional().nullable(),
  unitPrice: z.coerce.number().nonnegative(),
  purchasePrice: z.coerce.number().nonnegative().default(0),
  // Le stock reste toujours compte en unites (unitLabel : "bouteille",
  // "sachet"...). packageLabel/unitsPerPackage ne decrivent que le
  // format d'achat fournisseur (ex: "casier" de 24) pour convertir les
  // receptions de stock — la vente reste toujours a l'unite. Les valeurs
  // possibles sont propres a chaque bar (cf. tables unit_labels/
  // package_labels), donc validees comme du texte libre ici plutot
  // qu'un enum fixe.
  unitLabel: z.string().min(1).max(50).default("bouteille"),
  packageLabel: z.string().min(1).max(50).optional().nullable(),
  unitsPerPackage: z.coerce.number().int().positive().optional().nullable(),
  initialStock: z.coerce.number().int().nonnegative().default(0),
  stockMinThreshold: z.coerce.number().int().nonnegative().default(5),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  unitLabel: z.string().min(1).max(50).optional(),
  packageLabel: z.string().min(1).max(50).nullable().optional(),
  unitsPerPackage: z.coerce.number().int().positive().nullable().optional(),
  stockMinThreshold: z.coerce.number().int().nonnegative().optional(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

export const createSaleSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  discount: z.coerce.number().nonnegative().default(0),
  paymentMethod: z.enum(paymentMethods),
  soldAt: z.coerce.date().optional(),
  batchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional().nullable(),
});

export const createStockMovementSchema = z
  .object({
    type: z.enum(["entry", "adjustment"]),
    quantityDelta: z.coerce.number().int().refine((v) => v !== 0, "La quantite ne peut pas etre 0"),
    note: z.string().max(500).optional(),
    // Permet de dater un mouvement passe (ex: casse constatee hier) plutot
    // que de forcer la date de saisie. Absent = maintenant.
    occurredAt: z.coerce.date().optional(),
    // Etiquette partagee par toutes les lignes d'une meme saisie
    // multi-articles (generee cote client), pour les regrouper a l'affichage.
    batchId: z.string().uuid().optional(),
  })
  .refine((v) => v.quantityDelta > 0 || !!v.note?.trim(), {
    message: "Un motif est requis pour une sortie de stock",
    path: ["note"],
  });

export const createExpenseSchema = z.object({
  expenseDate: z.coerce.date(),
  label: z.string().min(1).max(200),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(paymentMethods),
  frequency: z.string().max(50).optional(),
  remark: z.string().max(500).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  currency: z.string().max(10).optional(),
  monthlyRevenueTarget: z.coerce.number().nonnegative().optional(),
  monthlyMarginTargetPct: z.coerce.number().min(0).max(100).optional(),
  defaultStockAlertThreshold: z.coerce.number().int().nonnegative().optional(),
  activePaymentMethods: z.array(z.enum(paymentMethods)).min(1).optional(),
  memberCanCancelSales: z.coerce.number().int().min(0).max(1).optional(),
});

export const openCashSessionSchema = z.object({
  openingFloat: z.coerce.number().nonnegative().default(0),
  /** Si omis → maintenant. Utile pour ouvrir "en retard" le matin. */
  openedAt: z.coerce.date().optional(),
});

export const closeCashSessionSchema = z.object({
  countedEspeces: z.coerce.number().nonnegative(),
  countedOrangeMoney: z.coerce.number().nonnegative(),
  countedMtnMomo: z.coerce.number().nonnegative(),
  countedWave: z.coerce.number().nonnegative(),
  countedCarteVirement: z.coerce.number().nonnegative(),
  note: z.string().max(500).optional(),
  /** Si omis → maintenant. */
  closedAt: z.coerce.date().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

const repayPaymentMethods = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
] as const;

export const createCustomerPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(repayPaymentMethods),
  note: z.string().max(500).optional().nullable(),
  paidAt: z.coerce.date().optional(),
});

export const createInventorySessionSchema = z.object({
  note: z.string().max(500).optional().nullable(),
});

export const updateInventoryCountsSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        countedQty: z.coerce.number().int().nonnegative(),
      })
    )
    .min(1),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

export const createSupplierDeliverySchema = z.object({
  supplierId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().nonnegative().default(0),
      })
    )
    .min(1),
  paidAmount: z.coerce.number().nonnegative().default(0),
  paymentMethod: z.enum(paymentMethods).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  deliveryDate: z.coerce.date().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^[0-9+ ()-]+$/, "Numero de telephone invalide");

export const registerSchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  phone: phoneSchema,
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
});

const teamRoleValues = ["admin", "member"] as const;

export const createTeamMemberSchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  phone: phoneSchema,
  password: z.string().min(8).max(200),
  role: z.enum(teamRoleValues).default("member"),
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(teamRoleValues),
});

export const adminUpdateOrganizationSchema = z.object({
  isActive: z.coerce.number().int().min(0).max(1).optional(),
  name: z.string().min(1).max(200).optional(),
  city: z.string().max(200).optional().nullable(),
});

export const adminCreateUserSchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  phone: phoneSchema,
  password: z.string().min(8).max(200),
  role: z.enum(teamRoleValues).default("member"),
  organizationId: z.string().uuid().nullable().optional(),
  isPlatformAdmin: z.coerce.number().int().min(0).max(1).optional(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

export const adminUpdateUserSchema = z.object({
  isActive: z.coerce.number().int().min(0).max(1).optional(),
  isPlatformAdmin: z.coerce.number().int().min(0).max(1).optional(),
  role: z.enum(teamRoleValues).optional(),
  password: z.string().min(8).max(200).optional(),
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().min(1).max(200).optional(),
  phone: phoneSchema.optional(),
  organizationId: z.string().uuid().nullable().optional(),
});
