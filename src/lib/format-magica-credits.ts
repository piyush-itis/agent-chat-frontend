export function formatMagicaCredits(creditUsed: number | undefined): string {
  const units = typeof creditUsed === "number" && Number.isFinite(creditUsed) && creditUsed > 0 ? creditUsed : 0;
  return `${(units / 1_000_000).toFixed(2)}M credits`;
}
