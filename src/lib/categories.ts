import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenseCategories, productCategories } from "@/db/schema";
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
