import React, { useCallback, useRef, useState } from 'react';
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
import { ChatMessageItem } from '../src/components/ChatMessageItem';
import { SuggestionChips } from '../src/components/SuggestionChips';
import { useColorScheme } from '../src/hooks/useColorScheme';
import { sendChatQuery } from '../src/services/chatApi';
import { colors } from '../src/theme/colors';
import { ChatMessage } from '../src/types/property';

const SUGGESTION_CHIPS = [
  'Austin 2-bed under $400k',
  'Family homes in Denver 3+ beds',
  'Luxury condos in Miami',
  'Studios under $300k',
  'Seattle townhouses',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'assistant',
    text: "👋 Welcome to Hubik Real Estate AI! I can search our properties database using natural language. Try asking for a specific city, price range, bedrooms, or property type!",
    timestamp: 'Just now',
  },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

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
      } catch (err: any) {
        setMessages([
          ...newMessages,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ Could not connect to AI service (${err?.message || 'Check connection'}). Please try again.`,
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
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Hubik Real Estate AI
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280' },
            ]}
          >
            Natural language queries • Gemini 2.5 • pgvector
          </Text>
        </View>

        {/* Suggestion Chips */}
        <SuggestionChips
          chips={SUGGESTION_CHIPS}
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

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: theme.card, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Ask about properties, cities, prices..."
            placeholderTextColor={
              colorScheme === 'dark' ? '#6B7280' : '#9CA3AF'
            }
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={!loading}
            accessibilityLabel="Message input for property queries"
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
            accessibilityLabel="Send real estate query"
            accessibilityState={{
              disabled: isSendDisabled,
              busy: loading,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  feedContent: {
    padding: 16,
    paddingBottom: 24,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 10,
    minHeight: 44,
  },
  sendButton: {
    borderRadius: 22,
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
