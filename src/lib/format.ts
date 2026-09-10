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

/**
 * Champ date HTML optionnel (`YYYY-MM-DD`).
 * Vide → undefined (le serveur utilise maintenant).
 * Rempli → ISO avec l'heure courante sur le jour choisi.
 */
export function optionalDateInputToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}
