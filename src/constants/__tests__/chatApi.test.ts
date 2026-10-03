import {
  AUDIO_REQUEST_TIMEOUT_MS,
  DEFAULT_QUERY_LIMIT,
  DRAFT_CITIES,
  EDGE_FUNCTIONS,
  PROPERTY_TYPE_SUGGESTION_LABELS,
  PROMPT_FILTER_CITIES,
  SQFT_TO_SQM_RATIO,
  SUGGESTION_FETCH_LIMIT,
  SUGGESTION_MAX_COUNT,
  SUGGESTION_PRICE_ROUNDING_STEP,
  VOICE_NOTE_MIME_TYPE,
} from '../chatApi';

describe('chatApi constants', () => {
  it('defines audio request timeout and voice note mime type', () => {
    expect(AUDIO_REQUEST_TIMEOUT_MS).toBe(20000);
    expect(VOICE_NOTE_MIME_TYPE).toBe('audio/mp4');
  });

  it('defines suggestion parameters and property type labels', () => {
    expect(SUGGESTION_FETCH_LIMIT).toBe(8);
    expect(SUGGESTION_MAX_COUNT).toBe(4);
    expect(SUGGESTION_PRICE_ROUNDING_STEP).toBe(50000);
    expect(PROPERTY_TYPE_SUGGESTION_LABELS.Apartment).toBe('Departamentos');
    expect(PROPERTY_TYPE_SUGGESTION_LABELS.Condo).toBe('Condominios');
  });

  it('defines query limits and unit conversion ratios', () => {
    expect(DEFAULT_QUERY_LIMIT).toBe(10);
    expect(SQFT_TO_SQM_RATIO).toBeCloseTo(0.092903, 6);
  });

  it('contains expected prompt and draft cities', () => {
    expect(PROMPT_FILTER_CITIES).toContain('Austin');
    expect(PROMPT_FILTER_CITIES).toContain('Miami');
    expect(DRAFT_CITIES).toContain('Madrid');
    expect(DRAFT_CITIES).toContain('Valencia');
  });

  it('defines known Supabase Edge Function names', () => {
    expect(EDGE_FUNCTIONS.CHAT_QUERY).toBe('chat-query');
    expect(EDGE_FUNCTIONS.PROPERTY_INTAKE).toBe('property-intake');
    expect(EDGE_FUNCTIONS.PROPERTY_PUBLISH).toBe('property-publish');
    expect(EDGE_FUNCTIONS.PROPERTY_DESCRIBE).toBe('property-describe');
  });
});
