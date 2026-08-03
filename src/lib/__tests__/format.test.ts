import { describe, expect, it } from "vitest";
import { formatFcfa, formatPercent } from "@/lib/format";

describe("formatFcfa", () => {
  it("formats with french thousands separators and rounds to the unit", () => {
    expect(formatFcfa(44300)).toBe("44 300 FCFA");
  });

  it("rounds decimals", () => {
    expect(formatFcfa(1234.6)).toBe("1 235 FCFA");
  });

  it("handles zero", () => {
    expect(formatFcfa(0)).toBe("0 FCFA");
  });
});

describe("formatPercent", () => {
  it("formats to one decimal", () => {
    expect(formatPercent(41.234)).toBe("41.2%");
  });

  it("renders an em dash for null (no target configured)", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("handles negative percentages (e.g. a loss margin)", () => {
    expect(formatPercent(-720.5)).toBe("-720.5%");
  });
});
