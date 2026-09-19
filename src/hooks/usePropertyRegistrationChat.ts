import { useCallback, useRef, useState } from 'react';
import {
  AudioPayload,
  generatePropertyDescription,
  intakeProperty,
  intakePropertyAudio,
  publishProperty,
} from '../services/chatApi';
import { uploadPropertyImages } from '../services/propertyImages';
import { Property, PropertyDraft } from '../types/property';

export type RegistrationMode =
  | 'idle'
  | 'collecting'
  | 'photos'
  | 'location'
  | 'generating_description'
  | 'confirming';

export interface RegistrationState {
  mode: RegistrationMode;
  draft: PropertyDraft;
}

const INITIAL_STATE: RegistrationState = {
  mode: 'idle',
  draft: {},
};

function generateDraftId(): string {
  return `d${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function usePropertyRegistrationChat() {
  const [state, setState] = useState<RegistrationState>(INITIAL_STATE);
  const draftIdRef = useRef<string>(generateDraftId());

  const start = useCallback(() => {
    draftIdRef.current = generateDraftId();
    setState({ mode: 'collecting', draft: {} });
  }, []);

  const cancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // When ready_to_confirm, the target mode depends on where the correction came from: a
  // fresh completion (from 'collecting') moves on to 'photos' for the first time, but a
  // correction made from 'confirming' (via "Corregir algo") must return to 'confirming' -
  // otherwise every text edit would re-run the whole photos/location/description sub-flow.
  const nextModeOnReady = state.mode === 'confirming' ? 'confirming' : 'photos';

  const processMessage = useCallback(
    async (text: string) => {
      const response = await intakeProperty(text, state.draft);
      setState({
        mode: response.ready_to_confirm ? nextModeOnReady : 'collecting',
        draft: response.data,
      });
      return {
        assistantMessage: response.assistant_message,
        readyToConfirm: response.ready_to_confirm,
        draft: response.data,
      };
    },
    [state.draft, nextModeOnReady]
  );

  const processAudioMessage = useCallback(
    async (audio: AudioPayload) => {
      const response = await intakePropertyAudio(audio, state.draft);
      setState({
        mode: response.ready_to_confirm ? nextModeOnReady : 'collecting',
        draft: response.data,
      });
      return {
        assistantMessage: response.assistant_message,
        readyToConfirm: response.ready_to_confirm,
        draft: response.data,
        transcript: response.transcript,
      };
    },
    [state.draft, nextModeOnReady]
  );

  // Photos are staged locally (their picked file:// URIs) and only uploaded to Storage as a
  // single batch in confirmPublish - avoids uploading photos the user later removes/reorders.
  const addPhotos = useCallback(
    (uris: string[]) => {
      const images = [...(state.draft.images || []), ...uris];
      setState((prev) => ({ ...prev, draft: { ...prev.draft, images } }));
      return { images };
    },
    [state.draft.images]
  );

  const removePhoto = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      draft: { ...prev.draft, images: (prev.draft.images || []).filter((_, i) => i !== index) },
    }));
  }, []);

  const movePhoto = useCallback((index: number, direction: 'up' | 'down') => {
    setState((prev) => {
      const images = [...(prev.draft.images || [])];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= images.length) return prev;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, draft: { ...prev.draft, images } };
    });
  }, []);

  const skipPhotos = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'location' }));
  }, []);

  const editPhotos = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'photos' }));
  }, []);

  const editLocation = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'location' }));
  }, []);

  const setLocation = useCallback((latitude: number, longitude: number) => {
    setState((prev) => ({
      ...prev,
      mode: 'generating_description',
      draft: { ...prev.draft, latitude, longitude },
    }));
  }, []);

  const generateDescription = useCallback(async () => {
    try {
      const { description } = await generatePropertyDescription(state.draft);
      setState((prev) => ({ ...prev, mode: 'confirming', draft: { ...prev.draft, description } }));
      return { description };
    } catch (err) {
      setState((prev) => ({ ...prev, mode: 'location' }));
      throw err;
    }
  }, [state.draft]);

  const confirmPublish = useCallback(async (): Promise<Property> => {
    const draftImages = state.draft.images || [];
    const localUris = draftImages.filter((uri) => uri.startsWith('file://'));

    let images = draftImages;
    if (localUris.length > 0) {
      const uploaded = await uploadPropertyImages(draftIdRef.current, localUris);
      let next = 0;
      images = draftImages.map((uri) => (uri.startsWith('file://') ? uploaded[next++] : uri));
    }

    const property = await publishProperty({ ...state.draft, images });
    setState(INITIAL_STATE);
    return property;
  }, [state.draft]);

  return {
    state,
    start,
    processMessage,
    processAudioMessage,
    addPhotos,
    removePhoto,
    movePhoto,
    skipPhotos,
    editPhotos,
    editLocation,
    setLocation,
    generateDescription,
    confirmPublish,
    cancel,
  };
}
