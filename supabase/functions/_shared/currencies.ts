export const SUPPORTED_CURRENCIES = ['USD', 'VES', 'EUR'] as const;
export const DEFAULT_CURRENCY = 'USD';

export function normalizeCurrency(value: unknown): string {
  const upper = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper) ? upper : DEFAULT_CURRENCY;
}
