import { labels as defaultLabels, Labels } from '../constants/labels';
import { CURRENCY_SYMBOLS } from './chatRegistration';

export type PhotoCountType = 'real_with_photos' | 'real_empty' | 'mock';

export type PropertyDetailRouteParams = {
  id?: string;
  title?: string;
  price?: string;
  currency?: string;
  city?: string;
  address?: string;
  bedrooms?: string;
  bathrooms?: string;
  square_meters?: string;
  property_type?: string;
  operation_type?: string;
  amenities?: string;
  image_url?: string;
  description?: string;
  images?: string;
  lat?: string;
  lng?: string;
  agency_name?: string;
  agent_name?: string;
  preview?: string;
};

function parseStringArrayParam(param?: string): string[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(param);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function parsePropertyImages(imagesParam?: string): string[] {
  return parseStringArrayParam(imagesParam);
}

export function parsePropertyAmenities(amenitiesParam?: string): string[] {
  return parseStringArrayParam(amenitiesParam);
}

export function formatPrice(
  rawPrice?: string,
  currency?: string,
  operationType?: string,
  labels: Labels = defaultLabels
): string {
  if (!rawPrice) return '—';
  const amount = Number(rawPrice);
  const symbol = currency && currency !== 'USD' ? CURRENCY_SYMBOLS[currency] : undefined;
  const baseFormatted = symbol ? `${amount.toLocaleString('es-ES')} ${symbol}` : `$${amount.toLocaleString('en-US')}`;
  if (operationType === 'rent') {
    return `${baseFormatted}${labels.propertyDetail.rentSuffix}`;
  }
  return baseFormatted;
}

export function resolvePhotoCountLabel(
  isRealDraft: boolean,
  realImagesCount: number,
  labels: Labels
): string {
  const options: Record<PhotoCountType, string> = {
    real_with_photos: labels.propertyDetail.photosCount(1, realImagesCount),
    real_empty: labels.propertyDetail.noPhotos,
    mock: labels.propertyDetail.mockPhotosCount,
  };

  const type: PhotoCountType = !isRealDraft
    ? 'mock'
    : realImagesCount > 0
      ? 'real_with_photos'
      : 'real_empty';

  return options[type];
}

export type DescriptionState = 'real_draft' | 'loading' | 'ready' | 'error' | 'empty';

export function resolveDescriptionState(
  isRealDraft: boolean,
  loading: boolean,
  hasDescription: boolean,
  hasError: boolean
): DescriptionState {
  if (isRealDraft) return 'real_draft';
  if (loading) return 'loading';
  if (hasDescription) return 'ready';
  if (hasError) return 'error';
  return 'empty';
}
