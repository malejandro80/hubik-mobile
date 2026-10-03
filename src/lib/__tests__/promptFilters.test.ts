import { extractPropertyType, parsePromptFilters } from '../promptFilters';

describe('promptFilters', () => {
  describe('extractPropertyType', () => {
    it('detects apartments from synonyms', () => {
      expect(extractPropertyType('departamento céntrico')).toBe('Apartment');
      expect(extractPropertyType('piso luminoso')).toBe('Apartment');
      expect(extractPropertyType('nice flat')).toBe('Apartment');
    });

    it('detects houses, studios, condos and townhouses', () => {
      expect(extractPropertyType('casa con patio')).toBe('Single Family');
      expect(extractPropertyType('estudio para estudiante')).toBe('Studio');
      expect(extractPropertyType('condo in miami')).toBe('Condo');
      expect(extractPropertyType('casa adosada espaciosa')).toBe('Townhouse');
    });

    it('returns undefined when no property type is present', () => {
      expect(extractPropertyType('propiedad en valencia')).toBeUndefined();
    });
  });

  describe('parsePromptFilters', () => {
    it('extracts city, property type, bedrooms, and max price from prompt', () => {
      const filters = parsePromptFilters('Denver 3-bed house under 700k');
      expect(filters.city).toBe('Denver');
      expect(filters.property_type).toBe('Single Family');
      expect(filters.min_bedrooms).toBe(3);
      expect(filters.max_price).toBe(700000);
    });

    it('extracts metric area filters correctly', () => {
      const filtersM2 = parsePromptFilters('Miami condo under 120 m2');
      expect(filtersM2.max_square_meters).toBe(120);

      const filtersSqm = parsePromptFilters('Austin apartment over 80 sqm');
      expect(filtersSqm.min_square_meters).toBe(80);

      const filtersSqMetres = parsePromptFilters('Seattle home under 200 square meters');
      expect(filtersSqMetres.max_square_meters).toBe(200);
    });

    it('converts square feet to square meters accurately', () => {
      const filtersFeet = parsePromptFilters('Denver house under 1000 sqft');
      expect(filtersFeet.max_square_meters).toBe(93);

      const filtersMinFeet = parsePromptFilters('Austin condo over 1500 sq ft');
      expect(filtersMinFeet.min_square_meters).toBe(139);
    });

    it('extracts Spanish queries with price limits and sorting', () => {
      const filters = parsePromptFilters('casas familiares en Miami con más de 3 habitaciones por menos de 500k');
      expect(filters.city).toBe('Miami');
      expect(filters.property_type).toBe('Single Family');
      expect(filters.min_bedrooms).toBe(3);
      expect(filters.max_price).toBe(500000);

      const filtersSortAsc = parsePromptFilters('los departamentos más baratos en Denver');
      expect(filtersSortAsc.sort_by).toBe('price_asc');

      const filtersSortDesc = parsePromptFilters('casas de lujo en Miami');
      expect(filtersSortDesc.sort_by).toBe('price_desc');
    });

    it('extracts query limit when requested', () => {
      const filters = parsePromptFilters('mostrar las 5 casas más baratas en Austin');
      expect(filters.limit).toBe(5);
      expect(filters.sort_by).toBe('price_asc');
    });

    it('extracts amenities from message', () => {
      const filters = parsePromptFilters('casas con piscina y garaje en Miami');
      expect(filters.amenities).toEqual(expect.arrayContaining(['piscina', 'garaje']));
    });
  });
});
