import {
  COMBINING_MARKS_PATTERN,
  NON_SLUG_PATTERN,
  REF_MAX_LENGTH,
  SHORT_ID_LENGTH,
  SLUG_FALLBACK,
  SLUG_MAX_LENGTH,
  SLUG_REF_PATTERN,
} from '../constants/listingSlug';

const PROPERTY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPropertyId(value: unknown): value is string {
  return typeof value === 'string' && PROPERTY_ID_PATTERN.test(value);
}

export type ListingRef =
  | { kind: 'id'; id: string }
  | { kind: 'slug'; slug: string; shortId: string };

export function slugify(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toLowerCase()
    .replace(NON_SLUG_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  return slug || SLUG_FALLBACK;
}

export function buildListingSlug(title: string, id: string): string {
  return `${slugify(title)}-${id.slice(0, SHORT_ID_LENGTH).toLowerCase()}`;
}

export function parseListingRef(value: unknown): ListingRef | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > REF_MAX_LENGTH) return null;
  const slug = value.toLowerCase();
  if (isPropertyId(value)) return { kind: 'id', id: value };

  const match = SLUG_REF_PATTERN.exec(slug);
  return match ? { kind: 'slug', slug, shortId: match[1] } : null;
}
