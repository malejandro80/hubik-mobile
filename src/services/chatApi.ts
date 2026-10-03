import { FunctionsFetchError } from '@supabase/supabase-js';
import { Property, PropertyDraft } from '../types/property';
import { normalizeAmenities } from '../lib/amenities';
import { supabase } from '../lib/supabase';
import { PUBLIC_PROPERTY_COLUMNS } from '../constants/propertyColumns';
import {
  AUDIO_REQUEST_TIMEOUT_MS,
  EDGE_FUNCTIONS,
  VOICE_NOTE_MIME_TYPE,
} from '../constants/chatApi';
import { parsePromptFilters } from '../lib/promptFilters';
import {
  generatePropertyTitle,
  parsePropertyDraft,
  PropertyIntakeResponse,
} from '../lib/offlinePropertyExtractor';
import {
  fetchDynamicSuggestions,
  querySupabaseDirectly,
} from './directSearchService';
import { AudioPayload, ChatResponse } from '../types/chat';

export {
  AUDIO_REQUEST_TIMEOUT_MS,
  VOICE_NOTE_MIME_TYPE,
  parsePromptFilters,
  generatePropertyTitle,
  parsePropertyDraft,
  fetchDynamicSuggestions,
  querySupabaseDirectly,
};
export type { ChatResponse, PropertyIntakeResponse, AudioPayload };

async function invokeAudioFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const attempt = (): Promise<T> =>
    supabase.functions.invoke<T>(functionName, { body, timeout: AUDIO_REQUEST_TIMEOUT_MS }).then(({ data, error }) => {
      if (error) throw error;
      if (data) return data;
      throw new Error(`Invalid response received from ${functionName} function (audio)`);
    });

  try {
    return await attempt();
  } catch (err: unknown) {
    if (!(err instanceof FunctionsFetchError)) throw err;
    try {
      return await attempt();
    } catch (retryErr: unknown) {
      if (retryErr instanceof FunctionsFetchError) {
        throw new Error('No se pudo conectar para procesar la nota de voz. Verifica tu conexión e inténtalo de nuevo.');
      }
      throw retryErr;
    }
  }
}

export async function intakeProperty(message: string, known: PropertyDraft): Promise<PropertyIntakeResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<PropertyIntakeResponse>(EDGE_FUNCTIONS.PROPERTY_INTAKE, {
      body: { message, known },
    });

    if (error) throw error;
    if (data) return data;

    throw new Error('Invalid response received from property-intake function');
  } catch {
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
  let isSuspectDuplicate = false;
  let suspectDuplicateId: string | null = null;
  let matchDistance: number | null = null;

  if (!draft.catastro && draft.latitude !== undefined && draft.longitude !== undefined) {
    try {
      const { data: duplicateMatches } = await supabase.rpc('check_property_duplicate', {
        p_latitude: draft.latitude,
        p_longitude: draft.longitude,
        p_property_type: draft.property_type,
        p_bedrooms: draft.bedrooms,
        p_bathrooms: draft.bathrooms,
        p_square_meters: draft.square_meters,
      });

      if (Array.isArray(duplicateMatches) && duplicateMatches.length > 0 && duplicateMatches[0]?.duplicate_id) {
        isSuspectDuplicate = true;
        suspectDuplicateId = duplicateMatches[0].duplicate_id;
        matchDistance = duplicateMatches[0].distance_meters;
      }
    } catch {
      isSuspectDuplicate = false;
    }
  }

  const status = isSuspectDuplicate ? 'Pending' : 'Available';

  const { data, error } = await supabase
    .from('properties')
    .insert({
      catastro: draft.catastro || null,
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
      status,
      images: draft.images || [],
      image_url: draft.images?.[0] || null,
      amenities: normalizeAmenities(draft.amenities),
    })
    .select(PUBLIC_PROPERTY_COLUMNS)
    .single();

  if (error) {
    throw new Error(`No se pudo publicar la propiedad: ${error.message}`);
  }

  if (isSuspectDuplicate && suspectDuplicateId) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        await supabase.from('property_duplicate_logs').insert({
          property_id: data.id,
          suspected_duplicate_of: suspectDuplicateId,
          agent_id: authData.user.id,
          distance_meters: matchDistance ?? 0,
          match_details: {
            property_type: draft.property_type,
            bedrooms: draft.bedrooms,
            bathrooms: draft.bathrooms,
            square_meters: draft.square_meters,
            latitude: draft.latitude,
            longitude: draft.longitude,
          },
          status: 'flagged',
        });
      }
    } catch {
      return {
        ...(data as unknown as Property),
        address: draft.address,
        latitude: draft.latitude,
        longitude: draft.longitude,
      } as Property;
    }
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
  } catch {
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
  } catch {
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
