export const MAX_PRICE = 999999999;

export const MAX_SQUARE_METERS = 100000;

export const MAX_ROOMS = 50;

export const MAX_CITY_LENGTH = 100;

export const MAX_ADDRESS_LENGTH = 200;

export const CATASTRO_PATTERN = /^[A-Z0-9-]{14,20}$/;

export const WHITESPACE_PATTERN = /\s+/g;

export const THOUSANDS_GROUPED_PATTERN = /^\d{1,3}([.,]\d{3})+$/;

export const SEPARATOR_PATTERN = /[.,]/g;

export const DECIMAL_COMMA_PATTERN = /,/g;

export const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

export const PROPERTY_TYPE_VALUES = ['Apartment', 'Single Family', 'Townhouse', 'Studio', 'Condo'] as const;

export const OPERATION_TYPE_VALUES = ['sale', 'rent'] as const;
