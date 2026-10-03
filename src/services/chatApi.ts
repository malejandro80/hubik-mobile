import { FunctionsFetchError } from '@supabase/supabase-js';
import {
  OperationType,
  Property,
  PropertyDraft,
  PROPERTY_DRAFT_FIELD_LABELS,
  PROPERTY_TYPE_LABEL_ES,
  REQUIRED_PROPERTY_DRAFT_FIELDS,
} from '../types/property';
import { extractAmenityKeywords, normalizeAmenities } from '../lib/amenities';
import { supabase } from '../lib/supabase';
import { LISTING_COLUMNS, PUBLIC_PROPERTY_COLUMNS } from '../constants/propertyColumns';
import {
  CATASTRO_JUST_PROVIDED_PREFIX,
  CATASTRO_LAST_VARIANTS,
  DESCRIBE_INVITE_VARIANTS,
  MISSING_FIELDS_PREFIX_VARIANTS,
  MISSING_FIELDS_SUFFIX_VARIANTS,
  READY_TO_CONFIRM_VARIANTS,
} from '../constants/intakeMessages';
import {
  AUDIO_REQUEST_TIMEOUT_MS,
  DEFAULT_QUERY_LIMIT,
  DRAFT_CITIES,
  EDGE_FUNCTIONS,
  PROPERTY_TYPE_SUGGESTION_LABELS,
  SUGGESTION_FETCH_LIMIT,
  SUGGESTION_MAX_COUNT,
  SUGGESTION_PRICE_ROUNDING_STEP,
  VOICE_NOTE_MIME_TYPE,
} from '../constants/chatApi';
import { extractPropertyType, parsePromptFilters } from '../lib/promptFilters';

export { AUDIO_REQUEST_TIMEOUT_MS, VOICE_NOTE_MIME_TYPE, parsePromptFilters };

async function invokeAudioFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const attempt = (): Promise<T> =>
    supabase.functions.invoke<T>(functionName, { body, timeout: AUDIO_REQUEST_TIMEOUT_MS }).then(({ data, error }) => {
      if (error) throw error;
      if (data) return data;
      throw new Error(`Invalid response received from ${functionName} function (audio)`);
    });

  try {
    return await attempt();
  } catch (err: any) {
    if (!(err instanceof FunctionsFetchError)) throw err;
    console.warn(`[chatApi] ${functionName} audio request failed (${err?.context?.message || err.message}), retrying once...`);
    try {
      return await attempt();
    } catch (retryErr: any) {
      if (retryErr instanceof FunctionsFetchError) {
        throw new Error('No se pudo conectar para procesar la nota de voz. Verifica tu conexión e inténtalo de nuevo.');
      }
      throw retryErr;
    }
  }
}

export interface ChatResponse {
  answer: string;
  data: Property[];
  applied_filters?: Record<string, any>;
  suggestions?: string[];
}

export interface PropertyIntakeResponse {
  data: PropertyDraft;
  missing_fields: (keyof PropertyDraft)[];
  assistant_message: string;
  ready_to_confirm: boolean;
}

export interface AudioPayload {
  data: string;
  mimeType: string;
}
export async function fetchDynamicSuggestions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('city, property_type, price')
      .order('created_at', { ascending: false })
      .limit(SUGGESTION_FETCH_LIMIT);

    if (error || !data || data.length === 0) {
      return [];
    }

    const suggestions: string[] = [];
    const seen = new Set<string>();

    for (const item of data) {
      if (!item.city) continue;
      const type = (item.property_type && PROPERTY_TYPE_SUGGESTION_LABELS[item.property_type]) || 'Propiedades';
      const roundedPrice = item.price ? Math.ceil(item.price / SUGGESTION_PRICE_ROUNDING_STEP) * 50 : 0;
      const phrase =
        roundedPrice > 0
          ? `${type} en ${item.city} por menos de $${roundedPrice}k`
          : `${type} en ${item.city}`;

      if (!seen.has(phrase)) {
        seen.add(phrase);
        suggestions.push(phrase);
      }
      if (suggestions.length >= SUGGESTION_MAX_COUNT) break;
    }

    return suggestions;
  } catch {
    return [];
  }
}


