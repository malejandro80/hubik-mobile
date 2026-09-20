import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AmenitiesConfirmation } from '../components/AmenitiesConfirmation';
import { BurgerMenu } from '../components/BurgerMenu';
import { getMenuItems } from '../components/BurgerMenu.items';
import { ChatInputBar } from '../components/ChatInputBar';
import { ChatMapPicker } from '../components/ChatMapPicker';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { Header } from '../components/Header';
import { PropertyPhotoGrid } from '../components/PropertyPhotoGrid';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { usePropertyRegistrationChat } from '../hooks/usePropertyRegistrationChat';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  AudioPayload,
  sendChatQuery,
  sendChatQueryAudio,
  VOICE_NOTE_MIME_TYPE,
} from '../services/chatApi';
import { MAX_PROPERTY_IMAGES } from '../services/propertyImages';
import { colors } from '../theme/colors';
import { ChatMessage, Property, PropertyDraft } from '../types/property';
import { getIndexStyles } from './index.styles';
import {
  buildDraftPreviewProperty,
  buildPropertyRouteParams,
  CANCEL_PHRASES,
  formatDraftSummary,
  formatOutcomeMessage,
  generateMessageId,
  INITIAL_MESSAGES,
  isConfirmIntent,
  isContinueIntent,
  isLocationIntent,
  isPhotosIntent,
  REGISTER_COMMAND,
} from '../lib/chatRegistration';

