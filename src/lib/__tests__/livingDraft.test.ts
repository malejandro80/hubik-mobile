import { labels } from '../../constants/labels';
import { PropertyDraft } from '../../types/property';
import {
  capitalize,
  formatKnownValue,
  isPickerField,
  PICKER_OPTIONS,
} from '../livingDraft';

describe('livingDraft library', () => {
  describe('isPickerField', () => {
    it('returns true for property_type and operation_type', () => {
      expect(isPickerField('property_type')).toBe(true);
      expect(isPickerField('operation_type')).toBe(true);
    });

    it('returns false for non-picker fields', () => {
      expect(isPickerField('price')).toBe(false);
      expect(isPickerField('city')).toBe(false);
      expect(isPickerField('description')).toBe(false);
    });
  });

  describe('capitalize', () => {
    it('capitalizes the first letter of a word', () => {
      expect(capitalize('precio')).toBe('Precio');
      expect(capitalize('tipo de propiedad')).toBe('Tipo de propiedad');
    });

    it('handles empty strings', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('formatKnownValue', () => {
    it('formats property_type using Spanish translation', () => {
      const draft: PropertyDraft = { property_type: 'Apartment' };
      expect(formatKnownValue('property_type', draft, labels)).toBe('Piso');
    });

    it('formats operation_type using labels dictionary', () => {
      expect(formatKnownValue('operation_type', { operation_type: 'sale' }, labels)).toBe(
        labels.livingDraft.sale
      );
      expect(formatKnownValue('operation_type', { operation_type: 'rent' }, labels)).toBe(
        labels.livingDraft.rent
      );
    });

    it('formats numeric fields with formatting/suffixes', () => {
      expect(formatKnownValue('price', { price: 250000 }, labels)).toBe('250.000 €');
      expect(formatKnownValue('bedrooms', { bedrooms: 3 }, labels)).toBe('3 hab.');
      expect(formatKnownValue('bathrooms', { bathrooms: 2 }, labels)).toBe('2 baños');
      expect(formatKnownValue('square_meters', { square_meters: 100 }, labels)).toBe('100 m²');
    });

    it('formats other fields as strings', () => {
      expect(formatKnownValue('city', { city: 'Valencia' }, labels)).toBe('Valencia');
    });
  });

  describe('PICKER_OPTIONS', () => {
    it('defines options and accessible labels for property_type', () => {
      const config = PICKER_OPTIONS.property_type;
      expect(config.options).toContain('Piso');
      expect(config.getA11yLabel(labels, 'Piso')).toBe(
        labels.livingDraft.propertyTypeA11y('Piso')
      );
    });

    it('defines options and accessible labels for operation_type', () => {
      const config = PICKER_OPTIONS.operation_type;
      expect(config.options).toEqual(['Venta', 'Alquiler']);
      expect(config.getA11yLabel(labels, 'Venta')).toBe(
        labels.livingDraft.operationTypeA11y('Venta')
      );
    });
  });
});
