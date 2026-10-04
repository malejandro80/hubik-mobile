export const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  Apartment: 'Apartamentos',
  'Single Family': 'Casas',
  Townhouse: 'Casas adosadas',
  Studio: 'Estudios',
  Condo: 'Condominios',
};

export const DEFAULT_SUGGESTION_LABEL = 'Propiedades';

export const SUGGESTION_OPERATION_LABELS: Record<string, string> = {
  rent: 'en alquiler',
  sale: 'en venta',
};

export const inCityPhrase = (city: string) => `en ${city}`;

export const bedroomsPhrase = (bedrooms: number) => `de ${bedrooms} habitaciones`;

export const minPricePhrase = (price: number) => `desde ${price}`;

export const maxPricePhrase = (price: number) => `hasta ${price}`;

export const MAX_QUOTED_SEARCH_LENGTH = 80;

export const TRUNCATION_MARK = '…';

export const noMatchAnswer = (search: string) => `No encontré resultados exactos para «${search}».`;

export const alternativesIntro = (list: string) => `Sí hay resultados para: ${list}.`;

export const alternativeWithCount = (label: string, count: number) => `${label} (${count})`;
