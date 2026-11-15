// Tests d'integration : tournent contre un vrai Postgres local jetable
// (pas de mock), via `pnpm test:integration` — cf. src/test/integration-db.ts.
// Chaque test cree sa propre organisation ephemere et nettoie apres lui.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, products, sales, stockMovements } from "@/db/schema";
import { createSale, createSaleBatch, cancelSaleBatch } from "@/lib/sales";
import { HttpError } from "@/lib/http-errors";

const TEST_ORG_ID = crypto.randomUUID();
const TEST_USER_ID = crypto.randomUUID();

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
    const otherOrgId = crypto.randomUUID();
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

describe("cancelSaleBatch", () => {
  it("marque la facture annulee et restocke les articles", async () => {
    const product = await createTestProduct({ currentStock: 10 });
    const batchId = crypto.randomUUID();

    await createSale({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      productId: product.id,
      quantity: 3,
      discount: 0,
      paymentMethod: "especes",
      batchId,
    });

    const cancelled = await cancelSaleBatch({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      batchKey: batchId,
    });

    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].cancelledAt).toBeTruthy();

    const db = getDb();
    const [updated] = await db.select().from(products).where(eq(products.id, product.id));
    expect(updated.currentStock).toBe(10);

    await expect(
      cancelSaleBatch({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        batchKey: batchId,
      })
    ).rejects.toBeInstanceOf(HttpError);
  });
});

async function currentStock(productId: string) {
  const [row] = await getDb().select().from(products).where(eq(products.id, productId));
  return row.currentStock;
}

async function batchSales(batchId: string) {
  return getDb()
    .select()
    .from(sales)
    .where(and(eq(sales.organizationId, TEST_ORG_ID), eq(sales.batchId, batchId)));
}

describe("createSaleBatch — facture atomique et idempotente", () => {
  it("enregistre toutes les lignes, decremente le stock et fige le prix d'achat", async () => {
    const beer = await createTestProduct({ currentStock: 10, purchasePrice: "500" });
    const soda = await createTestProduct({ name: "Coca 33cl (test)", currentStock: 5, unitPrice: "500", purchasePrice: "300" });
    const batchId = crypto.randomUUID();

    const result = await createSaleBatch({
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      batchId,
      paymentMethod: "especes",
      lines: [
        { productId: beer.id, quantity: 2, discount: 0 },
        { productId: soda.id, quantity: 1, discount: 100 },
      ],
    });

    expect(result.replayed).toBe(false);
    expect(result.sales).toHaveLength(2);
    expect(result.sales[0]).not.toHaveProperty("purchaseUnitPrice");
    expect(await currentStock(beer.id)).toBe(8);
    expect(await currentStock(soda.id)).toBe(4);

    const rows = await batchSales(batchId);
    expect(rows.map((r) => r.purchaseUnitPrice).sort()).toEqual(["300.00", "500.00"]);
    expect(rows.find((r) => r.productId === soda.id)?.netAmount).toBe("400.00");
  });

  it("ne cree rien si une seule ligne est en stock insuffisant (tout ou rien)", async () => {
    const beer = await createTestProduct({ currentStock: 10 });
    const rare = await createTestProduct({ name: "Champagne (test)", currentStock: 1 });
    const batchId = crypto.randomUUID();

    await expect(
      createSaleBatch({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        batchId,
        paymentMethod: "especes",
        lines: [
          { productId: beer.id, quantity: 3, discount: 0 },
          { productId: rare.id, quantity: 2, discount: 0 },
        ],
      })
    ).rejects.toMatchObject({ status: 409 });

    expect(await batchSales(batchId)).toHaveLength(0);
    expect(await currentStock(beer.id)).toBe(10);
    expect(await currentStock(rare.id)).toBe(1);
  });

  it("additionne les lignes du meme article avant de verifier le stock", async () => {
    const beer = await createTestProduct({ currentStock: 3 });

    await expect(
      createSaleBatch({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        batchId: crypto.randomUUID(),
        paymentMethod: "especes",
        lines: [
          { productId: beer.id, quantity: 2, discount: 0 },
          { productId: beer.id, quantity: 2, discount: 0 },
        ],
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(await currentStock(beer.id)).toBe(3);
  });

  it("un renvoi du meme batchId ne vend pas deux fois, meme en parallele", async () => {
    const beer = await createTestProduct({ currentStock: 10 });
    const input = {
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      batchId: crypto.randomUUID(),
      paymentMethod: "especes",
      lines: [{ productId: beer.id, quantity: 2, discount: 0 }],
    };

    const results = await Promise.all([createSaleBatch(input), createSaleBatch(input), createSaleBatch(input)]);

    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(results.every((r) => r.sales.length === 1)).toBe(true);
    expect(await batchSales(input.batchId)).toHaveLength(1);
    expect(await currentStock(beer.id)).toBe(8);
  });

  it("deux caisses qui vendent le dernier article en meme temps : une seule passe", async () => {
    const beer = await createTestProduct({ currentStock: 1 });
    const sell = () =>
      createSaleBatch({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        batchId: crypto.randomUUID(),
        paymentMethod: "especes",
        lines: [{ productId: beer.id, quantity: 1, discount: 0 }],
      });

    const outcomes = await Promise.allSettled([sell(), sell(), sell(), sell()]);

    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(await currentStock(beer.id)).toBe(0);
    const movements = await getDb().select().from(stockMovements).where(eq(stockMovements.productId, beer.id));
    expect(movements).toHaveLength(1);
  });
});
