// Fonctions pures (pas de DB, pas d'auth) — c'est ici que sont corriges les
// bugs de calcul releves dans le template Sheets d'origine (pourcentages a
// 0.0% fige, marge negative absurde car periodes non alignees, objectif
// code en dur). Isolees pour etre testees sans dependance a la base.

export function withPercentages<T extends { amount: number }>(rows: T[], total: number) {
  return rows.map((r) => ({
    ...r,
    percentage: total > 0 ? (r.amount / total) * 100 : 0,
  }));
}

export function computeNetProfit(netRevenue: number, totalExpenses: number) {
  return netRevenue - totalExpenses;
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

export type PeriodKey = "today" | "week" | "month" | "year";
export type Granularity = "hour" | "day" | "month";

// Cote d'Ivoire est en UTC+0 toute l'annee (pas d'heure d'ete) : les
// dates serveur (UTC) correspondent directement a l'heure locale, pas de
// conversion de fuseau necessaire ici.
export function resolvePeriod(key: PeriodKey, now: Date = new Date()) {
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

export function granularityFor(key: PeriodKey): Granularity {
  if (key === "today") return "hour";
  if (key === "year") return "month";
  return "day";
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
