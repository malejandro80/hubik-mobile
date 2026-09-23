const PRIVATE_FIELDS = ['address', 'latitude', 'longitude', 'catastro', 'images'] as const;

export function describableFacts<T extends Record<string, unknown>>(known: T): Partial<T> {
  const facts: Partial<T> = { ...known };
  for (const field of PRIVATE_FIELDS) delete facts[field];
  return facts;
}
