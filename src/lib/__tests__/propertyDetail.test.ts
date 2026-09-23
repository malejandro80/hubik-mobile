import { labels } from '../../constants/labels';
import {
  formatPrice,
  parsePropertyAmenities,
  parsePropertyImages,
  resolveDescriptionState,
  resolvePhotoCountLabel,
} from '../propertyDetail';

describe('propertyDetail library', () => {
  describe('parsePropertyImages', () => {
    it('returns empty array when imagesParam is undefined or empty', () => {
      expect(parsePropertyImages(undefined)).toEqual([]);
      expect(parsePropertyImages('')).toEqual([]);
    });

    it('parses valid JSON array of image strings', () => {
      const json = JSON.stringify(['https://img1.jpg', 'https://img2.jpg']);
      expect(parsePropertyImages(json)).toEqual(['https://img1.jpg', 'https://img2.jpg']);
    });

    it('gracefully handles malformed JSON by returning empty array', () => {
      expect(parsePropertyImages('not-json')).toEqual([]);
    });
  });

  describe('parsePropertyAmenities', () => {
    it('returns empty array when amenitiesParam is undefined or empty', () => {
      expect(parsePropertyAmenities(undefined)).toEqual([]);
      expect(parsePropertyAmenities('')).toEqual([]);
    });

    it('parses valid JSON array of amenity strings', () => {
      const json = JSON.stringify(['piscina', 'garaje']);
      expect(parsePropertyAmenities(json)).toEqual(['piscina', 'garaje']);
    });

    it('gracefully handles malformed JSON by returning empty array', () => {
      expect(parsePropertyAmenities('not-json')).toEqual([]);
    });
  });

  describe('formatPrice', () => {
    it('formats a price with no currency as US-style dollars (default when currency is unknown)', () => {
      expect(formatPrice('350000')).toBe('$350,000');
    });

    it('formats a price with an explicit currency using the matching symbol and locale', () => {
      expect(formatPrice('350000', 'EUR')).toBe('350.000 €');
      expect(formatPrice('350000', 'VES')).toBe('350.000 Bs.');
      expect(formatPrice('350000', 'USD')).toBe('$350,000');
    });

    it('returns a neutral placeholder instead of a fabricated price when the price is missing', () => {
      expect(formatPrice(undefined)).toBe('—');
    });

    it('appends rent suffix only when operation_type is rent, for every currency branch', () => {
      expect(formatPrice('350000', 'EUR', 'rent')).toBe('350.000 €/mes');
      expect(formatPrice('350000', 'VES', 'rent')).toBe('350.000 Bs./mes');
      expect(formatPrice('350000', 'USD', 'rent')).toBe('$350,000/mes');
      expect(formatPrice('350000', undefined, 'rent')).toBe('$350,000/mes');
    });

    it('does not append rent suffix when operation_type is sale or omitted', () => {
      expect(formatPrice('350000', 'EUR', 'sale')).toBe('350.000 €');
      expect(formatPrice('350000', 'USD', 'sale')).toBe('$350,000');
      expect(formatPrice('350000', 'EUR', undefined)).toBe('350.000 €');
    });
  });

  describe('resolvePhotoCountLabel', () => {
    it('counts the real photos of a published listing even without a stored description', () => {
      expect(resolvePhotoCountLabel(false, 4, labels)).toBe(labels.propertyDetail.photosCount(1, 4));
    });

    it('returns mock photos count when not a real draft', () => {
      expect(resolvePhotoCountLabel(false, 0, labels)).toBe(
        labels.propertyDetail.mockPhotosCount
      );
    });

    it('returns real with photos count when real draft has images', () => {
      expect(resolvePhotoCountLabel(true, 4, labels)).toBe(
        labels.propertyDetail.photosCount(1, 4)
      );
    });

    it('returns noPhotos label when real draft has 0 images', () => {
      expect(resolvePhotoCountLabel(true, 0, labels)).toBe(
        labels.propertyDetail.noPhotos
      );
    });
  });

  describe('resolveDescriptionState', () => {
    it('returns real_draft when isRealDraft is true', () => {
      expect(resolveDescriptionState(true, false, false, false)).toBe('real_draft');
    });

    it('returns loading when loading is true', () => {
      expect(resolveDescriptionState(false, true, false, false)).toBe('loading');
    });

    it('returns ready when description exists', () => {
      expect(resolveDescriptionState(false, false, true, false)).toBe('ready');
    });

    it('returns error when error is true', () => {
      expect(resolveDescriptionState(false, false, false, true)).toBe('error');
    });

    it('returns empty otherwise', () => {
      expect(resolveDescriptionState(false, false, false, false)).toBe('empty');
    });
  });
});
