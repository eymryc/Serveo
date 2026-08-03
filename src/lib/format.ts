export function formatFcfa(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}