export async function querySupabaseDirectly(message: string): Promise<ChatResponse> {
  const filters = parsePromptFilters(message);

  let query = supabase
    .from('property_listings')
    .select(LISTING_COLUMNS);

  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  if (filters.amenities && filters.amenities.length > 0) {
    query = query.contains('amenities', filters.amenities);
  }
  if (filters.property_type) {
    query = query.eq('property_type', filters.property_type);
  }
  if (filters.min_price !== undefined) {
    query = query.gte('price', filters.min_price);
  }
  if (filters.max_price !== undefined) {
    query = query.lte('price', filters.max_price);
  }
  if (filters.min_bedrooms !== undefined) {
    query = query.gte('bedrooms', filters.min_bedrooms);
  }
  if (filters.max_bedrooms !== undefined) {
    query = query.lte('bedrooms', filters.max_bedrooms);
  }
  if (filters.min_square_meters !== undefined) {
    query = query.gte('square_meters', filters.min_square_meters);
  }
  if (filters.max_square_meters !== undefined) {
    query = query.lte('square_meters', filters.max_square_meters);
  }

  if (filters.sort_by === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (filters.sort_by === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('price', { ascending: true });
  }

  query = query.limit(filters.limit || DEFAULT_QUERY_LIMIT);

  const { data, error } = await query;

  if (error) {
    console.error('❌ [chatApi] Direct Supabase query error:', error.message);
    throw new Error(`Database query error: ${error.message}`);
  }

  const properties = (data || []) as Property[];

  let answer: string;
  if (properties.length === 0) {
    answer = `No encontré propiedades en la base de datos que coincidan con "${message}". ¡Intenta buscar en Austin, Miami, Denver, Seattle o New York!`;
  } else {
    const cityText = filters.city ? ` en ${filters.city}` : '';
    let typeText = ' propiedades';
    if (filters.property_type === 'Apartment') typeText = ' apartamentos';
    else if (filters.property_type === 'Single Family') typeText = ' casas familiares';
    else if (filters.property_type === 'Townhouse') typeText = ' casas adosadas';
    else if (filters.property_type === 'Condo') typeText = ' condominios';
    else if (filters.property_type === 'Studio') typeText = ' estudios';

    answer = `Encontré ${properties.length}${typeText}${cityText} en la base de datos de Hubik:`;
  }

  const suggestions: string[] = [];
  if (filters.city) {
    suggestions.push(`Propiedades más baratas en ${filters.city}`);
    suggestions.push(`Casas de lujo en ${filters.city}`);
  } else if (properties.length > 0 && properties[0].city) {
    suggestions.push(`Propiedades en ${properties[0].city}`);
  }

  return {
    answer,
    data: properties,
    applied_filters: filters,
    suggestions,
  };
}


function extractOperationType(lower: string): OperationType | undefined {
  if (
    lower.includes('alquilar') ||
    lower.includes('alquiler') ||
    lower.includes('arriendo') ||
    lower.includes('renta') ||
    lower.includes('rentar') ||
    lower.includes('rent')
  ) {
    return 'rent';
  }
  if (lower.includes('vender') || lower.includes('vendo') || lower.includes('venta') || lower.includes('sale')) {
    return 'sale';
  }
  return undefined;
}

function extractPrice(text: string): number | undefined {
  const lower = text.toLowerCase();

  const milMatch = lower.match(
    /(?:(?:precio|valor|cuesta|por|en|pido)?\s*(?:es\s*(?:de\s*)?)?)?(?:\$|€)?\s*(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b(?:\s*(?:€|euros?|eur|\$|usd|dólares?|dolares?|pesos?))?/i
  );
  if (milMatch && milMatch[1]) {
    const rawNum = parseFloat(milMatch[1].replace(',', '.'));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000);
    }
  }

  const millonesMatch = lower.match(
    /(?:(?:precio|valor|cuesta|por|en|pido)?\s*(?:es\s*(?:de\s*)?)?)?(?:\$|€)?\s*(\d+(?:[.,]\d+)?)\s*(?:millones?|m)\b(?:\s*(?:€|euros?|eur|\$|usd|dólares?|dolares?|pesos?))?/i
  );
  if (millonesMatch && millonesMatch[1]) {
    const rawNum = parseFloat(millonesMatch[1].replace(',', '.'));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000000);
    }
  }

  const suffixMatch = lower.match(
    /(\d{1,3}(?:[.,]\d{3})+|\d{3,})(?:[.,]\d{1,2})?\s*(?:€|euros?|eur\b|\$|usd|dólares?|dolares?|pesos?)/i
  );
  if (suffixMatch) {
    const raw = suffixMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  const prefixMatch = lower.match(/(?:[$€])\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})(?:[.,]\d{1,2})?/i);
  if (prefixMatch) {
    const raw = prefixMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  const keywordMatch = lower.match(
    /(?:precio|valor|cuesta|pido)\s*(?:es\s*(?:de\s*)?|:\s*)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})/i
  );
  if (keywordMatch) {
    const raw = keywordMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  return undefined;
}

