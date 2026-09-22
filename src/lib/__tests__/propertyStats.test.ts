import { PropertyType } from '../../types/property';
import {
  DEFAULT_RESIDENTIAL_STATS,
  getStatsForType,
  PROPERTY_TYPE_STATS,
} from '../propertyStats';

describe('propertyStats', () => {
  const propertyTypes: PropertyType[] = [
    'Apartment',
    'Single Family',
    'Townhouse',
    'Studio',
    'Condo',
  ];

  it('returns the same three-field config for every current PropertyType', () => {
    propertyTypes.forEach((type) => {
      const stats = getStatsForType(type);
      expect(stats).toHaveLength(3);
      expect(stats.map((s) => s.key)).toEqual(['bedrooms', 'bathrooms', 'square_meters']);
    });
  });

  it('falls back to default residential stats when type is undefined or unknown', () => {
    expect(getStatsForType(undefined)).toEqual(DEFAULT_RESIDENTIAL_STATS);
    expect(getStatsForType('Unknown' as any)).toEqual(DEFAULT_RESIDENTIAL_STATS);
  });

  it('formats labels properly using centralized labels', () => {
    const stats = getStatsForType('Apartment');
    const bedroomsField = stats.find((s) => s.key === 'bedrooms');
    const bathroomsField = stats.find((s) => s.key === 'bathrooms');
    const sqmField = stats.find((s) => s.key === 'square_meters');

    expect(bedroomsField?.label('3')).toBe('3 hab.');
    expect(bathroomsField?.label('2')).toBe('2 baños');
    expect(sqmField?.label('120')).toBe('120 m²');
  });

  it('defines PROPERTY_TYPE_STATS dictionary matching all PropertyTypes', () => {
    propertyTypes.forEach((type) => {
      expect(PROPERTY_TYPE_STATS[type]).toBeDefined();
    });
  });
});
