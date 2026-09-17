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
  missingFields: (keyof PropertyDraft)[];
}

const INITIAL_STATE: RegistrationState = {
  mode: 'idle',
  draft: {},
  missingFields: [],
};

function generateDraftId(): string {
  return `d${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function usePropertyRegistrationChat() {
  const [state, setState] = useState<RegistrationState>(INITIAL_STATE);
  const draftIdRef = useRef<string>(generateDraftId());

  const start = useCallback(() => {
    draftIdRef.current = generateDraftId();
    setState({ mode: 'collecting', draft: {}, missingFields: [] });
  }, []);

  const cancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const processMessage = useCallback(
    async (text: string) => {
      const response = await intakeProperty(text, state.draft);
      setState({
        mode: response.ready_to_confirm ? 'photos' : 'collecting',
        draft: response.data,
        missingFields: response.missing_fields,
      });
      return {
        assistantMessage: response.assistant_message,
        readyToConfirm: response.ready_to_confirm,
        draft: response.data,
      };
    },
    [state.draft]
  );

  const processAudioMessage = useCallback(
    async (audio: AudioPayload) => {
      const response = await intakePropertyAudio(audio, state.draft);
      setState({
        mode: response.ready_to_confirm ? 'photos' : 'collecting',
        draft: response.data,
        missingFields: response.missing_fields,
      });
      return {
        assistantMessage: response.assistant_message,
        readyToConfirm: response.ready_to_confirm,
        draft: response.data,
        transcript: response.transcript,
      };
    },
    [state.draft]
  );

  const addPhotos = useCallback(
    async (uris: string[]) => {
      const uploaded = await uploadPropertyImages(draftIdRef.current, uris);
      const images = [...(state.draft.images || []), ...uploaded];
      setState((prev) => ({ ...prev, draft: { ...prev.draft, images } }));
      return { images };
    },
    [state.draft.images]
  );

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
    const property = await publishProperty(state.draft);
    setState(INITIAL_STATE);
    return property;
  }, [state.draft]);

  return {
    state,
    start,
    processMessage,
    processAudioMessage,
    addPhotos,
    skipPhotos,
    editPhotos,
    editLocation,
    setLocation,
    generateDescription,
    confirmPublish,
    cancel,
  };
}