function extractCatastro(text: string, alreadyProvided: boolean): string | undefined {
  const legacyMatch = text.match(/\bLEGACY-[A-Za-z0-9]{5,13}\b/i);
  if (legacyMatch) return legacyMatch[0].toUpperCase();

  // Official grouping (7-7-4-2 or 14-4-2), space- or hyphen-separated. Checked before the
  // loose continuous pattern below: that pattern's character class includes hyphens, so on a
  // full 4-group hyphenated reference it would otherwise grab an incomplete 14-20 char slice
  // instead of the whole code.
  const spacedMatch = text.match(
    /\b([A-Za-z0-9]{7}\s+[A-Za-z0-9]{7}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2}|[A-Za-z0-9]{14}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2})\b/
  );
  if (spacedMatch) return spacedMatch[0].replace(/\s+/g, '').toUpperCase();

  const hyphenGroupMatch = text.match(
    /\b([A-Za-z0-9]{7}-[A-Za-z0-9]{7}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2}|[A-Za-z0-9]{14}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2})\b/
  );
  if (hyphenGroupMatch) return hyphenGroupMatch[0].replace(/-/g, '').toUpperCase();

  const match = text.match(
    /\b(?=[A-Za-z0-9-]{14,20}\b)(?=[A-Za-z0-9-]*[0-9])(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9-]{14,20}\b/
  );
  if (match) return match[0].toUpperCase();

  const trimmed = text.trim();
  if (/^[A-Za-z0-9-]{14,20}$/.test(trimmed) && /[0-9]/.test(trimmed) && /[A-Za-z]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // RFC 006 only requires a non-empty string for catastro (format/checksum validation against
  // the real cadastre is explicitly out of scope). While it's still the field being collected,
  // a single whitespace-free reply with a digit in it is almost certainly the user answering
  // directly, even when it doesn't match the shapes above (test/dummy values, shorter internal
  // references, etc). Gated to before catastro is already known so it can't misfire on a later
  // single-word answer (bedroom count, m2, ...), and requires a digit so plain replies like
  // "gracias" or "hola" aren't mistaken for a reference.
  if (!alreadyProvided && /^\S+$/.test(trimmed) && trimmed.length >= 4 && /[0-9]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return undefined;
}

function pickVariant(variants: readonly string[] | string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

function buildAssistantMessage(missing: (keyof PropertyDraft)[], catastroJustProvided?: boolean): string {
  const prefix = catastroJustProvided
    ? CATASTRO_JUST_PROVIDED_PREFIX
    : '';

  if (missing.length === 0) {
    return `${prefix}${pickVariant(READY_TO_CONFIRM_VARIANTS)}`;
  }
  if (missing.length >= REQUIRED_PROPERTY_DRAFT_FIELDS.length) {
    return pickVariant(DESCRIBE_INVITE_VARIANTS);
  }
  const askable = missing.filter((field) => field !== 'catastro');
  if (askable.length === 0) {
    return `${prefix}${pickVariant(CATASTRO_LAST_VARIANTS)}`;
  }
  const labels = askable.map((field) => PROPERTY_DRAFT_FIELD_LABELS[field as keyof typeof PROPERTY_DRAFT_FIELD_LABELS]);
  const joined =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  return `${prefix}${pickVariant(MISSING_FIELDS_PREFIX_VARIANTS)}${joined}. ${pickVariant(MISSING_FIELDS_SUFFIX_VARIANTS)}`;
}

export function parsePropertyDraft(message: string, known: PropertyDraft): PropertyIntakeResponse {
  const lower = message.toLowerCase();
  const extracted: PropertyDraft = {};

  const catastro = extractCatastro(message, known.catastro !== undefined);
  if (catastro) extracted.catastro = catastro;

  const propertyType = extractPropertyType(lower);
  if (propertyType) extracted.property_type = propertyType;

  const operationType = extractOperationType(lower);
  if (operationType) extracted.operation_type = operationType;

  const price = extractPrice(message);
  if (price !== undefined) extracted.price = price;

  const bedMatch = message.match(/(\d+)\s*hab\w*/i);
  if (bedMatch) extracted.bedrooms = parseInt(bedMatch[1], 10);

  const bathMatch = message.match(/(\d+(?:[.,]\d+)?)\s*ba[ñn]o\w*/i);
  if (bathMatch) extracted.bathrooms = parseFloat(bathMatch[1].replace(',', '.'));

  const areaMatch = message.match(/(\d+)\s*(?:m2|m²|metros(?:\s*cuadrados)?)/i);
  if (areaMatch) extracted.square_meters = parseInt(areaMatch[1], 10);

  const addressMatch = message.match(/calle\s+[^,.]+/i);
  if (addressMatch) extracted.address = addressMatch[0].trim();

  for (const city of DRAFT_CITIES) {
    if (lower.includes(city.toLowerCase())) {
      extracted.city = city;
      break;
    }
  }

  const data: PropertyDraft = { ...known, ...extracted };
  data.amenities = normalizeAmenities([...(known.amenities ?? []), ...extractAmenityKeywords(message)]);
  const missing_fields = REQUIRED_PROPERTY_DRAFT_FIELDS.filter((field) => data[field] === undefined);
  const catastroJustProvided = Boolean(extracted.catastro) && extracted.catastro !== known.catastro;

  return {
    data,
    missing_fields,
    assistant_message: buildAssistantMessage(missing_fields, catastroJustProvided),
    ready_to_confirm: missing_fields.length === 0,
  };
}

export function generatePropertyTitle(draft: PropertyDraft): string {
  const typeLabel = draft.property_type ? PROPERTY_TYPE_LABEL_ES[draft.property_type] : 'Propiedad';
  const opLabel = draft.operation_type === 'rent' ? 'en alquiler' : 'en venta';
  const location = draft.city ? ` en ${draft.city}` : '';
  return `${typeLabel} ${opLabel}${location}`.trim();
}

export async function intakeProperty(message: string, known: PropertyDraft): Promise<PropertyIntakeResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<PropertyIntakeResponse>(EDGE_FUNCTIONS.PROPERTY_INTAKE, {
      body: { message, known },
    });

    if (error) throw error;
    if (data) return data;

    throw new Error('Invalid response received from property-intake function');
  } catch (err: any) {
    console.warn(
      '[chatApi] property-intake Edge Function unreachable or failed. Using local heuristic extraction...',
      err?.message
    );
    return parsePropertyDraft(message, known);
  }
}

