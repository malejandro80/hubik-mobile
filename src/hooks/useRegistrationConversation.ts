import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  CANCEL_PHRASES,
  generateMessageId,
  isLocationIntent,
  isPhotosIntent,
  isPublishRequest,
  isShortCommand,
} from '../lib/chatRegistration';
import { isReadyToPublish } from '../lib/draftStatus';
import { AudioPayload } from '../services/chatApi';
import { MAX_PROPERTY_IMAGES } from '../services/propertyImages';
import { ChatMessage, Property } from '../types/property';
import { useLabels } from './useLabels';
import { usePropertyRegistrationChat } from './usePropertyRegistrationChat';

type Registration = ReturnType<typeof usePropertyRegistrationChat>;

export interface RegistrationConversationDeps {
  registration: Registration;
  messages: ChatMessage[];
  appendAssistantMessage: (base: ChatMessage[], text: string, properties?: Property[]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  openMapPicker: () => void;
}

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export function useRegistrationConversation({
  registration,
  messages,
  appendAssistantMessage,
  setMessages,
  setLoading,
  openMapPicker,
}: RegistrationConversationDeps) {
  const labels = useLabels();
  const [publishing, setPublishing] = useState(false);
  const { state, cancel, processMessage, processAudioMessage, addPhotos, confirmPublish } = registration;

  const pickPhotos = useCallback(
    async (base: ChatMessage[] = messages) => {
      try {
        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        const granted = permission.granted
          ? true
          : (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;
        if (!granted) {
          appendAssistantMessage(base, labels.chat.photosPermissionRequired);
          return;
        }

        const remaining = MAX_PROPERTY_IMAGES - (state.draft.images?.length ?? 0);
        if (remaining <= 0) {
          appendAssistantMessage(base, labels.composer.photosFull(MAX_PROPERTY_IMAGES));
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: remaining,
          quality: 0.6,
        });
        if (!result.canceled && result.assets.length > 0) {
          addPhotos(result.assets.map((asset) => asset.uri));
        }
      } catch (error) {
        appendAssistantMessage(base, labels.chat.photosSelectionError(errorText(error, 'error desconocido')));
      }
    },
    [messages, state.draft.images, addPhotos, appendAssistantMessage, labels]
  );

  const runPublish = useCallback(
    async (base: ChatMessage[]) => {
      setPublishing(true);
      try {
        const property = await confirmPublish();
        appendAssistantMessage(base, labels.chat.publishedSuccess(property.title), [property]);
      } catch (error) {
        appendAssistantMessage(base, labels.chat.publishError(errorText(error, 'error desconocido')));
      } finally {
        setPublishing(false);
      }
    },
    [confirmPublish, appendAssistantMessage, labels]
  );

  const requestPublish = useCallback(
    (base: ChatMessage[] = messages) => {
      Alert.alert(labels.composer.publishConfirmTitle, labels.composer.publishConfirmMessage, [
        { text: labels.composer.publishConfirmCancel, style: 'cancel' },
        { text: labels.composer.publishConfirmAction, onPress: () => void runPublish(base) },
      ]);
    },
    [messages, runPublish, labels]
  );

  const handleText = useCallback(
    async (text: string, lower: string, base: ChatMessage[]) => {
      if (CANCEL_PHRASES.includes(lower)) {
        cancel();
        appendAssistantMessage(base, labels.chat.cancelRegistrationConfirmation);
        return;
      }
      if (isReadyToPublish(state.draft) && isPublishRequest(lower)) {
        requestPublish(base);
        return;
      }
      if (isShortCommand(lower) && isPhotosIntent(lower)) {
        await pickPhotos(base);
        return;
      }
      if (isShortCommand(lower) && isLocationIntent(lower)) {
        openMapPicker();
        return;
      }

      setLoading(true);
      try {
        const outcome = await processMessage(text);
        appendAssistantMessage(base, outcome.assistantMessage);
      } catch (error) {
        appendAssistantMessage(base, labels.chat.processDataError(errorText(error, 'Verifica la conexión')));
      } finally {
        setLoading(false);
      }
    },
    [state.draft, cancel, processMessage, pickPhotos, requestPublish, openMapPicker, setLoading, appendAssistantMessage, labels]
  );

  const handleAudio = useCallback(
    async (audio: AudioPayload) => {
      const outcome = await processAudioMessage(audio);
      const transcript = (outcome.transcript || '').trim();
      const lower = transcript.toLowerCase();
      const base: ChatMessage[] = [
        ...messages,
        {
          id: generateMessageId('user'),
          sender: 'user',
          text: transcript || labels.chat.voiceNote,
          timestamp: labels.chat.justNow,
        },
      ];

      if (CANCEL_PHRASES.some((phrase) => lower.includes(phrase))) {
        cancel();
        appendAssistantMessage(base, labels.chat.cancelRegistrationConfirmation);
        return;
      }
      if (isReadyToPublish(outcome.draft) && isPublishRequest(lower)) {
        setMessages(base);
        requestPublish(base);
        return;
      }
      if (isShortCommand(lower) && isPhotosIntent(lower)) {
        setMessages(base);
        await pickPhotos(base);
        return;
      }
      if (isShortCommand(lower) && isLocationIntent(lower)) {
        setMessages(base);
        openMapPicker();
        return;
      }
      appendAssistantMessage(base, outcome.assistantMessage);
    },
    [messages, cancel, processAudioMessage, pickPhotos, requestPublish, openMapPicker, setMessages, appendAssistantMessage, labels]
  );

  return { publishing, pickPhotos, requestPublish, handleText, handleAudio };
}
