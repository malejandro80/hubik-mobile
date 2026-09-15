import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { BurgerMenu } from '../components/BurgerMenu';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { Header } from '../components/Header';
import { useColorScheme } from '../hooks/useColorScheme';
import { sendChatQuery } from '../services/chatApi';
import { colors, shapes, spacing, typography } from '../theme/colors';
import { ChatMessage } from '../types/property';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'assistant',
    title: 'Buenos días, Don Carlos.',
    text: '¿En qué puedo ayudarle hoy con sus propiedades o búsqueda de vivienda?\n\nPuede pulsar el **botón verde del micrófono** para hablar con tranquilidad, o escribir si lo prefiere.',
    timestamp: '10:30',
  },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const isSendActive = Boolean(inputText.trim());

  const handleActionPress = () => {
    if (isSendActive) {
      handleSend();
    } else {
      Alert.alert(
        'Micrófono Hubik',
        'Escuchando... Hable con tranquilidad para buscar propiedades.',
        [{ text: 'Entendido' }]
      );
    }
  };

  const handleBack = () => {
    Alert.alert('Navegación', 'Regresar a la pantalla anterior.');
  };

  const handleMenu = () => {
    setIsMenuOpen(true);
  };

  const handleMenuItemSelect = (key: string) => {
    if (key === 'new_chat') {
      setMessages(INITIAL_MESSAGES);
      setInputText('');
    } else if (key === 'saved') {
      Alert.alert(
        'Propiedades Guardadas',
        'Aún no ha guardado propiedades en sus favoritos.'
      );
    } else if (key === 'settings') {
      Alert.alert(
        'Ajustes',
        'Configuraciones de voz, lectura y accesibilidad para Don Carlos.'
      );
    } else if (key === 'help') {
      Alert.alert(
        'Ayuda y Soporte',
        'Comuníquese con el equipo de soporte de Hubik o su asesor personal.'
      );
    }
  };

  const renderMessageItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => <ChatMessageItem message={item} />,
    []
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View
          style={[
            styles.dateCapsule,
            { backgroundColor: theme.surfaceContainerHigh },
          ]}
        >
          <Text
            style={[styles.dateCapsuleText, { color: theme.textSecondary }]}
          >
            Hoy, 10:30
          </Text>
        </View>
      </View>
    ),
    [theme.surfaceContainerHigh, theme.textSecondary]
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* Serene Hearth Architectural Header */}
      <Header
        title="Hubik"
        onBackPress={handleBack}
        onMenuPress={handleMenu}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Message Feed with Top Date Capsule Header */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Don Carlos Serene Hearth Input Dock */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.outlineVariant,
            },
          ]}
        >
          {/* Input Pill Container */}
          <View
            style={[
              styles.inputCapsule,
              {
                backgroundColor: theme.surfaceContainerLow,
                borderColor: isFocused ? theme.secondary : theme.outlineVariant,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Escriba su consulta aquí..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              editable={!loading}
              accessibilityLabel="Campo de consulta"
            />
          </View>

          {/* Forest Pine Action Button (Mic / Send) */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: '#163931',
              },
            ]}
            onPress={handleActionPress}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={
              isSendActive ? 'Enviar consulta' : 'Hablar por micrófono'
            }
            accessibilityState={{
              busy: loading,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : isSendActive ? (
              <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
            ) : (
              <Ionicons name="mic" size={26} color="#FFFFFF" />
            )}
            <Text style={styles.srOnly}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Slide-in Burger Menu */}
      <BurgerMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectMenuItem={handleMenuItemSelect}
      />
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
  listHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dateCapsule: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: shapes.full, // 9999
    marginTop: 8,
    marginBottom: 12,
  },
  dateCapsuleText: {
    ...typography.labelMD,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  feedContent: {
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingTop: 8,
    paddingBottom: 24,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    ...typography.bodyLG,
    fontSize: 16,
    height: '100%',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#02241F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
