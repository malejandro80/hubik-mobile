import Ionicons from '@expo/vector-icons/Ionicons';
import { Labels } from '../hooks/useLabels';
import { CURRENCY_SYMBOLS } from './chatRegistration';

export interface AccessibilityCardItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export interface AmenityItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  distance: string;
}

export function getNearbyAmenities(labels: Labels): AmenityItem[] {
  return [
    {
      icon: 'medical-outline',
      title: labels.propertyDetail.amenities.pharmacy,
      distance: labels.propertyDetail.amenities.pharmacyDist,
    },
    {
      icon: 'cart-outline',
      title: labels.propertyDetail.amenities.supermarket,
      distance: labels.propertyDetail.amenities.supermarketDist,
    },
    {
      icon: 'bus-outline',
      title: labels.propertyDetail.amenities.busLines,
      distance: labels.propertyDetail.amenities.busLinesDist,
    },
    {
      icon: 'fitness-outline',
      title: labels.propertyDetail.amenities.healthCenter,
      distance: labels.propertyDetail.amenities.healthCenterDist,
    },
  ];
}

export type PhotoCountType = 'real_with_photos' | 'real_empty' | 'mock';

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

export function formatPrice(rawPrice?: string, currency?: string): string {
  if (!rawPrice) return '—';
  const amount = Number(rawPrice);
  const symbol = currency && currency !== 'USD' ? CURRENCY_SYMBOLS[currency] : undefined;
  return symbol ? `${amount.toLocaleString('es-ES')} ${symbol}` : `$${amount.toLocaleString('en-US')}`;
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
