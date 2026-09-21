import { validateDraftField } from '../draftValidation';

describe('validateDraftField numbers', () => {
  it('accepts a positive price and rounds it', () => {
    expect(validateDraftField('price', '175000')).toEqual({ ok: true, value: 175000 });
    expect(validateDraftField('price', ' 175000.4 ')).toEqual({ ok: true, value: 175000 });
  });

  it('reads thousands separators typed by the agent', () => {
    expect(validateDraftField('price', '175.000')).toEqual({ ok: true, value: 175000 });
    expect(validateDraftField('price', '1,250,000')).toEqual({ ok: true, value: 1250000 });
    expect(validateDraftField('price', '90 000')).toEqual({ ok: true, value: 90000 });
  });

  it('rejects an empty, non numeric, zero, negative or absurd price', () => {
    expect(validateDraftField('price', '')).toEqual({ ok: false, error: 'required' });
    expect(validateDraftField('price', '   ')).toEqual({ ok: false, error: 'required' });
    expect(validateDraftField('price', 'abc')).toEqual({ ok: false, error: 'invalid_number' });
    expect(validateDraftField('price', '0')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateDraftField('price', '-5')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateDraftField('price', '99999999999')).toEqual({ ok: false, error: 'out_of_range' });
  });

  it('requires square meters to be positive', () => {
    expect(validateDraftField('square_meters', '90')).toEqual({ ok: true, value: 90 });
    expect(validateDraftField('square_meters', '0')).toEqual({ ok: false, error: 'out_of_range' });
  });

  it('accepts zero bedrooms but only whole numbers', () => {
    expect(validateDraftField('bedrooms', '0')).toEqual({ ok: true, value: 0 });
    expect(validateDraftField('bedrooms', '3')).toEqual({ ok: true, value: 3 });
    expect(validateDraftField('bedrooms', '2.5')).toEqual({ ok: false, error: 'not_integer' });
    expect(validateDraftField('bedrooms', '-1')).toEqual({ ok: false, error: 'out_of_range' });
    expect(validateDraftField('bedrooms', '99')).toEqual({ ok: false, error: 'out_of_range' });
  });

  it('accepts half bathrooms', () => {
    expect(validateDraftField('bathrooms', '1.5')).toEqual({ ok: true, value: 1.5 });
    expect(validateDraftField('bathrooms', '1,5')).toEqual({ ok: true, value: 1.5 });
    expect(validateDraftField('bathrooms', '-1')).toEqual({ ok: false, error: 'out_of_range' });
  });
});

describe('validateDraftField text and options', () => {
  it('trims city and address and rejects blanks and over-long text', () => {
    expect(validateDraftField('city', '  Valencia ')).toEqual({ ok: true, value: 'Valencia' });
    expect(validateDraftField('address', 'Calle Colón 12')).toEqual({ ok: true, value: 'Calle Colón 12' });
    expect(validateDraftField('city', '   ')).toEqual({ ok: false, error: 'required' });
    expect(validateDraftField('city', 'x'.repeat(101))).toEqual({ ok: false, error: 'too_long' });
    expect(validateDraftField('address', 'x'.repeat(201))).toEqual({ ok: false, error: 'too_long' });
  });

  it('uppercases the catastro, removes spaces and checks its shape', () => {
    expect(validateDraftField('catastro', '9872023 vh5797s 0001 wx')).toEqual({
      ok: true,
      value: '9872023VH5797S0001WX',
    });
    expect(validateDraftField('catastro', 'LEGACY-E1F2A3B479302')).toEqual({
      ok: true,
      value: 'LEGACY-E1F2A3B479302',
    });
    expect(validateDraftField('catastro', 'short')).toEqual({ ok: false, error: 'invalid_catastro' });
    expect(validateDraftField('catastro', '9872023VH5797S0001W$')).toEqual({ ok: false, error: 'invalid_catastro' });
    expect(validateDraftField('catastro', '')).toEqual({ ok: false, error: 'required' });
  });

  it('accepts only known property and operation types', () => {
    expect(validateDraftField('property_type', 'Apartment')).toEqual({ ok: true, value: 'Apartment' });
    expect(validateDraftField('property_type', 'Castle')).toEqual({ ok: false, error: 'invalid_option' });
    expect(validateDraftField('operation_type', 'rent')).toEqual({ ok: true, value: 'rent' });
    expect(validateDraftField('operation_type', 'lease')).toEqual({ ok: false, error: 'invalid_option' });
  });
});
