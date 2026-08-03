import { describe, expect, it } from "vitest";
import {
  computeAvgTicket,
  computeGoalProgressPct,
  computeMarginPct,
  computeNetProfit,
  withPercentages,
} from "@/lib/dashboard-math";

describe("withPercentages", () => {
  it("computes a real percentage per row instead of the frozen 0.0% from the original sheet", () => {
    const rows = [
      { category: "Bieres", amount: 28600 },
      { category: "Sodas & Jus", amount: 7300 },
    ];
    const result = withPercentages(rows, 35900);
    expect(result[0].percentage).toBeCloseTo(79.665, 2);
    expect(result[1].percentage).toBeCloseTo(20.334, 2);
  });

  it("returns 0% for every row when the total is zero, instead of dividing by zero", () => {
    const rows = [{ category: "Bieres", amount: 0 }];
    const result = withPercentages(rows, 0);
    expect(result[0].percentage).toBe(0);
  });
});

describe("computeNetProfit / computeMarginPct — same-period comparison", () => {
  it("reproduces the original sheet's bug scenario: 5 days of sales vs a full month of expenses", () => {
    // CA Net = 44 300, Charges (mois entier) = 363 500 -> le PDF affichait
    // -720.5% car les periodes n'etaient pas alignees. On verifie juste
    // que la formule elle-meme est correcte pour ces montants.
    const netProfit = computeNetProfit(44300, 363500);
    expect(netProfit).toBe(-319200);
    expect(computeMarginPct(44300, netProfit)).toBeCloseTo(-720.541, 2);
  });

  it("returns null margin when there is no revenue yet, instead of -Infinity or NaN", () => {
    expect(computeMarginPct(0, -50000)).toBeNull();
  });

  it("computes a positive margin when revenue exceeds expenses", () => {
    const netProfit = computeNetProfit(500000, 300000);
    expect(computeMarginPct(500000, netProfit)).toBeCloseTo(40, 5);
  });
});

describe("computeGoalProgressPct — replaces the hardcoded 'EN COURS' badge", () => {
  it("computes real progress against the monthly target", () => {
    expect(computeGoalProgressPct(44300, 500000)).toBeCloseTo(8.86, 2);
  });

  it("returns null when no target is configured, instead of a misleading 0%", () => {
    expect(computeGoalProgressPct(44300, null)).toBeNull();
  });

  it("returns null for a zero or negative target", () => {
    expect(computeGoalProgressPct(44300, 0)).toBeNull();
  });
});

describe("computeAvgTicket", () => {
  it("divides net revenue by sales count", () => {
    expect(computeAvgTicket(44300, 12)).toBeCloseTo(3691.67, 2);
  });

  it("returns 0 when there are no sales, instead of dividing by zero", () => {
    expect(computeAvgTicket(0, 0)).toBe(0);
  });
});
