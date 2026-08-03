// Tests d'integration : tournent contre la vraie base Neon de dev (pas de
// mock), via `pnpm test:integration`. Necessitent DATABASE_URL (charge
// depuis .env.local). Chaque test cree sa propre organisation ephemere et
// nettoie apres lui pour ne pas polluer les donnees de dev.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products } from "@/db/schema";
import { createSale } from "@/lib/sales";
import { HttpError } from "@/lib/http-errors";

const TEST_ORG_ID = `org_test_${Date.now()}`;
const TEST_USER_ID = "user_test_vitest";

async function createTestProduct(overrides: Partial<typeof products.$inferInsert> = {}) {
  const db = getDb();
  const [product] = await db
    .insert(products)
    .values({
      organizationId: TEST_ORG_ID,
      name: "Castel Beer 65cl (test)",
      unitPrice: "700",
      purchasePrice: "500",
      currentStock: 10,
      stockMinThreshold: 5,
      ...overrides,
    })
    .returning();
  return product;
}

beforeEach(async () => {
  const db = getDb();
  await db.insert(organizations).values({ id: TEST_ORG_ID, name: "Bar de test Vitest" });
});

afterEach(async () => {
  const db = getDb();
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_ID));
});

describe("createSale — le correctif du bug Ventes/Stock deconnectes", () => {
  it("decremente le stock du produit exactement de la quantite vendue", async () => {
    const product = await createTestProduct({ currentStock: 10 });

    await createSale({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      productId: product.id,
      quantity: 3,
      discount: 0,
      paymentMethod: "especes",
    });

    const db = getDb();
    const [updated] = await db.select().from(products).where(eq(products.id, product.id));
    expect(updated.currentStock).toBe(7);
  });

  it("calcule le CA brut, la remise et le CA net correctement", async () => {
    const product = await createTestProduct({ currentStock: 10, unitPrice: "700" });

    const sale = await createSale({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      productId: product.id,
      quantity: 3,
      discount: 200,
      paymentMethod: "especes",
    });

    expect(Number(sale.grossAmount)).toBe(2100);
    expect(Number(sale.netAmount)).toBe(1900);
  });

  it("refuse la vente si le stock est insuffisant, et NE decremente rien", async () => {
    const product = await createTestProduct({ currentStock: 2 });

    await expect(
      createSale({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        productId: product.id,
        quantity: 5,
        discount: 0,
        paymentMethod: "especes",
      })
    ).rejects.toBeInstanceOf(HttpError);

    const db = getDb();
    const [unchanged] = await db.select().from(products).where(eq(products.id, product.id));
    expect(unchanged.currentStock).toBe(2);
  });

  it("isole les organisations : une vente ne peut pas cibler le produit d'un autre bar", async () => {
    const otherOrgId = `org_test_other_${Date.now()}`;
    const db = getDb();
    await db.insert(organizations).values({ id: otherOrgId, name: "Autre bar" });
    const foreignProduct = await createTestProduct({ organizationId: otherOrgId });

    await expect(
      createSale({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        productId: foreignProduct.id,
        quantity: 1,
        discount: 0,
        paymentMethod: "especes",
      })
    ).rejects.toBeInstanceOf(HttpError);

    await db.delete(organizations).where(eq(organizations.id, otherOrgId));
  });
});
