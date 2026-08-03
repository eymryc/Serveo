// Espace normal en separateur de milliers plutot que l'espace fine
// insecable (U+202F) que produit toLocaleString("fr-FR") — invisible a
// l'oeil mais source de bugs de recherche/copier-coller.
export function formatFcfa(amount: number) {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} FCFA`;
}

export function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}
