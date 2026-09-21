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
import { BurgerMenu } from '../components/BurgerMenu';
import { ChatInputBar } from '../components/ChatInputBar';
import { ChatMapPicker } from '../components/ChatMapPicker';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { DraftPanel } from '../components/DraftPanel';
import { Header } from '../components/Header';
import { PhotoOrderModal } from '../components/PhotoOrderModal';
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { StartScreen } from '../components/StartScreen';
import { useAppMenu } from '../hooks/useAppMenu';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useConversation } from '../hooks/useConversation';
import { useDraftReview } from '../hooks/useDraftReview';
import { useLabels } from '../hooks/useLabels';
import { usePropertyRegistrationChat } from '../hooks/usePropertyRegistrationChat';
import { useRegistrationConversation } from '../hooks/useRegistrationConversation';
import { useStartScreen } from '../hooks/useStartScreen';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { DraftEditableField, FieldEditResult, validateDraftField } from '../lib/draftValidation';
import { resolveSlashMenu } from '../lib/slashCommands';
import {
  AudioPayload,
  sendChatQuery,
  sendChatQueryAudio,
  VOICE_NOTE_MIME_TYPE,
} from '../services/chatApi';
import { colors } from '../theme/colors';
import { ChatMessage, Property } from '../types/property';
import { getIndexStyles } from './index.styles';
import {
  buildPropertyRouteParams,
  generateMessageId,
  REGISTER_COMMAND,
} from '../lib/chatRegistration';

export default function HomeScreen() {
  const router = useRouter();
  const { status: authStatus, capabilities } = useAuth();
  const params = useLocalSearchParams<{ startRegistration?: string }>();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getIndexStyles(theme), [theme]);

  const { messages, setMessages, reset } = useConversation();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const hasAutoStartedRef = useRef(false);
  const registration = usePropertyRegistrationChat();
  const recorder = useVoiceRecorder();

  const { phase, draft } = registration.state;
  const isComposing = phase !== 'idle';
  const review = useDraftReview({ draft, setPhotos: registration.setPhotos });

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
    [labels, setMessages]
  );

  const openMapPicker = useCallback(() => setMapPickerVisible(true), []);

  const conversation = useRegistrationConversation({
    registration,
    messages,
    appendAssistantMessage,
    setMessages,
    setLoading,
    openMapPicker,
  });

  const scrollToEndSoon = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEndSoon();
  }, [messages.length, scrollToEndSoon]);

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
        if (isComposing) {
          appendAssistantMessage(newMessages, labels.composer.alreadyComposing);
          return;
        }
        registration.start();
        appendAssistantMessage(newMessages, labels.chat.registerExample);
        return;
      }

      if (isComposing) {
        await conversation.handleText(textToSend, lower, newMessages);
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
        scrollToEndSoon();
      }
    },
    [
      inputText,
      loading,
      messages,
      isComposing,
      registration,
      conversation,
      appendAssistantMessage,
      scrollToEndSoon,
      labels,
      setMessages,
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

        if (isComposing) {
          await conversation.handleAudio(audio);
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
        scrollToEndSoon();
      }
    },
    [loading, messages, isComposing, conversation, appendAssistantMessage, scrollToEndSoon, labels]
  );

  const handleLocationConfirmed = useCallback(
    (latitude: number, longitude: number) => {
      setMapPickerVisible(false);
      registration.setLocation(latitude, longitude);
    },
    [registration]
  );

  const handleEditField = useCallback(
    (field: DraftEditableField, raw: string): FieldEditResult => {
      if (field !== 'catastro') return registration.updateField(field, raw);
      const result = validateDraftField('catastro', raw);
      if (result.ok) void handleSend(String(result.value));
      return result;
    },
    [registration, handleSend]
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

  const startScreen = useStartScreen((text) => void handleSend(text));
  const slashMenu = useMemo(
    () => resolveSlashMenu(inputText, capabilities, authStatus),
    [inputText, capabilities, authStatus]
  );

  const menu = useAppMenu({
    search: () => undefined,
    register: () => void handleSend(REGISTER_COMMAND),
    new_chat: () => {
      registration.cancel();
      reset();
      setInputText('');
    },
  });

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

  const attachments = useMemo(
    () =>
      isComposing
        ? {
            onAddPhotos: () => void conversation.pickPhotos(),
            onPickLocation: openMapPicker,
            onOrderPhotos: review.openOrder,
            photoCount: draft.images?.length ?? 0,
            hasPin: draft.latitude !== undefined && draft.longitude !== undefined,
          }
        : undefined,
    [isComposing, conversation, openMapPicker, review.openOrder, draft.images, draft.latitude, draft.longitude]
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Header
        showBack={false}
        onMenuPress={menu.open}
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
          ListHeaderComponent={messages.length > 0 ? renderListHeader : null}
          ListEmptyComponent={<StartScreen {...startScreen} />}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={50}
        />

        {isComposing && (
          <DraftPanel
            draft={draft}
            recentlyChanged={registration.state.recentlyChanged}
            describing={registration.state.describing}
            descriptionFailed={registration.state.descriptionFailed}
            describedFrom={registration.state.describedFrom}
            publishing={conversation.publishing}
            onEditField={handleEditField}
            onAddPhotos={() => void conversation.pickPhotos()}
            onRemovePhoto={registration.removePhoto}
            onMovePhoto={registration.movePhoto}
            onPickLocation={openMapPicker}
            onAmenitiesChange={registration.updateAmenities}
            onRequestDescription={() => registration.requestDescription().catch(() => undefined)}
            onPublish={() => conversation.requestPublish()}
            onPreview={review.openPreview}
          />
        )}

        <SlashCommandMenu state={slashMenu} onSelect={(command) => void handleSend(command)} />

        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onMicPress={handleMicPress}
          isRecording={recorder.state.status === 'recording'}
          placeholder={labels.chat.inputPlaceholder}
          loading={loading || recorder.state.status === 'processing'}
          attachments={attachments}
        />
      </KeyboardAvoidingView>

      <BurgerMenu {...menu.menuProps} />

      <PhotoOrderModal
        visible={review.orderVisible}
        photos={draft.images ?? []}
        onConfirm={review.confirmOrder}
        onClose={review.closeOrder}
      />

      <ChatMapPicker
        visible={mapPickerVisible}
        initialLatitude={draft.latitude}
        initialLongitude={draft.longitude}
        onConfirm={handleLocationConfirmed}
        onClose={() => setMapPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
