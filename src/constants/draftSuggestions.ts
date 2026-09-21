export const MIN_RECOMMENDED_PHOTOS = 3;

export const MIN_DESCRIPTION_LENGTH = 80;

export const MAX_SUGGESTIONS = 3;

export type SuggestionKey =
  | 'no_photos'
  | 'few_photos'
  | 'no_pin'
  | 'no_description'
  | 'stale_description'
  | 'short_description'
  | 'no_amenities';

export const SUGGESTION_PRIORITY: SuggestionKey[] = [
  'no_photos',
  'few_photos',
  'no_pin',
  'no_description',
  'stale_description',
  'short_description',
  'no_amenities',
];
