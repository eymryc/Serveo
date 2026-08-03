import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products, stockMovements } from "@/db/schema";
import { createProduct, createStockMovement } from "@/lib/products";
import { HttpError } from "@/lib/http-errors";

const TEST_ORG_ID = `org_test_products_${Date.now()}`;
const TEST_USER_ID = "user_test_vitest";

beforeEach(async () => {
  const db = getDb();
  await db.insert(organizations).values({ id: TEST_ORG_ID, name: "Bar de test Vitest" });
});

afterEach(async () => {
  const db = getDb();
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_ID));
});

describe("createProduct", () => {
  it("cree un mouvement de stock 'initial' quand un stock de depart est fourni", async () => {
    const product = await createProduct({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      name: "Whisky J&B 70cl",
      unitPrice: 8000,
      purchasePrice: 6000,
      initialStock: 12,
      stockMinThreshold: 5,
    });

    expect(product.currentStock).toBe(12);

    const db = getDb();
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, product.id));

    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("initial");
    expect(movements[0].quantityDelta).toBe(12);
  });

  it("ne cree aucun mouvement quand le stock initial est 0", async () => {
    const product = await createProduct({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      name: "Article sans stock",
      unitPrice: 1000,
      purchasePrice: 500,
      initialStock: 0,
      stockMinThreshold: 5,
    });

    const db = getDb();
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, product.id));

    expect(movements).toHaveLength(0);
  });
});

describe("createStockMovement", () => {
  it("une entree augmente le stock courant du produit", async () => {
    const product = await createProduct({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      name: "Coca-Cola 33cl",
      unitPrice: 350,
      purchasePrice: 200,
      initialStock: 10,
      stockMinThreshold: 5,
    });

    await createStockMovement({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      productId: product.id,
      type: "entry",
      quantityDelta: 30,
    });

    const db = getDb();
    const [updated] = await db.select().from(products).where(eq(products.id, product.id));
    expect(updated.currentStock).toBe(40);
  });

  it("refuse un ajustement qui ferait passer le stock sous zero", async () => {
    const product = await createProduct({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      name: "Vin Rouge 75cl",
      unitPrice: 3500,
      purchasePrice: 2500,
      initialStock: 5,
      stockMinThreshold: 2,
    });

    await expect(
      createStockMovement({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        productId: product.id,
        type: "adjustment",
        quantityDelta: -10,
      })
    ).rejects.toBeInstanceOf(HttpError);

    const db = getDb();
    const [unchanged] = await db.select().from(products).where(eq(products.id, product.id));
    expect(unchanged.currentStock).toBe(5);
  });
});