export async function intakePropertyAudio(
  audio: AudioPayload,
  known: PropertyDraft
): Promise<PropertyIntakeResponse & { transcript: string }> {
  return invokeAudioFunction<PropertyIntakeResponse & { transcript: string }>(EDGE_FUNCTIONS.PROPERTY_INTAKE, { audio, known });
}

async function publishPropertyDirect(draft: PropertyDraft): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert({
      catastro: draft.catastro,
      title: draft.title || generatePropertyTitle(draft),
      property_type: draft.property_type,
      operation_type: draft.operation_type,
      price: draft.price,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      square_meters: draft.square_meters,
      city: draft.city,
      address: draft.address,
      latitude: draft.latitude,
      longitude: draft.longitude,
      description: draft.description,
      status: 'Available',
      images: draft.images || [],
      image_url: draft.images?.[0] || null,
      amenities: normalizeAmenities(draft.amenities),
    })
    .select(PUBLIC_PROPERTY_COLUMNS)
    .single();

  if (error) {
    throw new Error(`No se pudo publicar la propiedad: ${error.message}`);
  }

  return {
    ...(data as unknown as Property),
    address: draft.address,
    latitude: draft.latitude,
    longitude: draft.longitude,
  } as Property;
}

export async function publishProperty(draft: PropertyDraft, landlordId?: string | null): Promise<Property> {
  try {
    const { data, error } = await supabase.functions.invoke<{ property: Property }>(EDGE_FUNCTIONS.PROPERTY_PUBLISH, {
      body: { property: draft, ...(landlordId ? { landlord_id: landlordId } : {}) },
    });

    if (error) throw error;
    if (data?.property) return data.property;

    throw new Error('Invalid response received from property-publish function');
  } catch (err: any) {
    console.warn(
      '[chatApi] property-publish Edge Function unreachable or failed. Inserting directly...',
      err?.message
    );
    return publishPropertyDirect(draft);
  }
}

export async function sendChatQuery(message: string): Promise<ChatResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<ChatResponse>(
      EDGE_FUNCTIONS.CHAT_QUERY,
      {
        body: { message },
      }
    );

    if (error) {
      throw error;
    }

    if (data && data.answer) {
      return data;
    }

    throw new Error('Invalid response received from chat-query function');
  } catch (err: any) {
    console.warn(
      '[chatApi] Supabase Edge Function unreachable or failed. Querying Supabase database directly...',
      err?.message
    );
    return querySupabaseDirectly(message);
  }
}

export async function generatePropertyDescription(known: PropertyDraft): Promise<{ description: string }> {
  const { data, error } = await supabase.functions.invoke<{ description: string }>(EDGE_FUNCTIONS.PROPERTY_DESCRIBE, {
    body: { known },
  });

  if (error) throw error;
  if (data?.description) return data;

  throw new Error('Invalid response received from property-describe function');
}

export async function sendChatQueryAudio(audio: AudioPayload): Promise<ChatResponse & { transcript: string }> {
  return invokeAudioFunction<ChatResponse & { transcript: string }>(EDGE_FUNCTIONS.CHAT_QUERY, { audio });
}

export async function transcribeVoiceNote(audio: AudioPayload): Promise<string> {
  const { transcript } = await invokeAudioFunction<{ transcript?: string }>(EDGE_FUNCTIONS.CHAT_QUERY, { audio, transcribe_only: true });
  const text = typeof transcript === 'string' ? transcript.trim() : '';
  if (!text) throw new Error('Empty transcript');
  return text;
}
