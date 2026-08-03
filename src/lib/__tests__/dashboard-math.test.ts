import { describe, expect, it } from "vitest";
import {
  computeAvgTicket,
  computeDeltaPct,
  computeGoalProgressPct,
  computeMarginPct,
  computeNetProfit,
  granularityFor,
  previousPeriod,
  resolvePeriod,
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

describe("resolvePeriod", () => {
  it("'today' starts at local midnight", () => {
    const now = new Date(2026, 7, 3, 14, 30); // 3 aout 2026, 14h30
    const { from, to } = resolvePeriod("today", now);
    expect(from).toEqual(new Date(2026, 7, 3, 0, 0, 0, 0));
    expect(to).toBe(now);
  });

  it("'week' starts on Monday, even when 'now' is a Sunday", () => {
    // 2 aout 2026 est un dimanche
    const sunday = new Date(2026, 7, 2, 10, 0);
    const { from } = resolvePeriod("week", sunday);
    expect(from).toEqual(new Date(2026, 6, 27, 0, 0, 0, 0)); // lundi 27 juillet
  });

  it("'week' starting mid-week rolls back to the same Monday", () => {
    const wednesday = new Date(2026, 7, 5, 9, 0); // mercredi 5 aout 2026
    const { from } = resolvePeriod("week", wednesday);
    expect(from).toEqual(new Date(2026, 7, 3, 0, 0, 0, 0)); // lundi 3 aout
  });

  it("'month' starts on the 1st", () => {
    const { from } = resolvePeriod("month", new Date(2026, 7, 20));
    expect(from).toEqual(new Date(2026, 7, 1, 0, 0, 0, 0));
  });

  it("'year' starts on January 1st", () => {
    const { from } = resolvePeriod("year", new Date(2026, 7, 20));
    expect(from).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
  });
});

describe("granularityFor", () => {
  it("maps each period to the right time-series bucket size", () => {
    expect(granularityFor("today")).toBe("hour");
    expect(granularityFor("week")).toBe("day");
    expect(granularityFor("month")).toBe("day");
    expect(granularityFor("year")).toBe("month");
  });
});

describe("previousPeriod", () => {
  it("returns an equal-length window immediately before 'from'", () => {
    const from = new Date(2026, 7, 1);
    const to = new Date(2026, 7, 15);
    const prev = previousPeriod(from, to);
    expect(prev.to).toEqual(from);
    expect(prev.from).toEqual(new Date(2026, 6, 18)); // 14 jours avant le 1er aout
  });
});

describe("computeDeltaPct", () => {
  it("computes a signed percentage change vs the previous period", () => {
    expect(computeDeltaPct(120, 100)).toBeCloseTo(20, 5);
    expect(computeDeltaPct(80, 100)).toBeCloseTo(-20, 5);
  });

  it("returns null instead of +Infinity% when the previous period had zero revenue", () => {
    expect(computeDeltaPct(500, 0)).toBeNull();
  });

  it("returns 0 when both periods are zero, not null", () => {
    expect(computeDeltaPct(0, 0)).toBe(0);
  });
});
