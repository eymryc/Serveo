import { z } from "zod";
import { paymentMethodValues } from "@/db/schema";

export const paymentMethods = paymentMethodValues;

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid().optional().nullable(),
  unitPrice: z.coerce.number().nonnegative(),
  purchasePrice: z.coerce.number().nonnegative().default(0),
  initialStock: z.coerce.number().int().nonnegative().default(0),
  stockMinThreshold: z.coerce.number().int().nonnegative().default(5),
});

export const createSaleSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  discount: z.coerce.number().nonnegative().default(0),
  paymentMethod: z.enum(paymentMethods),
  soldAt: z.coerce.date().optional(),
});

export const createStockMovementSchema = z.object({
  type: z.enum(["entry", "adjustment"]),
  quantityDelta: z.coerce.number().int().refine((v) => v !== 0, "La quantite ne peut pas etre 0"),
  note: z.string().max(500).optional(),
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
