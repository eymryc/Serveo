import { z } from "zod";
import {
  packageLabelValues,
  paymentMethodValues,
  unitLabelValues,
} from "@/db/schema";

export const paymentMethods = paymentMethodValues;
export const unitLabels = unitLabelValues;
export const packageLabels = packageLabelValues;

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid().optional().nullable(),
  unitPrice: z.coerce.number().nonnegative(),
  purchasePrice: z.coerce.number().nonnegative().default(0),
  // Le stock reste toujours compte en unites (unitLabel : "bouteille",
  // "sachet"...). packageLabel/unitsPerPackage ne decrivent que le
  // format d'achat fournisseur (ex: "casier" de 24) pour convertir les
  // receptions de stock — la vente reste toujours a l'unite.
  unitLabel: z.enum(unitLabelValues).default("bouteille"),
  packageLabel: z.enum(packageLabelValues).optional().nullable(),
  unitsPerPackage: z.coerce.number().int().positive().optional().nullable(),
  initialStock: z.coerce.number().int().nonnegative().default(0),
  stockMinThreshold: z.coerce.number().int().nonnegative().default(5),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  unitLabel: z.enum(unitLabelValues).optional(),
  packageLabel: z.enum(packageLabelValues).nullable().optional(),
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
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});
