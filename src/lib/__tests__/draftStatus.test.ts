import {
  getChangedFields,
  getDescriptionKey,
  getFieldStatuses,
  getMissingCount,
  getMissingFields,
  getSuggestions,
  isReadyToPublish,
} from '../draftStatus';
import { PropertyDraft } from '../../types/property';

const COMPLETE: PropertyDraft = {
  catastro: '9872023VH5797S0001WX',
  property_type: 'Apartment',
  operation_type: 'sale',
  price: 180000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Valencia',
  address: 'Calle Colón 12',
};

const LONG_DESCRIPTION =
  'Luminoso piso de tres habitaciones en pleno centro de Valencia, con dos baños completos y cocina reformada.';

describe('getFieldStatuses', () => {
  it('lists every required field in display order with catastro last', () => {
    const statuses = getFieldStatuses({}, []);
    expect(statuses.map((entry) => entry.field)).toEqual([
      'operation_type',
      'property_type',
      'price',
      'bedrooms',
      'bathrooms',
      'square_meters',
      'city',
      'address',
      'catastro',
    ]);
  });

  it('marks filled fields ok and empty ones missing', () => {
    const statuses = getFieldStatuses({ price: 90000, city: 'Valencia' }, []);
    const byField = Object.fromEntries(statuses.map((entry) => [entry.field, entry.status]));
    expect(byField.price).toBe('ok');
    expect(byField.city).toBe('ok');
    expect(byField.address).toBe('missing');
    expect(byField.catastro).toBe('missing');
  });

  it('marks a filled field that the AI just changed as changed', () => {
    const statuses = getFieldStatuses({ price: 90000, city: 'Valencia' }, ['price']);
    const byField = Object.fromEntries(statuses.map((entry) => [entry.field, entry.status]));
    expect(byField.price).toBe('changed');
    expect(byField.city).toBe('ok');
  });

  it('keeps a recently changed field missing when it has no value', () => {
    const statuses = getFieldStatuses({}, ['catastro']);
    expect(statuses.find((entry) => entry.field === 'catastro')?.status).toBe('missing');
  });

  it('treats zero as a filled value and blank text as missing', () => {
    const statuses = getFieldStatuses({ bedrooms: 0, address: '   ' }, []);
    const byField = Object.fromEntries(statuses.map((entry) => [entry.field, entry.status]));
    expect(byField.bedrooms).toBe('ok');
    expect(byField.address).toBe('missing');
  });
});

describe('missing fields and readiness', () => {
  it('reports every required field missing for an empty draft', () => {
    expect(getMissingCount({})).toBe(9);
    expect(isReadyToPublish({})).toBe(false);
  });

  it('is ready only when every required field is present', () => {
    expect(isReadyToPublish(COMPLETE)).toBe(true);
    expect(getMissingCount(COMPLETE)).toBe(0);
    expect(isReadyToPublish({ ...COMPLETE, catastro: undefined })).toBe(false);
    expect(getMissingFields({ ...COMPLETE, catastro: undefined, city: '' })).toEqual(['city', 'catastro']);
  });

  it('does not require photos or a pin to be ready', () => {
    expect(isReadyToPublish({ ...COMPLETE, images: [], latitude: undefined })).toBe(true);
  });
});

describe('getSuggestions', () => {
  it('suggests photos, the pin and amenities for an empty draft', () => {
    expect(getSuggestions({}, null)).toEqual(['no_photos', 'no_pin', 'no_amenities']);
  });

  it('suggests more photos when there are fewer than the recommended number', () => {
    const suggestions = getSuggestions({ ...COMPLETE, images: ['a', 'b'], latitude: 1, longitude: 1, amenities: ['piscina'] }, null);
    expect(suggestions).toContain('few_photos');
    expect(suggestions).not.toContain('no_photos');
  });

  it('stops suggesting photos once there are enough', () => {
    const suggestions = getSuggestions({ images: ['a', 'b', 'c'] }, null);
    expect(suggestions).not.toContain('no_photos');
    expect(suggestions).not.toContain('few_photos');
  });

  it('does not suggest the pin once both coordinates are set', () => {
    expect(getSuggestions({ latitude: 39.47, longitude: -0.37 }, null)).not.toContain('no_pin');
    expect(getSuggestions({ latitude: 39.47 }, null)).toContain('no_pin');
  });

  it('offers the AI description only when the draft is ready and has none', () => {
    expect(getSuggestions({}, null)).not.toContain('no_description');
    expect(getSuggestions({ ...COMPLETE, images: ['a', 'b', 'c'], latitude: 1, longitude: 1 }, null)).toContain(
      'no_description'
    );
  });

  it('flags a short description and a stale one', () => {
    const base: PropertyDraft = { ...COMPLETE, images: ['a', 'b', 'c'], latitude: 1, longitude: 1, amenities: ['piscina'] };
    expect(getSuggestions({ ...base, description: 'Piso bonito.' }, null)).toEqual(['short_description']);

    const describedFrom = getDescriptionKey(base);
    expect(getSuggestions({ ...base, description: LONG_DESCRIPTION }, describedFrom)).toEqual([]);
    expect(getSuggestions({ ...base, price: 150000, description: LONG_DESCRIPTION }, describedFrom)).toEqual([
      'stale_description',
    ]);
  });

  it('caps the list at three and keeps the priority order', () => {
    const suggestions = getSuggestions({ ...COMPLETE }, null);
    expect(suggestions).toEqual(['no_photos', 'no_pin', 'no_description']);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe('getDescriptionKey', () => {
  it('changes when a field the description depends on changes', () => {
    expect(getDescriptionKey(COMPLETE)).not.toBe(getDescriptionKey({ ...COMPLETE, price: 170000 }));
    expect(getDescriptionKey(COMPLETE)).not.toBe(getDescriptionKey({ ...COMPLETE, amenities: ['piscina'] }));
  });

  it('ignores photos, the pin and the catastro', () => {
    expect(getDescriptionKey(COMPLETE)).toBe(
      getDescriptionKey({ ...COMPLETE, images: ['a'], latitude: 1, longitude: 2, catastro: 'OTHER' })
    );
  });
});

describe('getChangedFields', () => {
  it('lists the fields whose value differs between two drafts', () => {
    expect(getChangedFields({ price: 100 }, { price: 200, city: 'Valencia' }).sort()).toEqual(['city', 'price']);
  });

  it('returns nothing when the drafts are equal', () => {
    expect(getChangedFields(COMPLETE, { ...COMPLETE })).toEqual([]);
  });

  it('compares lists by content', () => {
    expect(getChangedFields({ amenities: ['piscina'] }, { amenities: ['piscina'] })).toEqual([]);
    expect(getChangedFields({ amenities: ['piscina'] }, { amenities: ['piscina', 'garaje'] })).toEqual(['amenities']);
  });

  it('ignores photos, pin and description because those are the agent\'s own actions', () => {
    expect(
      getChangedFields({}, { images: ['a'], latitude: 1, longitude: 2, description: 'Texto' })
    ).toEqual([]);
  });

  it('reports a field the server cleared', () => {
    expect(getChangedFields({ catastro: 'ABC' }, {})).toEqual(['catastro']);
  });
});
