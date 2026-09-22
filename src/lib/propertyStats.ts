import Ionicons from '@expo/vector-icons/Ionicons';
import { labels } from '../constants/labels';
import { PropertyType } from '../types/property';

export interface PropertyStatField {
  key: 'bedrooms' | 'bathrooms' | 'square_meters';
  icon: keyof typeof Ionicons.glyphMap;
  label: (value: string | number) => string;
}

export const DEFAULT_RESIDENTIAL_STATS: PropertyStatField[] = [
  {
    key: 'bedrooms',
    icon: 'bed-outline',
    label: (value: string | number) => labels.propertyDetail.stats.bedrooms(value),
  },
  {
    key: 'bathrooms',
    icon: 'water-outline',
    label: (value: string | number) => labels.propertyDetail.stats.bathrooms(value),
  },
  {
    key: 'square_meters',
    icon: 'cube-outline',
    label: (value: string | number) => labels.propertyDetail.stats.squareMeters(value),
  },
];

export const PROPERTY_TYPE_STATS: Record<PropertyType, PropertyStatField[]> = {
  Apartment: DEFAULT_RESIDENTIAL_STATS,
  'Single Family': DEFAULT_RESIDENTIAL_STATS,
  Townhouse: DEFAULT_RESIDENTIAL_STATS,
  Studio: DEFAULT_RESIDENTIAL_STATS,
  Condo: DEFAULT_RESIDENTIAL_STATS,
};

export function getStatsForType(type?: PropertyType): PropertyStatField[] {
  if (type && PROPERTY_TYPE_STATS[type]) {
    return PROPERTY_TYPE_STATS[type];
  }
  return DEFAULT_RESIDENTIAL_STATS;
}
