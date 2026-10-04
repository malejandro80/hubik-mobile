import { CONTEXTUAL_CATASTRO_SKIP_PATTERN, EXPLICIT_CATASTRO_SKIP_PATTERN } from './catastroSkipConstants.ts';

export function extractCatastroSkip(text: string, isOnlyCatastroRemaining: boolean): boolean {
  const lower = text.toLowerCase().trim();
  if (EXPLICIT_CATASTRO_SKIP_PATTERN.test(lower)) return true;
  return isOnlyCatastroRemaining && CONTEXTUAL_CATASTRO_SKIP_PATTERN.test(lower);
}
