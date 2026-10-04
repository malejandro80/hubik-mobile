import { pricePerSquareMeterLabel, publishedAgoLabel } from '../listingTags';

describe('pricePerSquareMeterLabel', () => {
  it('divides the sale price by the area, rounded to whole units', () => {
    expect(pricePerSquareMeterLabel('35000', '80', 'USD', 'sale')).toBe('$438/m²');
  });

  it('uses the listing currency', () => {
    expect(pricePerSquareMeterLabel('90000', '100', 'EUR', 'sale')).toBe('900 €/m²');
  });

  it('adds "al mes" for rentals and keeps one decimal for small amounts', () => {
    expect(pricePerSquareMeterLabel('550', '180', 'USD', 'rent')).toBe('$3.1/m² al mes');
  });

  it('returns null without a positive price and area', () => {
    expect(pricePerSquareMeterLabel(undefined, '80', 'USD', 'sale')).toBeNull();
    expect(pricePerSquareMeterLabel('35000', '0', 'USD', 'sale')).toBeNull();
    expect(pricePerSquareMeterLabel('abc', '80', 'USD', 'sale')).toBeNull();
  });
});

describe('publishedAgoLabel', () => {
  const now = new Date('2026-10-04T15:00:00Z');

  it.each([
    ['2026-10-04T08:00:00Z', 'Publicado hoy'],
    ['2026-10-03T10:00:00Z', 'Publicado ayer'],
    ['2026-10-01T15:00:00Z', 'Publicado hace 3 días'],
    ['2026-09-27T15:00:00Z', 'Publicado hace 1 semana'],
    ['2026-09-19T15:00:00Z', 'Publicado hace 2 semanas'],
    ['2026-09-03T15:00:00Z', 'Publicado hace 1 mes'],
    ['2026-07-26T15:00:00Z', 'Publicado hace 2 meses'],
    ['2025-08-01T15:00:00Z', 'Publicado hace más de un año'],
    ['2026-10-05T15:00:00Z', 'Publicado hoy'],
  ])('describes %s as %p', (createdAt, label) => {
    expect(publishedAgoLabel(createdAt, now)).toBe(label);
  });

  it('returns null without a valid date', () => {
    expect(publishedAgoLabel(undefined, now)).toBeNull();
    expect(publishedAgoLabel('not a date', now)).toBeNull();
  });
});
