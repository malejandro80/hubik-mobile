import { PropertyDraft } from '../types/property';

export type RequiredDraftFieldKey =
  | 'operation_type'
  | 'property_type'
  | 'price'
  | 'bedrooms'
  | 'bathrooms'
  | 'square_meters'
  | 'city'
  | 'address'
  | 'catastro';

export const DRAFT_FIELD_DISPLAY_ORDER: RequiredDraftFieldKey[] = [
  'operation_type',
  'property_type',
  'price',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'address',
  'catastro',
];

export const DESCRIPTION_KEY_FIELDS: (keyof PropertyDraft)[] = [
  'property_type',
  'operation_type',
  'price',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'address',
  'amenities',
];

export const LOCAL_ONLY_FIELDS: (keyof PropertyDraft)[] = ['images', 'latitude', 'longitude', 'description'];

export const INTEGER_KEYBOARD_FIELDS: RequiredDraftFieldKey[] = ['price', 'bedrooms', 'square_meters'];

export const DECIMAL_KEYBOARD_FIELDS: RequiredDraftFieldKey[] = ['bathrooms'];

export const ENUM_FIELDS: RequiredDraftFieldKey[] = ['property_type', 'operation_type'];
