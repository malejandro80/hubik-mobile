import { labels } from '../../constants/labels';
import {
  formatPrice,
  getNearbyAmenities,
  parsePropertyImages,
  resolveDescriptionState,
  resolvePhotoCountLabel,
} from '../propertyDetail';

describe('propertyDetail library', () => {
  describe('getNearbyAmenities', () => {
    it('returns standard list of 4 amenities with labels and icons', () => {
      const amenities = getNearbyAmenities(labels);
      expect(amenities).toHaveLength(4);
      expect(amenities[0].title).toBe(labels.propertyDetail.amenities.pharmacy);
      expect(amenities[1].title).toBe(labels.propertyDetail.amenities.supermarket);
    });
  });

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

  describe('formatPrice', () => {
    it('formats valid price string as US formatted currency', () => {
      expect(formatPrice('350000')).toBe('$350,000');
    });

    it('falls back to default price string when empty or undefined', () => {
      expect(formatPrice(undefined)).toBe('485.000 €');
    });
  });

  describe('resolvePhotoCountLabel', () => {
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