export default function HomeScreen() {
  const router = useRouter();
  const { status: authStatus, capabilities, signOut } = useAuth();
  const params = useLocalSearchParams<{ startRegistration?: string }>();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getIndexStyles(theme), [theme]);
  const menuItems = useMemo(
    () => getMenuItems(capabilities, authStatus),
    [capabilities, authStatus]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const hasAutoStartedRef = useRef(false);
  const registration = usePropertyRegistrationChat();
  const recorder = useVoiceRecorder();

  const handlePropertyPress = useCallback(
    (property: Property) => {
      router.push({
        pathname: '/property/[id]',
        params: buildPropertyRouteParams(property),
      });
    },
    [router]
  );

  const appendAssistantMessage = useCallback(
    (base: ChatMessage[], text: string, properties?: Property[]) => {
      setMessages([
        ...base,
        {
          id: generateMessageId('assistant'),
          sender: 'assistant',
          text,
          properties,
          timestamp: labels.chat.justNow,
        },
      ]);
    },
    [labels]
  );

  const handleSend = useCallback(
    async (queryText?: string) => {
      const textToSend = (queryText || inputText).trim();
      if (!textToSend || loading) return;

      const lower = textToSend.toLowerCase();
      const newMessages: ChatMessage[] = [
        ...messages,
        {
          id: generateMessageId('user'),
          sender: 'user',
          text: textToSend,
          timestamp: labels.chat.justNow,
        },
      ];

      setMessages(newMessages);
      setInputText('');

      if (lower === REGISTER_COMMAND && !capabilities.canRegisterProperty) {
        appendAssistantMessage(
          newMessages,
          authStatus === 'signedOut'
            ? labels.auth.registerRequiresSignIn
            : labels.auth.registerRequiresAgent
        );
        return;
      }

      if (lower === REGISTER_COMMAND) {
        registration.start();
        appendAssistantMessage(newMessages, labels.chat.registerExample);
        return;
      }

      if (registration.state.mode !== 'idle' && CANCEL_PHRASES.includes(lower)) {
        registration.cancel();
        appendAssistantMessage(newMessages, labels.chat.cancelRegistrationConfirmation);
        return;
      }

      if (registration.state.mode === 'confirming') {
        if (isConfirmIntent(lower)) {
          setLoading(true);
          try {
            const property = await registration.confirmPublish();
            appendAssistantMessage(
              newMessages,
              labels.chat.publishedSuccess(property.title),
              [property]
            );
          } catch (err: any) {
            appendAssistantMessage(
              newMessages,
              labels.chat.publishError(err?.message || 'error desconocido')
            );
          } finally {
            setLoading(false);
          }
          return;
        }

        if (isPhotosIntent(lower)) {
          registration.editPhotos();
          appendAssistantMessage(newMessages, labels.chat.photosPrompt);
          return;
        }

        if (isLocationIntent(lower)) {
          registration.editLocation();
          setMapPickerVisible(true);
          return;
        }

        if (lower.includes('corregir') || lower.includes('cambiar') || lower.includes('modificar')) {
          appendAssistantMessage(newMessages, labels.chat.correctionPrompt);
          return;
        }
      }

      if (registration.state.mode === 'photos') {
        if (isContinueIntent(lower)) {
          registration.skipPhotos();
          appendAssistantMessage(
            newMessages,
            labels.chat.photosContinueLocationPrompt
          );
          return;
        }

        if (isPhotosIntent(lower)) {
          setLoading(true);
          try {
            const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
            const granted = permission.granted
              ? true
              : (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;

            if (!granted) {
              appendAssistantMessage(
                newMessages,
                labels.chat.photosPermissionRequired
              );
              return;
            }

            const remaining = MAX_PROPERTY_IMAGES - (registration.state.draft.images?.length || 0);
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              selectionLimit: remaining,
              quality: 0.6,
            });
            if (!result.canceled && result.assets.length > 0) {
              const uris = result.assets.map((asset) => asset.uri);
              const { images } = registration.addPhotos(uris);
              appendAssistantMessage(
                newMessages,
                labels.chat.photosAdded(uris.length, images.length)
              );
            } else {
              appendAssistantMessage(newMessages, labels.chat.photosNoneSelected);
            }
          } catch (err: any) {
            appendAssistantMessage(
              newMessages,
              labels.chat.photosSelectionError(err?.message || 'error desconocido')
            );
          } finally {
            setLoading(false);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
          return;
        }
      }

      if (registration.state.mode === 'location' && isLocationIntent(lower)) {
        setMapPickerVisible(true);
        return;
      }

      if (registration.state.mode !== 'idle') {
        const wasConfirming = registration.state.mode === 'confirming';
        setLoading(true);
        try {
          const outcome = await registration.processMessage(textToSend);
          const text = formatOutcomeMessage(
            outcome.readyToConfirm,
            wasConfirming,
            outcome.assistantMessage,
            outcome.draft
          );
          appendAssistantMessage(newMessages, text);
        } catch (err: any) {
          appendAssistantMessage(
            newMessages,
            labels.chat.processDataError(err?.message || 'Verifica la conexión')
          );
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const response = await sendChatQuery(textToSend);
        appendAssistantMessage(newMessages, response.answer, response.data);
      } catch (err: any) {
        appendAssistantMessage(
          newMessages,
          labels.chat.serviceError(err?.message || 'Verifica la conexión')
        );
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [
      inputText,
      loading,
      messages,
      registration,
      appendAssistantMessage,
      labels,
      capabilities.canRegisterProperty,
      authStatus,
    ]
  );

  const handleSendAudio = useCallback(
    async (uri: string) => {
      if (loading) return;
      setLoading(true);

      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const audio: AudioPayload = { data: base64, mimeType: VOICE_NOTE_MIME_TYPE };

        if (registration.state.mode !== 'idle') {
          const outcome = await registration.processAudioMessage(audio);
          const transcript = (outcome.transcript || '').trim();
          const lowerTranscript = transcript.toLowerCase();

          if (CANCEL_PHRASES.some((p) => lowerTranscript.includes(p))) {
            registration.cancel();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            appendAssistantMessage(newMessages, labels.chat.cancelRegistrationConfirmation);
            return;
          }

          if (registration.state.mode === 'confirming' && isConfirmIntent(lowerTranscript)) {
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            setMessages(newMessages);
            try {
              const property = await registration.confirmPublish();
              appendAssistantMessage(
                newMessages,
                labels.chat.publishedSuccess(property.title),
                [property]
              );
            } catch (err: any) {
              appendAssistantMessage(
                newMessages,
                labels.chat.publishError(err?.message || 'error desconocido')
              );
            }
            return;
          }

          if (registration.state.mode === 'confirming' && isPhotosIntent(lowerTranscript)) {
            registration.editPhotos();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            appendAssistantMessage(newMessages, labels.chat.photosPrompt);
            return;
          }

          if (registration.state.mode === 'confirming' && isLocationIntent(lowerTranscript)) {
            registration.editLocation();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            setMessages(newMessages);
            setMapPickerVisible(true);
            return;
          }

          if (registration.state.mode === 'photos' && isPhotosIntent(lowerTranscript)) {
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            setMessages(newMessages);
            try {
              const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
              const granted = permission.granted
                ? true
                : (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;

              if (!granted) {
                appendAssistantMessage(
                  newMessages,
                  labels.chat.photosPermissionRequired
                );
                return;
              }

              const remaining = MAX_PROPERTY_IMAGES - (registration.state.draft.images?.length || 0);
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: remaining,
                quality: 0.6,
              });
              if (!result.canceled && result.assets.length > 0) {
                const uris = result.assets.map((asset) => asset.uri);
                const { images } = registration.addPhotos(uris);
                appendAssistantMessage(
                  newMessages,
                  labels.chat.photosAdded(uris.length, images.length)
                );
              } else {
                appendAssistantMessage(newMessages, labels.chat.photosNoneSelected);
              }
            } catch (err: any) {
              appendAssistantMessage(
                newMessages,
                labels.chat.photosSelectionError(err?.message || 'error desconocido')
              );
            }
            return;
          }

          if (registration.state.mode === 'photos' && isContinueIntent(lowerTranscript)) {
            registration.skipPhotos();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            appendAssistantMessage(
              newMessages,
              labels.chat.photosContinueLocationPrompt
            );
            return;
          }

          if (registration.state.mode === 'location' && isLocationIntent(lowerTranscript)) {
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: labels.chat.justNow },
            ];
            setMessages(newMessages);
            setMapPickerVisible(true);
            return;
          }

          const wasConfirming = registration.state.mode === 'confirming';
          const newMessages: ChatMessage[] = [
            ...messages,
            { id: generateMessageId('user'), sender: 'user', text: transcript || labels.chat.voiceNote, timestamp: labels.chat.justNow },
          ];
          const text = formatOutcomeMessage(
            outcome.readyToConfirm,
            wasConfirming,
            outcome.assistantMessage,
            outcome.draft
          );
          appendAssistantMessage(newMessages, text);
          return;
        }

        const response = await sendChatQueryAudio(audio);
        const newMessages: ChatMessage[] = [
          ...messages,
          { id: generateMessageId('user'), sender: 'user', text: response.transcript, timestamp: labels.chat.justNow },
        ];
        appendAssistantMessage(newMessages, response.answer, response.data);
      } catch (err: any) {
        const newMessages: ChatMessage[] = [
          ...messages,
          { id: generateMessageId('user'), sender: 'user', text: labels.chat.voiceNote, timestamp: labels.chat.justNow },
        ];
        appendAssistantMessage(
          newMessages,
          labels.chat.voiceProcessError(err?.message || 'Verifica la conexión')
        );
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [loading, messages, registration, appendAssistantMessage, labels]
  );

  const handleLocationConfirmed = useCallback(
    async (latitude: number, longitude: number) => {
      setMapPickerVisible(false);
      registration.setLocation(latitude, longitude);

      let addressLine = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = geocoded[0];
        if (place) {
          addressLine = [place.street, place.city].filter(Boolean).join(', ') || addressLine;
        }
      } catch {
      }

      const withLocationMessages: ChatMessage[] = [
        ...messages,
        {
          id: generateMessageId('assistant'),
          sender: 'assistant',
          text: labels.chat.locationConfirmedNotice(addressLine),
          timestamp: labels.chat.justNow,
        },
      ];
      setMessages(withLocationMessages);
      setLoading(true);

      try {
        const { description } = await registration.generateDescription();
        const finalDraft: PropertyDraft = { ...registration.state.draft, latitude, longitude, description };
        appendAssistantMessage(
          withLocationMessages,
          labels.chat.previewSummary(formatDraftSummary(finalDraft)),
          [buildDraftPreviewProperty(finalDraft)]
        );
      } catch (err: any) {
        appendAssistantMessage(
          withLocationMessages,
          labels.chat.descriptionGenError(err?.message || 'error desconocido')
        );
      } finally {
        setLoading(false);
      }
    },
    [registration, messages, appendAssistantMessage, labels]
  );

  useEffect(() => {
    if (params.startRegistration && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      handleSend(REGISTER_COMMAND);
    }
  }, [params.startRegistration, handleSend]);

  const handleMicPress = useCallback(async () => {
    if (recorder.state.status === 'recording') {
      const result = await recorder.stop();
      if (result) {
        handleSendAudio(result.uri);
      }
      return;
    }

    if (recorder.state.status === 'processing') return;

    try {
      await recorder.start();
    } catch {
      Alert.alert(
        labels.chat.micNotAvailableTitle,
        labels.chat.micNotAvailableMessage,
        [{ text: labels.common.understood }]
      );
    }
  }, [recorder, handleSendAudio, labels]);

  const handleMenu = () => {
    setIsMenuOpen(true);
  };

  const handleMenuItemSelect = (key: string) => {
    const menuActions: Record<string, () => void> = {
      register: () => handleSend(REGISTER_COMMAND),
      sign_in: () => router.push('/sign-in'),
      sign_out: () => {
        signOut().catch(() =>
          Alert.alert(labels.auth.signOutErrorTitle, labels.auth.signOutErrorMessage)
        );
      },
      create_agency: () => router.push('/create-agency'),
      my_agency: () => router.push('/agency'),
      new_chat: () => {
        setMessages(INITIAL_MESSAGES);
        setInputText('');
      },
      saved: () =>
        Alert.alert(
          labels.burgerMenu.savedDraftsTitle,
          labels.burgerMenu.savedDraftsMessage
        ),
      settings: () =>
        Alert.alert(
          labels.burgerMenu.settingsTitle,
          labels.burgerMenu.settingsMessage
        ),
      help: () =>
        Alert.alert(
          labels.burgerMenu.helpTitle,
          labels.burgerMenu.helpMessage
        ),
    };

    menuActions[key]?.();
  };

  const renderMessageItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => (
      <ChatMessageItem
        message={item}
        onPropertyPress={handlePropertyPress}
      />
    ),
    [handlePropertyPress]
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.dateCapsule}>
          <Text style={styles.dateCapsuleText}>
            {labels.common.todayTime}
          </Text>
        </View>
      </View>
    ),
    [styles.listHeader, styles.dateCapsule, styles.dateCapsuleText, labels]
  );

  const stagedImages = useMemo(() => registration.state.draft.images || [], [registration.state.draft.images]);
  const renderListFooter = useCallback(() => {
    if (registration.state.mode === 'photos' && stagedImages.length > 0) {
      return (
        <View style={styles.photoGridWrapper}>
          <PropertyPhotoGrid
            images={stagedImages}
            maxImages={MAX_PROPERTY_IMAGES}
            onRemove={registration.removePhoto}
            onMove={registration.movePhoto}
            onAddPress={() => handleSend(labels.chat.attachMorePhotos)}
          />
        </View>
      );
    }

    if (registration.state.mode === 'confirming') {
      return (
        <AmenitiesConfirmation
          amenities={registration.state.draft.amenities || []}
          onChange={registration.updateAmenities}
        />
      );
    }

    return null;
  }, [
    registration.state.mode,
    registration.state.draft.amenities,
    stagedImages,
    styles.photoGridWrapper,
    registration.removePhoto,
    registration.movePhoto,
    registration.updateAmenities,
    handleSend,
    labels,
  ]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Header
        showBack={false}
        onMenuPress={handleMenu}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={50}
        />

        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onMicPress={handleMicPress}
          isRecording={recorder.state.status === 'recording'}
          placeholder={labels.chat.inputPlaceholder}
          loading={loading || recorder.state.status === 'processing'}
        />
      </KeyboardAvoidingView>

      <BurgerMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectMenuItem={handleMenuItemSelect}
        items={menuItems}
      />

      <ChatMapPicker
        visible={mapPickerVisible}
        initialLatitude={registration.state.draft.latitude}
        initialLongitude={registration.state.draft.longitude}
        onConfirm={handleLocationConfirmed}
        onClose={() => setMapPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
