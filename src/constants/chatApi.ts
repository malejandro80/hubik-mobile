export const AUDIO_REQUEST_TIMEOUT_MS = 20_000;

export const VOICE_NOTE_MIME_TYPE = 'audio/mp4';

export const SUGGESTION_FETCH_LIMIT = 8;

export const SUGGESTION_MAX_COUNT = 4;

export const SUGGESTION_PRICE_ROUNDING_STEP = 50_000;

export const PROPERTY_TYPE_SUGGESTION_LABELS: Record<string, string> = {
  Apartment: 'Departamentos',
  Condo: 'Condominios',
  Townhouse: 'Casas adosadas',
  Studio: 'Estudios',
  'Single Family': 'Casas familiares',
};

export const PROMPT_FILTER_CITIES = [
  'Austin',
  'Miami',
  'Denver',
  'Seattle',
  'New York',
] as const;

export { SQFT_TO_SQM_RATIO } from '../../supabase/functions/_shared/promptFiltersConstants';

export const DEFAULT_QUERY_LIMIT = 10;

export const DRAFT_CITIES = [
  'Austin',
  'Miami',
  'Denver',
  'Seattle',
  'New York',
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
] as const;

export const EDGE_FUNCTIONS = {
  CHAT_QUERY: 'chat-query',
  PROPERTY_INTAKE: 'property-intake',
  PROPERTY_PUBLISH: 'property-publish',
  PROPERTY_DESCRIBE: 'property-describe',
  PROPERTY_ASK: 'property-ask',
} as const;
