import {
  CATASTRO_PATTERN,
  DECIMAL_COMMA_PATTERN,
  MAX_ADDRESS_LENGTH,
  MAX_CITY_LENGTH,
  MAX_PRICE,
  MAX_ROOMS,
  MAX_SQUARE_METERS,
  NUMERIC_PATTERN,
  OPERATION_TYPE_VALUES,
  PROPERTY_TYPE_VALUES,
  SEPARATOR_PATTERN,
  THOUSANDS_GROUPED_PATTERN,
  WHITESPACE_PATTERN,
} from '../constants/draftValidation';

export type DraftEditableField =
  | 'property_type'
  | 'operation_type'
  | 'price'
  | 'bedrooms'
  | 'bathrooms'
  | 'square_meters'
  | 'city'
  | 'address'
  | 'catastro';

export type DraftFieldError =
  | 'required'
  | 'invalid_number'
  | 'not_integer'
  | 'out_of_range'
  | 'too_long'
  | 'invalid_catastro'
  | 'invalid_option';

export type FieldEditResult =
  | { ok: true; value: string | number }
  | { ok: false; error: DraftFieldError };

type NumericField = 'price' | 'bedrooms' | 'bathrooms' | 'square_meters';

interface NumericRule {
  min: number;
  minExclusive: boolean;
  max: number;
  integer: 'round' | 'strict' | 'none';
}

const NUMERIC_RULES: Record<NumericField, NumericRule> = {
  price: { min: 0, minExclusive: true, max: MAX_PRICE, integer: 'round' },
  square_meters: { min: 0, minExclusive: true, max: MAX_SQUARE_METERS, integer: 'round' },
  bedrooms: { min: 0, minExclusive: false, max: MAX_ROOMS, integer: 'strict' },
  bathrooms: { min: 0, minExclusive: false, max: MAX_ROOMS, integer: 'none' },
};

const TEXT_LIMITS: Record<'city' | 'address', number> = {
  city: MAX_CITY_LENGTH,
  address: MAX_ADDRESS_LENGTH,
};

const fail = (error: DraftFieldError): FieldEditResult => ({ ok: false, error });

function parseNumber(raw: string): number {
  const compact = raw.trim().replace(WHITESPACE_PATTERN, '');
  const normalized = THOUSANDS_GROUPED_PATTERN.test(compact)
    ? compact.replace(SEPARATOR_PATTERN, '')
    : compact.replace(DECIMAL_COMMA_PATTERN, '.');
  return NUMERIC_PATTERN.test(normalized) ? Number(normalized) : Number.NaN;
}

function validateNumber(field: NumericField, raw: string): FieldEditResult {
  const rule = NUMERIC_RULES[field];
  const parsed = parseNumber(raw);
  if (Number.isNaN(parsed)) return fail('invalid_number');
  if (rule.integer === 'strict' && !Number.isInteger(parsed)) return fail('not_integer');

  const value = rule.integer === 'round' ? Math.round(parsed) : parsed;
  const belowMin = rule.minExclusive ? value <= rule.min : value < rule.min;
  if (belowMin || value > rule.max) return fail('out_of_range');
  return { ok: true, value };
}

function validateText(field: 'city' | 'address', raw: string): FieldEditResult {
  const value = raw.trim();
  if (value.length > TEXT_LIMITS[field]) return fail('too_long');
  return { ok: true, value };
}

function validateCatastro(raw: string): FieldEditResult {
  const value = raw.replace(WHITESPACE_PATTERN, '').toUpperCase();
  return CATASTRO_PATTERN.test(value) ? { ok: true, value } : fail('invalid_catastro');
}

function validateOption(options: readonly string[], raw: string): FieldEditResult {
  return options.includes(raw) ? { ok: true, value: raw } : fail('invalid_option');
}

export function validateDraftField(field: DraftEditableField, raw: string): FieldEditResult {
  if (raw.trim() === '') return fail('required');

  switch (field) {
    case 'price':
    case 'bedrooms':
    case 'bathrooms':
    case 'square_meters':
      return validateNumber(field, raw);
    case 'city':
    case 'address':
      return validateText(field, raw);
    case 'catastro':
      return validateCatastro(raw);
    case 'property_type':
      return validateOption(PROPERTY_TYPE_VALUES, raw);
    case 'operation_type':
      return validateOption(OPERATION_TYPE_VALUES, raw);
  }
}
