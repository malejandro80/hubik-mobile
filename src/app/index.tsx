import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { SuggestionChips } from '../components/SuggestionChips';
import { useColorScheme } from '../hooks/useColorScheme';
import { fetchDynamicSuggestions, sendChatQuery } from '../services/chatApi';
import { colors, shapes, spacing, typography } from '../theme/colors';
import { ChatMessage } from '../types/property';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'assistant',
    text: '👋 ¡Bienvenido a Hubik Real Estate AI! Puedo buscar propiedades usando lenguaje natural. Prueba preguntando por ciudad, rango de precio, habitaciones o metros cuadrados.',
    timestamp: 'Just now',
  },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionChips, setSuggestionChips] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let isMounted = true;
    fetchDynamicSuggestions()
      .then((chips) => {
        if (isMounted && chips.length > 0) {
          setSuggestionChips(chips);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSend = useCallback(
    async (queryText?: string) => {
      const textToSend = (queryText || inputText).trim();
      if (!textToSend || loading) return;

      const userMessageId = `user-${Date.now()}`;
      const newMessages: ChatMessage[] = [
        ...messages,
        {
          id: userMessageId,
          sender: 'user',
          text: textToSend,
          timestamp: 'Just now',
        },
      ];

      setMessages(newMessages);
      setInputText('');
      setLoading(true);

      try {
        const response = await sendChatQuery(textToSend);

        setMessages([
          ...newMessages,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: response.answer,
            properties: response.data,
            timestamp: 'Just now',
          },
        ]);

        if (response.suggestions && response.suggestions.length > 0) {
          setSuggestionChips(response.suggestions);
        }
      } catch (err: any) {
        setMessages([
          ...newMessages,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ No se pudo conectar con el servicio de IA (${err?.message || 'Verifica la conexión'}). Por favor intenta nuevamente.`,
            timestamp: 'Just now',
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [inputText, loading, messages]
  );

  const renderMessageItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => <ChatMessageItem message={item} />,
    []
  );

  const isSendDisabled = !inputText.trim() || loading;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Serene Hearth Warm Architectural Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.primary }]}>
            Hubik Real Estate AI
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Búsqueda con lenguaje natural • Gemini 2.5 • pgvector
          </Text>
        </View>

        {/* Dynamic Suggestion Chips */}
        <SuggestionChips
          chips={suggestionChips}
          onSelectChip={handleSend}
          disabled={loading}
        />

        {/* Message Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Tactile Serene Hearth Input Dock */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: isFocused ? theme.primary : theme.border,
                borderWidth: isFocused ? 2.5 : 2,
              },
            ]}
            placeholder="Pregunta por propiedades, ciudades, precios o m²..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={!loading}
            accessibilityLabel="Campo de mensaje para buscar propiedades"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: isSendDisabled
                  ? theme.disabled
                  : theme.primary,
              },
            ]}
            onPress={() => handleSend()}
            disabled={isSendDisabled}
            accessibilityRole="button"
            accessibilityLabel="Enviar consulta de propiedades"
            accessibilityState={{
              disabled: isSendDisabled,
              busy: loading,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primaryText} />
            ) : (
              <Text style={[styles.sendButtonText, { color: theme.primaryText }]}>
                Enviar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  headerTitle: {
    ...typography.headlineLG,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  feedContent: {
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingTop: 16,
    paddingBottom: 32,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingVertical: 14,
    borderTopWidth: 1.5,
  },
  input: {
    flex: 1,
    borderRadius: shapes.lg, // 16px
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...typography.bodyLG,
    fontSize: 17,
    marginRight: 12,
    minHeight: spacing.touchDefault, // 56px
  },
  sendButton: {
    borderRadius: shapes.lg, // 16px
    paddingHorizontal: 22,
    height: spacing.touchDefault, // 56px
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A3A34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonText: {
    ...typography.labelLG,
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
