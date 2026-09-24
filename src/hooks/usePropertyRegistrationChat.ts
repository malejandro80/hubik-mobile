import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCAL_ONLY_FIELDS } from '../constants/draftFields';
import { READY_NEEDS_MEDIA_VARIANTS, READY_TO_CONFIRM_VARIANTS } from '../constants/intakeMessages';
import { getChangedFields, getDescriptionKey, isReadyToPublish } from '../lib/draftStatus';
import { isSamePhotoSet } from '../lib/photoOrder';
import { DraftEditableField, FieldEditResult, validateDraftField } from '../lib/draftValidation';
import {
  AudioPayload,
  generatePropertyDescription,
  intakeProperty,
  intakePropertyAudio,
  PropertyIntakeResponse,
  publishProperty,
} from '../services/chatApi';
import { MAX_PROPERTY_IMAGES, uploadPropertyImages } from '../services/propertyImages';
import { Property, PropertyDraft } from '../types/property';
import { ClientCandidate } from '../types/auth';

export type ComposerPhase = 'idle' | 'composing';

export interface ComposerState {
  phase: ComposerPhase;
  draft: PropertyDraft;
  recentlyChanged: (keyof PropertyDraft)[];
  describing: boolean;
  descriptionFailed: boolean;
  describedFrom: string | null;
  landlord: ClientCandidate | null;
}

export interface IntakeOutcome {
  assistantMessage: string;
  readyToConfirm: boolean;
  draft: PropertyDraft;
}

export interface AddPhotosOutcome {
  images: string[];
  added: number;
}

const INITIAL_STATE: ComposerState = {
  phase: 'idle',
  draft: {},
  recentlyChanged: [],
  describing: false,
  descriptionFailed: false,
  describedFrom: null,
  landlord: null,
};

