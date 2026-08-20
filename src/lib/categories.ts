import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenseCategories, packageLabels, productCategories, unitLabels } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

export async function listProductCategories(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(productCategories)
    .where(eq(productCategories.organizationId, organizationId))
    .orderBy(productCategories.name);
}

export async function createProductCategory(organizationId: string, name: string) {
  const db = getDb();
  const [category] = await db
    .insert(productCategories)
    .values({ organizationId, name })
    .returning();
  return category;
}

export async function deleteProductCategory(organizationId: string, id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(productCategories)
    .where(and(eq(productCategories.id, id), eq(productCategories.organizationId, organizationId)))
    .returning();
  if (!deleted) throw new HttpError(404, "Categorie introuvable");
  return deleted;
}

export async function listExpenseCategories(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.organizationId, organizationId))
    .orderBy(expenseCategories.name);
}

export async function createExpenseCategory(organizationId: string, name: string) {
  const db = getDb();
  const [category] = await db
    .insert(expenseCategories)
    .values({ organizationId, name })
    .returning();
  return category;
}

export async function deleteExpenseCategory(organizationId: string, id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(expenseCategories)
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.organizationId, organizationId)))
    .returning();
  if (!deleted) throw new HttpError(404, "Categorie introuvable");
  return deleted;
}

export async function listUnitLabels(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(unitLabels)
    .where(eq(unitLabels.organizationId, organizationId))
    .orderBy(unitLabels.name);
}

export async function createUnitLabel(organizationId: string, name: string) {
  const db = getDb();
  const [label] = await db.insert(unitLabels).values({ organizationId, name }).returning();
  return label;
}

export async function deleteUnitLabel(organizationId: string, id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(unitLabels)
    .where(and(eq(unitLabels.id, id), eq(unitLabels.organizationId, organizationId)))
    .returning();
  if (!deleted) throw new HttpError(404, "Unité introuvable");
  return deleted;
}

export async function listPackageLabels(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(packageLabels)
    .where(eq(packageLabels.organizationId, organizationId))
    .orderBy(packageLabels.name);
}

export async function createPackageLabel(organizationId: string, name: string) {
  const db = getDb();
  const [label] = await db.insert(packageLabels).values({ organizationId, name }).returning();
  return label;
}

export async function deletePackageLabel(organizationId: string, id: string) {
  const db = getDb();
  const [deleted] = await db
    .delete(packageLabels)
    .where(and(eq(packageLabels.id, id), eq(packageLabels.organizationId, organizationId)))
    .returning();
  if (!deleted) throw new HttpError(404, "Format introuvable");
  return deleted;
}

export const DEFAULT_UNIT_LABELS = ["bouteille", "canette", "sachet", "verre", "bidon"];

export const DEFAULT_PACKAGE_LABELS = ["casier", "carton", "pack", "caisse", "fut"];

export const DEFAULT_PRODUCT_CATEGORIES = [
  "Bieres",
  "Vins",
  "Liqueurs & Spiritueux",
  "Sodas & Jus",
  "Eaux",
  "Cocktails",
  "Snacks",
  "Autres",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Loyer",
  "Salaires",
  "Electricite",
  "Achats boissons",
  "Achats snacks",
  "Telephone",
  "Entretien",
  "Autres",
];
