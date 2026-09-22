import { Labels } from '../hooks/useLabels';
import { labels as defaultLabels } from '../constants/labels';
import { MAX_COMMAND_WORDS, WORD_SEPARATOR_PATTERN } from '../constants/registrationIntents';
import { generatePropertyTitle } from '../services/chatApi';
import {
  Property,
  PROPERTY_TYPE_LABEL_ES,
  PropertyDraft,
} from '../types/property';

export const REGISTER_COMMAND = '/agregar-propiedad';
export const CANCEL_PHRASES = ['cancelar registro', 'cancelar'];

export function isConfirmIntent(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'confirmar y publicar',
    'confirmar',
    'publicar',
    'confirmo',
    'publicala',
    'publicalo',
    'publicar propiedad',
    'sí',
    'si',
    'adelante',
    'todo bien',
    'de acuerdo',
    'correcto',
    'está bien',
    'esta bien',
    'dale',
    'perfecto',
    'listo',
    'ok',
    'proceder',
  ];
  return phrases.some((p) => lower === p || lower.startsWith(p + ' ') || lower.endsWith(' ' + p));
}

export function isShortCommand(text: string): boolean {
  return text.trim().split(WORD_SEPARATOR_PATTERN).length <= MAX_COMMAND_WORDS;
}

export function isPublishRequest(text: string): boolean {
  return isShortCommand(text) && isConfirmIntent(text);
}

export function isContinueIntent(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'continuar sin fotos',
    'continuar',
    'sin fotos',
    'no tengo fotos',
    'no quiero fotos',
    'omitir fotos',
    'omitir',
    'seguir',
    'pasar',
    'siguiente',
    'después',
    'despues',
    'más tarde',
    'mas tarde',
    'ninguna',
    'no por ahora',
    'no',
  ];
  return phrases.some((p) => lower === p || lower.startsWith(p + ' ') || lower.endsWith(' ' + p));
}

export function isLocationIntent(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'fijar ubicación',
    'fijar ubicacion',
    'marcar ubicación',
    'marcar ubicacion',
    'abrir mapa',
    'ver mapa',
    'mapa',
    'ubicar',
    'ubicación',
    'ubicacion',
    'poner ubicación',
    'poner ubicacion',
    'localización',
    'localizacion',
  ];
  return phrases.some((p) => lower === p || lower.includes(p));
}

export function isPhotosIntent(text: string): boolean {
  if (isContinueIntent(text)) return false;
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'adjuntar fotos',
    'adjuntar más fotos',
    'adjuntar mas fotos',
    'agregar fotos',
    'subir fotos',
    'poner fotos',
    'cambiar fotos',
    'añadir fotos',
    'anadir fotos',
    'fotos',
    'imágenes',
    'imagenes',
  ];
  return phrases.some((p) => lower === p || lower.includes(p));
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  VES: 'Bs.',
  EUR: '€',
};

export function formatDraftSummary(draft: PropertyDraft, labels: Labels = defaultLabels): string {
  const opLabel = draft.operation_type === 'rent' ? labels.livingDraft.rent : labels.livingDraft.sale;
  const typeLabel = draft.property_type ? PROPERTY_TYPE_LABEL_ES[draft.property_type] : '—';
  const currencySymbol = (draft.currency && CURRENCY_SYMBOLS[draft.currency]) || '€';
  const priceLabel = draft.price !== undefined ? `${draft.price.toLocaleString('es-ES')} ${currencySymbol}` : '—';

  return [
    `**Referencia catastral:** ${draft.catastro || '—'}`,
    `**Operación:** ${opLabel}`,
    `**Tipo:** ${typeLabel}`,
    `**Precio:** ${priceLabel}`,
    `**Habitaciones:** ${draft.bedrooms ?? '—'} · **Baños:** ${draft.bathrooms ?? '—'}`,
    `**Metros:** ${draft.square_meters ?? '—'} ${labels.propertyCard.sqmSuffix}`,
    `**Ubicación:** ${draft.address || '—'}, ${draft.city || '—'}`,
  ].join('\n\n');
}

export function generateMessageId(prefix: 'user' | 'assistant'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDraftPreviewProperty(draft: PropertyDraft): Property {
  return {
    id: 'draft-preview',
    catastro: draft.catastro,
    title: draft.title || generatePropertyTitle(draft),
    property_type: draft.property_type!,
    operation_type: draft.operation_type,
    price: draft.price ?? 0,
    bedrooms: draft.bedrooms ?? 0,
    bathrooms: draft.bathrooms ?? 0,
    square_meters: draft.square_meters ?? 0,
    city: draft.city ?? '',
    address: draft.address ?? '',
    latitude: draft.latitude,
    longitude: draft.longitude,
    description: draft.description,
    status: 'Available',
    image_url: draft.images?.[0] || '',
    images: draft.images || [],
    amenities: draft.amenities || [],
  };
}

export function buildPropertyRouteParams(property: Property) {
  return {
    id: property.id,
    title: property.title,
    price: property.price.toString(),
    city: property.city,
    ...(property.address ? { address: property.address } : {}),
    bedrooms: property.bedrooms.toString(),
    bathrooms: property.bathrooms.toString(),
    square_meters: property.square_meters.toString(),
    image_url: property.image_url,
    property_type: property.property_type,
    ...(property.operation_type ? { operation_type: property.operation_type } : {}),
    ...(property.description ? { description: property.description } : {}),
    ...(property.images && property.images.length > 0
      ? { images: JSON.stringify(property.images) }
      : {}),
    ...(property.amenities && property.amenities.length > 0
      ? { amenities: JSON.stringify(property.amenities) }
      : {}),
    ...(typeof property.latitude === 'number' ? { lat: property.latitude.toString() } : {}),
    ...(typeof property.longitude === 'number' ? { lng: property.longitude.toString() } : {}),
    ...(property.agency_name ? { agency_name: property.agency_name } : {}),
    ...(property.agent_name ? { agent_name: property.agent_name } : {}),
  };
}
