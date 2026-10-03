import {
  OperationType,
  PropertyDraft,
  PROPERTY_DRAFT_FIELD_LABELS,
  PROPERTY_TYPE_LABEL_ES,
  REQUIRED_PROPERTY_DRAFT_FIELDS,
} from '../types/property';
import { extractAmenityKeywords, normalizeAmenities } from './amenities';
import {
  CATASTRO_JUST_PROVIDED_PREFIX,
  CATASTRO_LAST_VARIANTS,
  DESCRIBE_INVITE_VARIANTS,
  MISSING_FIELDS_PREFIX_VARIANTS,
  MISSING_FIELDS_SUFFIX_VARIANTS,
  READY_TO_CONFIRM_VARIANTS,
} from '../constants/intakeMessages';
import { DRAFT_CITIES } from '../constants/chatApi';
import { extractPropertyType } from './promptFilters';

export interface PropertyIntakeResponse {
  data: PropertyDraft;
  missing_fields: (keyof PropertyDraft)[];
  assistant_message: string;
  ready_to_confirm: boolean;
}

export function extractOperationType(lower: string): OperationType | undefined {
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

export function extractPrice(text: string): number | undefined {
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

export function extractCatastro(text: string, alreadyProvided: boolean): string | undefined {
  const legacyMatch = text.match(/\bLEGACY-[A-Za-z0-9]{5,13}\b/i);
  if (legacyMatch) return legacyMatch[0].toUpperCase();

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

  if (!alreadyProvided && /^\S+$/.test(trimmed) && trimmed.length >= 4 && /[0-9]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return undefined;
}

function pickVariant(variants: readonly string[] | string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

export function buildAssistantMessage(missing: (keyof PropertyDraft)[], catastroJustProvided?: boolean): string {
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

export function extractCatastroSkip(text: string, isOnlyCatastroRemaining: boolean): boolean {
  const lower = text.toLowerCase().trim();
  const explicitSkip =
    /\b(no\s+tengo\s+(el\s+)?catastro|no\s+tengo\s+(la\s+)?(c[eé]dula|ficha|referencia)(\s+catastral)?|sin\s+catastro|sin\s+(c[eé]dula|ficha|referencia)(\s+catastral)?|no\s+(dispongo|poseo)\s+de\s+catastro|omitir\s+catastro|no\s+hay\s+catastro|no\s+cuenta\s+con\s+catastro|no\s+posee\s+catastro)\b/i.test(
      lower
    );
  if (explicitSkip) return true;

  if (isOnlyCatastroRemaining) {
    const contextualSkip =
      /^(no(\s+tengo|\s+lo\s+tengo|\s+la\s+tengo|\s+dispongo|\s+poseo)?|omitir|paso|despu[eé]s|luego|ningun[oa]|no\s+aplica)$/i.test(
        lower
      );
    if (contextualSkip) return true;
  }

  return false;
}

export function parsePropertyDraft(message: string, known: PropertyDraft): PropertyIntakeResponse {
  const lower = message.toLowerCase();
  const extracted: PropertyDraft = {};

  const isOnlyCatastroRemaining =
    known.catastro === undefined &&
    !known.catastro_skipped &&
    REQUIRED_PROPERTY_DRAFT_FIELDS.every((f) => f === 'catastro' || known[f] !== undefined);

  if (extractCatastroSkip(message, isOnlyCatastroRemaining)) {
    extracted.catastro_skipped = true;
  }

  const catastro = extractCatastro(message, known.catastro !== undefined);
  if (catastro) {
    extracted.catastro = catastro;
    extracted.catastro_skipped = false;
  }

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
  const missing_fields = REQUIRED_PROPERTY_DRAFT_FIELDS.filter((field) => {
    if (field === 'catastro') {
      return !data.catastro && !data.catastro_skipped;
    }
    return data[field] === undefined;
  });
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
