import { listingDocument } from '../listingDocument';

const listing = {
  title: 'Quinta con piscina en Guataparo',
  property_type: 'Single Family',
  operation_type: 'sale',
  city: 'Valencia',
  description: 'Quinta de 4 habitaciones con amplio jardín.',
  amenities: ['piscina', 'jardín', 'vista a la montaña'],
  address: 'Calle 5, casa 12',
  catastro: 'VAL-2026-0001',
};

describe('listingDocument', () => {
  it('describes the listing by title, type, operation, city, description and amenities', () => {
    expect(listingDocument(listing)).toBe(
      'Quinta con piscina en Guataparo. Casa en venta en Valencia.\n' +
        'Quinta de 4 habitaciones con amplio jardín.\n' +
        'Comodidades: piscina, jardín, vista a la montaña.'
    );
  });

  it('never includes the street address or cadastral reference', () => {
    const text = listingDocument(listing);

    expect(text).not.toContain('Calle 5');
    expect(text).not.toContain('VAL-2026-0001');
  });

  it('uses rent wording and skips missing parts', () => {
    expect(
      listingDocument({ title: 'Estudio en Prebo', property_type: 'Studio', operation_type: 'rent', city: 'Valencia' })
    ).toBe('Estudio en Prebo. Estudio en alquiler en Valencia.');
  });

  it('falls back to a neutral label for an unknown type and no operation', () => {
    expect(listingDocument({ title: 'Local', property_type: 'Warehouse', description: 'Amplio.' })).toBe(
      'Local. Propiedad.\nAmplio.'
    );
  });

  it('returns an empty string when there is nothing to describe', () => {
    expect(listingDocument({})).toBe('');
  });
});
