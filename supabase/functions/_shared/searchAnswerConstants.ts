export const GEMINI_ANSWER_MODEL = 'gemini-3.5-flash-lite';

export const ANSWER_TIMEOUT_MS = 4000;

export const MAX_SUGGESTIONS = 3;

export const MAX_ANSWER_LENGTH = 600;

export const MAX_SUGGESTION_LENGTH = 60;

export const MAX_FACT_ROWS = 10;

export const MAX_ALTERNATIVE_CITIES = 5;

export const ANSWER_FACT_FIELDS = [
  'id',
  'title',
  'property_type',
  'operation_type',
  'price',
  'currency',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'amenities',
] as const;

export const PROPERTY_TYPE_PLURALS: Record<string, string> = {
  Apartment: 'apartamentos',
  'Single Family': 'casas familiares',
  Townhouse: 'casas adosadas',
  Condo: 'condominios',
  Studio: 'estudios',
};

export const DEFAULT_PROPERTY_PLURAL = 'propiedades';

export const NO_RESULTS_ANSWER = 'No encontré propiedades que coincidan con tu búsqueda.';

export const noResultsAlternatives = (cities: string[]) => `Hay propiedades disponibles en ${cities.join(', ')}.`;

export const resultsAnswer = (count: number, plural: string, city?: string) =>
  `Encontré ${count} ${plural}${city ? ` en ${city}` : ''} que coinciden con tu búsqueda:`;

export const citySuggestion = (city: string) => `Propiedades en ${city}`;

export const cheaperSuggestion = (city: string) => `Propiedades más baratas en ${city}`;

export const luxurySuggestion = (city: string) => `Casas de lujo en ${city}`;

export const geminiGenerateUrl = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
