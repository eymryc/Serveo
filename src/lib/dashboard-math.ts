// Fonctions pures (pas de DB, pas d'auth) — c'est ici que sont corriges les
// bugs de calcul releves dans le template Sheets d'origine (pourcentages a
// 0.0% fige, marge negative absurde car periodes non alignees, objectif
// code en dur). Isolees pour etre testees sans dependance a la base.

import type { PeriodPreset, PeriodSelection } from "@/lib/types";

export type { PeriodKey, PeriodPreset, PeriodSelection } from "@/lib/types";

export function withPercentages<T extends { amount: number }>(rows: T[], total: number) {
  return rows.map((r) => ({
    ...r,
    percentage: total > 0 ? (r.amount / total) * 100 : 0,
  }));
}

export function computeNetProfit(netRevenue: number, totalExpenses: number) {
  return netRevenue - totalExpenses;
}

export function computeProductProfit(revenue: number, cogs: number) {
  return revenue - cogs;
}

export function computeMarginPct(netRevenue: number, netProfit: number): number | null {
  if (netRevenue <= 0) return null;
  return (netProfit / netRevenue) * 100;
}

export function computeGoalProgressPct(netRevenue: number, target: number | null): number | null {
  if (!target || target <= 0) return null;
  return (netRevenue / target) * 100;
}

export function computeAvgTicket(netRevenue: number, salesCount: number) {
  if (salesCount <= 0) return 0;
  return netRevenue / salesCount;
}

export type Granularity = "hour" | "day" | "month";

export const DEFAULT_PERIOD_SELECTION: PeriodSelection = { preset: "month" };

export function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInput(value: string) {
  const [y, m, day] = value.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function defaultCustomPeriod(now: Date = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    customFrom: toDateInputValue(from),
    customTo: toDateInputValue(now),
  };
}

// Cote d'Ivoire est en UTC+0 toute l'annee (pas d'heure d'ete) : les
// dates serveur (UTC) correspondent directement a l'heure locale, pas de
// conversion de fuseau necessaire ici.
export function resolvePeriod(key: PeriodPreset, now: Date = new Date()) {
  const to = now;
  let from: Date;

  switch (key) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week": {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      break;
    }
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from, to };
}

export function granularityFor(key: PeriodPreset): Granularity {
  if (key === "today") return "hour";
  if (key === "year") return "month";
  return "day";
}

export function granularityForRange(from: Date, to: Date): Granularity {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 1.5) return "hour";
  if (days <= 92) return "day";
  return "month";
}

export function resolvePeriodSelection(selection: PeriodSelection, now: Date = new Date()) {
  if (selection.preset === "custom" && selection.customFrom && selection.customTo) {
    let from = startOfDay(parseDateInput(selection.customFrom));
    let to = endOfDay(parseDateInput(selection.customTo));
    if (from.getTime() > to.getTime()) {
      [from, to] = [startOfDay(parseDateInput(selection.customTo)), endOfDay(parseDateInput(selection.customFrom))];
    }
    return {
      from,
      to,
      key: "custom" as const,
      granularity: granularityForRange(from, to),
    };
  }

  const preset = selection.preset === "custom" ? "month" : selection.preset;
  const { from, to } = resolvePeriod(preset, now);
  return { from, to, key: preset, granularity: granularityFor(preset) };
}

export function periodSelectionQuery(selection: PeriodSelection) {
  const { from, to, key } = resolvePeriodSelection(selection);
  const params = new URLSearchParams();
  if (key === "custom") {
    params.set("from", from.toISOString());
    params.set("to", to.toISOString());
  } else {
    params.set("period", key);
  }
  return params;
}

export function formatPeriodLabel(selection: PeriodSelection, now: Date = new Date()) {
  const { from, to } = resolvePeriodSelection(selection, now);
  return `${from.toLocaleDateString("fr-FR")} — ${to.toLocaleDateString("fr-FR")}`;
}

function startOfBucket(d: Date, granularity: Granularity) {
  if (granularity === "hour") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());
  }
  if (granularity === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return startOfDay(d);
}

function advanceBucket(d: Date, granularity: Granularity) {
  if (granularity === "hour") {
    return new Date(d.getTime() + 60 * 60 * 1000);
  }
  if (granularity === "month") {
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

function bucketKey(d: Date, granularity: Granularity) {
  return startOfBucket(d, granularity).getTime();
}

export function generateTimeSeriesBuckets(from: Date, to: Date, granularity: Granularity) {
  const buckets: Date[] = [];
  let cursor = startOfBucket(from, granularity);
  const end = to.getTime();
  while (cursor.getTime() <= end) {
    buckets.push(new Date(cursor));
    cursor = advanceBucket(cursor, granularity);
  }
  return buckets;
}

/** Complete la serie avec des buckets a 0 pour dessiner une courbe sur toute la periode. */
export function fillTimeSeries(
  raw: { bucket: string; net: number }[],
  from: Date,
  to: Date,
  granularity: Granularity
) {
  const totals = new Map<number, number>();
  for (const row of raw) {
    const key = bucketKey(new Date(row.bucket), granularity);
    totals.set(key, (totals.get(key) ?? 0) + row.net);
  }

  return generateTimeSeriesBuckets(from, to, granularity).map((bucket) => {
    const key = bucketKey(bucket, granularity);
    return {
      bucket: new Date(key).toISOString(),
      net: totals.get(key) ?? 0,
    };
  });
}

// Periode precedente de meme duree, immediatement avant — comparaison
// approximative mais honnete (un mois de 28 jours vs un de 31 n'est pas
// exact, mais reste un ordre de grandeur utile pour une buvette).
export function previousPeriod(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - duration), to: new Date(from.getTime()) };
}

// null = pas de base de comparaison (periode precedente a 0) plutot
// qu'un pourcentage infini illisible.
export function computeDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
