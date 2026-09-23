import {
  AMENITIES_PREFIX,
  DEFAULT_PROPERTY_TYPE_LABEL,
  OPERATION_LABELS,
  PROPERTY_TYPE_LABELS,
} from './listingDocumentConstants.ts';

export interface ListingDocumentSource {
  title?: string | null;
  property_type?: string | null;
  operation_type?: string | null;
  city?: string | null;
  description?: string | null;
  amenities?: string[] | null;
}

export function listingDocument(listing: ListingDocumentSource): string {
  const { title, property_type, operation_type, city, description, amenities } = listing;
  const hasKind = Boolean(property_type || operation_type || city);
  const kind = hasKind
    ? [
        (property_type && PROPERTY_TYPE_LABELS[property_type]) || DEFAULT_PROPERTY_TYPE_LABEL,
        operation_type && OPERATION_LABELS[operation_type] ? `en ${OPERATION_LABELS[operation_type]}` : '',
        city ? `en ${city}` : '',
      ]
        .filter(Boolean)
        .join(' ') + '.'
    : '';

  const heading = [title ? `${title}.` : '', kind].filter(Boolean).join(' ');
  const amenityLine = amenities && amenities.length > 0 ? `${AMENITIES_PREFIX} ${amenities.join(', ')}.` : '';

  return [heading, description?.trim() ?? '', amenityLine].filter(Boolean).join('\n');
}
