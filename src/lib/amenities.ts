// Client-side amenity heuristics (RFC 010). Mirrors the cheap local dictionary in
// supabase/functions/_shared/amenities.ts, kept as a separate copy rather than a shared module -
// same precedent as this repo's other client-vs-edge-function heuristic duplication (RFC 008's
// city-matching gap): the RN bundle and the Deno edge functions don't share a module graph.

const AMENITY_KEYWORDS: [RegExp, string][] = [
  [/\bpiscinas?\b|\bpools?\b|\balbercas?\b/i, 'piscina'],
  [/\bgarajes?\b|\bgarages?\b|\bparqueaderos?\b|\bestacionamientos?\b/i, 'garaje'],
  [/\bparrilleras?\b|\bparrillas?\b|\bbarbacoas?\b|\bbbq\b|\bbarbecues?\b/i, 'barbacoa'],
  [/\bascensors?\b|\belevators?\b/i, 'ascensor'],
  [/\baire acondicionado\b|\bair conditioning\b|\ba\/c\b/i, 'aire acondicionado'],
  [/\bseguridad\b|\bvigilancia\b|\bsecurity\b/i, 'seguridad'],
  [/\bgimnasios?\b|\bgyms?\b/i, 'gimnasio'],
  [/\bterrazas?\b|\bbalc[oó]n(?:es)?\b|\bbalcon(?:y|ies)\b/i, 'terraza'],
  [/\bjard[ií]n(?:es)?\b|\bgardens?\b/i, 'jardín'],
];

const AMENITY_SIGNAL_REGEX = /\b(tiene|cuenta con|incluye|cerca de|con vista a|hay|dispone de)\b/i;

const MAX_AMENITY_LENGTH = 60;
const MAX_AMENITIES = 20;

export function extractAmenityKeywords(text: string): string[] {
  const hits = new Set<string>();
  for (const [regex, tag] of AMENITY_KEYWORDS) {
    if (regex.test(text)) hits.add(tag);
  }
  return Array.from(hits);
}

export function normalizeAmenities(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > MAX_AMENITY_LENGTH || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
    if (result.length >= MAX_AMENITIES) break;
  }
  return result;
}

export function hasAmenitySignal(text: string): boolean {
  return AMENITY_SIGNAL_REGEX.test(text);
}
