/**
 * Format a price value for display.
 * Hides ".00" cents for whole dollar amounts, shows real cents like ".50".
 */
export function formatPrice(amount: number): string {
  const hasRealCents = amount % 1 !== 0;
  return hasRealCents ? `$${amount.toFixed(2)}` : `$${Math.round(amount)}`;
}

/**
 * Parse a string/number price and format it.
 * Returns "Contact for pricing" if null/undefined/0.
 */
export function formatPriceValue(value: string | number | null | undefined): string {
  if (!value) return "Contact for pricing";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "Contact for pricing";
  return formatPrice(num);
}
