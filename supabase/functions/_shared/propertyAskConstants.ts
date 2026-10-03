export const PROPERTY_ASK_MODEL = 'gemini-3.5-flash-lite';

export const MAX_QUESTION_LENGTH = 300;

export const MAX_HISTORY_TURNS = 4;

export const MAX_HISTORY_ANSWER_LENGTH = 1200;

export const MAX_ANSWER_LENGTH = 1200;

export const MAX_COMPARABLES = 8;

export const COMPARABLE_FETCH_COUNT = 12;

export const ASK_TIMEOUT_MS = 8000;

export const ASK_REFUSAL =
  'Por privacidad no puedo compartir esa información. Si te interesa la propiedad, usa el botón de contacto de la ficha.';

export const ASK_UNAVAILABLE = 'No pude responder en este momento. Inténtalo de nuevo en unos segundos.';

export const LISTING_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export const LISTING_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LISTING_FACT_FIELDS = [
  'title',
  'property_type',
  'operation_type',
  'price',
  'currency',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'sector',
  'description',
  'amenities',
] as const;

export const COMPARABLE_FACT_FIELDS = LISTING_FACT_FIELDS.filter((field) => field !== 'description');

export const SENSITIVE_TOPIC_PATTERNS = [
  ['owner', /\b(propietari[oa]s?|duen[oa]s?|arrendador(a|es)?|landlord|owner)\b/],
  [
    'exact_location',
    /(direccion (exacta|completa)|cual es la direccion|donde (queda|esta) exactamente|coordenadas|ubicacion exacta|latitud|longitud|numero de (la )?(casa|apartamento|puerta))/,
  ],
  ['cadastre', /catastr/],
  ['personal_contact', /\b(telefono|celular|movil|correo|email|e-mail|whatsapp|numero de contacto|contacto personal)\b/],
  ['other_clients', /(otros clientes|quien (mas )?(la )?(ha )?(visto|visitado|preguntado|alquilado|comprado)|quien vive|inquilin)/],
  ['unpublished_terms', /(precio minimo|ultimo precio|rebaja|descuento|negociable|aceptan? menos|cuanto (menos|bajan?)|oferta minima)/],
] as const;

export const PHONE_PATTERN = /\+?\d(?:[\s()-]*\d){9,}/;

export const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/;

export const URL_PATTERN = /(https?:\/\/|www\.)/i;

export const LISTING_CONTEXT_COLUMNS =
  'id, title, property_type, operation_type, price, currency, bedrooms, bathrooms, square_meters, city, sector, description, amenities';
