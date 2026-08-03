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
