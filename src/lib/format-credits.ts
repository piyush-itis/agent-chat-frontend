export function formatCredits(balance: number | undefined): string {
  if (balance == null || Number.isNaN(balance)) return "—";
  if (balance >= 1_000_000) return `${(balance / 1_000_000).toFixed(2)}M`;
  if (balance >= 1_000) return `${(balance / 1_000).toFixed(2)}K`;
  return String(balance);
}
