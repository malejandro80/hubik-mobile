import Ionicons from '@expo/vector-icons/Ionicons';
import { Labels } from '../hooks/useLabels';

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

export function parsePropertyImages(imagesParam?: string): string[] {
  if (!imagesParam) return [];
  try {
    const parsed = JSON.parse(imagesParam);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function formatPrice(rawPrice?: string): string {
  return rawPrice ? `$${Number(rawPrice).toLocaleString('en-US')}` : '485.000 €';
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
