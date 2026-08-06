import { describe, expect, it } from "vitest";
import {
  createExpenseSchema,
  createProductSchema,
  createSaleSchema,
  createStockMovementSchema,
} from "@/lib/validation";

describe("createSaleSchema", () => {
  it("accepts a valid sale payload", () => {
    const result = createSaleSchema.safeParse({
      productId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      quantity: 2,
      discount: 100,
      paymentMethod: "orange_money",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative quantity — a sale must move at least one unit", () => {
    expect(createSaleSchema.safeParse({
      productId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      quantity: 0,
      paymentMethod: "especes",
    }).success).toBe(false);

    expect(createSaleSchema.safeParse({
      productId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      quantity: -1,
      paymentMethod: "especes",
    }).success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    const result = createSaleSchema.safeParse({
      productId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      quantity: 1,
      paymentMethod: "bitcoin",
    });
    expect(result.success).toBe(false);
  });

  it("defaults discount to 0 when omitted", () => {
    const result = createSaleSchema.parse({
      productId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      quantity: 1,
      paymentMethod: "especes",
    });
    expect(result.discount).toBe(0);
  });
});

describe("createProductSchema", () => {
  it("rejects a negative unit price", () => {
    const result = createProductSchema.safeParse({
      name: "Castel Beer 65cl",
      unitPrice: -700,
    });
    expect(result.success).toBe(false);
  });

  it("defaults stockMinThreshold to 5, matching the form's default alert threshold", () => {
    const result = createProductSchema.parse({ name: "Heineken 33cl", unitPrice: 600 });
    expect(result.stockMinThreshold).toBe(5);
  });

  it("rejects an unknown unitLabel or packageLabel", () => {
    expect(
      createProductSchema.safeParse({
        name: "Heineken 33cl",
        unitPrice: 600,
        unitLabel: "tonneau",
      }).success
    ).toBe(false);

    expect(
      createProductSchema.safeParse({
        name: "Heineken 33cl",
        unitPrice: 600,
        packageLabel: "palette",
      }).success
    ).toBe(false);
  });
});

describe("createStockMovementSchema", () => {
  it("rejects a zero quantity delta — a movement must actually move stock", () => {
    const result = createStockMovementSchema.safeParse({ type: "entry", quantityDelta: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts a negative delta for adjustments when a note explains why (e.g. breakage/loss)", () => {
    const result = createStockMovementSchema.safeParse({
      type: "adjustment",
      quantityDelta: -3,
      note: "Casse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative delta without a note — a stock exit must be explained", () => {
    const result = createStockMovementSchema.safeParse({ type: "adjustment", quantityDelta: -3 });
    expect(result.success).toBe(false);
  });

  it("accepts an optional occurredAt to backdate a movement", () => {
    const result = createStockMovementSchema.safeParse({
      type: "entry",
      quantityDelta: 12,
      occurredAt: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("createExpenseSchema", () => {
  it("rejects a zero or negative amount", () => {
    expect(createExpenseSchema.safeParse({
      expenseDate: "2026-01-01",
      label: "Loyer",
      category: "Loyer",
      amount: 0,
      paymentMethod: "especes",
    }).success).toBe(false);
  });

  it("accepts a valid expense", () => {
    const result = createExpenseSchema.safeParse({
      expenseDate: "2026-01-01",
      label: "Loyer mensuel",
      category: "Loyer",
      amount: 150000,
      paymentMethod: "especes",
    });
    expect(result.success).toBe(true);
  });
});
