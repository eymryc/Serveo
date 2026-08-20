import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  expenseCategories,
  packageLabels,
  productCategories,
  products,
  unitLabels,
} from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

async function assertUniqueName(
  table:
    | typeof productCategories
    | typeof expenseCategories
    | typeof unitLabels
    | typeof packageLabels,
  organizationId: string,
  name: string,
  excludeId?: string
) {
  const db = getDb();
  const conditions = [eq(table.organizationId, organizationId), eq(table.name, name)];
  if (excludeId) conditions.push(ne(table.id, excludeId));
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(...conditions))
    .limit(1);
  if (existing) throw new HttpError(409, "Ce nom existe deja");
}

export async function listProductCategories(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(productCategories)
    .where(eq(productCategories.organizationId, organizationId))
    .orderBy(productCategories.name);
}

export async function createProductCategory(organizationId: string, name: string) {
  await assertUniqueName(productCategories, organizationId, name);
  const db = getDb();
  const [category] = await db
    .insert(productCategories)
    .values({ organizationId, name })
    .returning();
  return category;
}

export async function updateProductCategory(organizationId: string, id: string, name: string) {
  await assertUniqueName(productCategories, organizationId, name, id);
  const db = getDb();
  const [updated] = await db
    .update(productCategories)
    .set({ name })
    .where(and(eq(productCategories.id, id), eq(productCategories.organizationId, organizationId)))
    .returning();
  if (!updated) throw new HttpError(404, "Categorie introuvable");
  return updated;
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
  await assertUniqueName(expenseCategories, organizationId, name);
  const db = getDb();
  const [category] = await db
    .insert(expenseCategories)
    .values({ organizationId, name })
    .returning();
  return category;
}

export async function updateExpenseCategory(organizationId: string, id: string, name: string) {
  await assertUniqueName(expenseCategories, organizationId, name, id);
  const db = getDb();
  const [updated] = await db
    .update(expenseCategories)
    .set({ name })
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.organizationId, organizationId)))
    .returning();
  if (!updated) throw new HttpError(404, "Categorie introuvable");
  return updated;
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
  await assertUniqueName(unitLabels, organizationId, name);
  const db = getDb();
  const [label] = await db.insert(unitLabels).values({ organizationId, name }).returning();
  return label;
}

export async function updateUnitLabel(organizationId: string, id: string, name: string) {
  await assertUniqueName(unitLabels, organizationId, name, id);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(unitLabels)
    .where(and(eq(unitLabels.id, id), eq(unitLabels.organizationId, organizationId)))
    .limit(1);
  if (!existing) throw new HttpError(404, "Unité introuvable");

  const [updated] = await db
    .update(unitLabels)
    .set({ name })
    .where(and(eq(unitLabels.id, id), eq(unitLabels.organizationId, organizationId)))
    .returning();

  // Les produits stockent unitLabel en texte — propager le renommage au bar.
  if (existing.name !== name) {
    await db
      .update(products)
      .set({ unitLabel: name })
      .where(and(eq(products.organizationId, organizationId), eq(products.unitLabel, existing.name)));
  }

  return updated;
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
  await assertUniqueName(packageLabels, organizationId, name);
  const db = getDb();
  const [label] = await db.insert(packageLabels).values({ organizationId, name }).returning();
  return label;
}

export async function updatePackageLabel(organizationId: string, id: string, name: string) {
  await assertUniqueName(packageLabels, organizationId, name, id);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(packageLabels)
    .where(and(eq(packageLabels.id, id), eq(packageLabels.organizationId, organizationId)))
    .limit(1);
  if (!existing) throw new HttpError(404, "Format introuvable");

  const [updated] = await db
    .update(packageLabels)
    .set({ name })
    .where(and(eq(packageLabels.id, id), eq(packageLabels.organizationId, organizationId)))
    .returning();

  if (existing.name !== name) {
    await db
      .update(products)
      .set({ packageLabel: name })
      .where(
        and(eq(products.organizationId, organizationId), eq(products.packageLabel, existing.name))
      );
  }

  return updated;
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