const generateSessionId = (): string => `d${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

const pickVariant = (variants: readonly string[]): string => variants[Math.floor(Math.random() * variants.length)];

// The "ready to confirm" chat message claims the listing is fully set up, but a draft with no
// photo and no map pin isn't really - swap in a message that asks for one of those instead of
// letting the assistant call an empty-media draft "done" (the panel below still allows
// publishing without them; this only affects the chat's wording).
const withMediaGate = (message: string, readyToConfirm: boolean, localDraft: PropertyDraft): string => {
  if (!readyToConfirm) return message;
  const hasPhotos = (localDraft.images?.length ?? 0) > 0;
  const hasLocation = localDraft.latitude !== undefined && localDraft.longitude !== undefined;
  if (hasPhotos || hasLocation) return message;
  const variant = READY_TO_CONFIRM_VARIANTS.find((candidate) => message.endsWith(candidate));
  if (!variant) return message;
  return `${message.slice(0, message.length - variant.length)}${pickVariant(READY_NEEDS_MEDIA_VARIANTS)}`;
};

const toOutcome = (response: PropertyIntakeResponse, localDraft: PropertyDraft): IntakeOutcome => ({
  assistantMessage: withMediaGate(response.assistant_message, response.ready_to_confirm, localDraft),
  readyToConfirm: response.ready_to_confirm,
  draft: response.data,
});

const pickLocalFields = (draft: PropertyDraft): Partial<PropertyDraft> =>
  Object.fromEntries(LOCAL_ONLY_FIELDS.filter((field) => draft[field] !== undefined).map((field) => [field, draft[field]]));

export function usePropertyRegistrationChat() {
  const [state, setState] = useState<ComposerState>(INITIAL_STATE);
  const stateRef = useRef<ComposerState>(state);
  const sessionRef = useRef<string>(generateSessionId());
  const describeInFlightRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const resetSession = useCallback((next: ComposerState) => {
    sessionRef.current = generateSessionId();
    setState(next);
  }, []);

  const start = useCallback(() => {
    resetSession({ ...INITIAL_STATE, phase: 'composing' });
  }, [resetSession]);

  const setLandlord = useCallback((landlord: ClientCandidate | null) => {
    setState((prev) => ({ ...prev, landlord }));
  }, []);

  const cancel = useCallback(() => {
    resetSession(INITIAL_STATE);
  }, [resetSession]);

  const requestDescription = useCallback(async (draftOverride?: PropertyDraft): Promise<{ description: string }> => {
    const sessionId = sessionRef.current;
    const snapshot = draftOverride ?? stateRef.current.draft;
    describeInFlightRef.current = true;
    setState((prev) => ({ ...prev, describing: true, descriptionFailed: false }));
    try {
      const { description } = await generatePropertyDescription(snapshot);
      if (sessionRef.current === sessionId) {
        setState((prev) => ({
          ...prev,
          describing: false,
          draft: { ...prev.draft, description },
          describedFrom: getDescriptionKey(snapshot),
        }));
      }
      return { description };
    } catch (error) {
      if (sessionRef.current === sessionId) {
        setState((prev) => ({ ...prev, describing: false, descriptionFailed: true }));
      }
      throw error;
    } finally {
      describeInFlightRef.current = false;
    }
  }, []);

  const autoDescribe = useCallback(
    (draft: PropertyDraft) => {
      const current = stateRef.current;
      const eligible =
        !describeInFlightRef.current &&
        !current.descriptionFailed &&
        current.describedFrom === null &&
        !draft.description &&
        isReadyToPublish(draft);
      if (eligible) requestDescription(draft).catch(() => undefined);
    },
    [requestDescription]
  );

  const applyIntake = useCallback(
    (response: PropertyIntakeResponse, sessionId: string) => {
      if (sessionRef.current !== sessionId) return;
      setState((prev) => {
        const draft = { ...response.data, ...pickLocalFields(prev.draft) };
        return { ...prev, phase: 'composing', draft, recentlyChanged: getChangedFields(prev.draft, draft) };
      });
      autoDescribe({ ...response.data, ...pickLocalFields(stateRef.current.draft) });
    },
    [autoDescribe]
  );

  const processMessage = useCallback(
    async (text: string): Promise<IntakeOutcome> => {
      const sessionId = sessionRef.current;
      const priorDraft = stateRef.current.draft;
      const response = await intakeProperty(text, priorDraft);
      applyIntake(response, sessionId);
      return toOutcome(response, priorDraft);
    },
    [applyIntake]
  );

  const processAudioMessage = useCallback(
    async (audio: AudioPayload): Promise<IntakeOutcome & { transcript: string }> => {
      const sessionId = sessionRef.current;
      const priorDraft = stateRef.current.draft;
      const response = await intakePropertyAudio(audio, priorDraft);
      applyIntake(response, sessionId);
      return { ...toOutcome(response, priorDraft), transcript: response.transcript };
    },
    [applyIntake]
  );

  const updateField = useCallback((field: DraftEditableField, raw: string): FieldEditResult => {
    const result = validateDraftField(field, raw);
    if (result.ok) {
      setState((prev) => ({
        ...prev,
        draft: { ...prev.draft, [field]: result.value },
        recentlyChanged: prev.recentlyChanged.filter((changed) => changed !== field),
      }));
      autoDescribe({ ...stateRef.current.draft, [field]: result.value });
    }
    return result;
  }, [autoDescribe]);

  const addPhotos = useCallback((uris: string[]): AddPhotosOutcome => {
    const before = stateRef.current.draft.images ?? [];
    const images = [...before, ...uris].slice(0, MAX_PROPERTY_IMAGES);
    setState((prev) => ({
      ...prev,
      draft: { ...prev.draft, images: [...(prev.draft.images ?? []), ...uris].slice(0, MAX_PROPERTY_IMAGES) },
    }));
    return { images, added: images.length - before.length };
  }, []);

  const removePhoto = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      draft: { ...prev.draft, images: (prev.draft.images ?? []).filter((_, i) => i !== index) },
    }));
  }, []);

  const movePhoto = useCallback((index: number, direction: 'up' | 'down') => {
    setState((prev) => {
      const images = [...(prev.draft.images ?? [])];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= images.length) return prev;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, draft: { ...prev.draft, images } };
    });
  }, []);

  const setPhotos = useCallback((uris: string[]) => {
    setState((prev) =>
      isSamePhotoSet(prev.draft.images ?? [], uris) ? { ...prev, draft: { ...prev.draft, images: uris } } : prev
    );
  }, []);

  const setLocation = useCallback((latitude: number, longitude: number) => {
    setState((prev) => ({ ...prev, draft: { ...prev.draft, latitude, longitude } }));
  }, []);

  const clearLocation = useCallback(() => {
    setState((prev) => ({ ...prev, draft: { ...prev.draft, latitude: undefined, longitude: undefined } }));
  }, []);

  const updateAmenities = useCallback((amenities: string[]) => {
    setState((prev) => ({ ...prev, draft: { ...prev.draft, amenities } }));
  }, []);

  const confirmPublish = useCallback(async (): Promise<Property> => {
    const { draft, landlord } = stateRef.current;
    const draftImages = draft.images ?? [];
    const localUris = draftImages.filter((uri) => uri.startsWith('file://'));

    let images = draftImages;
    if (localUris.length > 0) {
      const uploaded = await uploadPropertyImages(sessionRef.current, localUris);
      let next = 0;
      images = draftImages.map((uri) => (uri.startsWith('file://') ? uploaded[next++] : uri));
    }

    const listing = { ...draft, images };
    const property = landlord ? await publishProperty(listing, landlord.userId) : await publishProperty(listing);
    resetSession(INITIAL_STATE);
    return property;
  }, [resetSession]);

  return {
    state,
    start,
    cancel,
    processMessage,
    processAudioMessage,
    updateField,
    addPhotos,
    removePhoto,
    movePhoto,
    setPhotos,
    setLocation,
    clearLocation,
    updateAmenities,
    requestDescription,
    confirmPublish,
    setLandlord,
  };
}
