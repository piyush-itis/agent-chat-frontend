export function isTransientRealtimeError(error?: Error | null) {
  if (!error) return false;
  const text = `${error.name} ${error.message}`.toLowerCase();
  return text.includes("abort") || text.includes("cancel");
}
