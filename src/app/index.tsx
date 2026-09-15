import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BurgerMenu } from '../components/BurgerMenu';
import { ChatInputBar } from '../components/ChatInputBar';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { Header } from '../components/Header';
import { useColorScheme } from '../hooks/useColorScheme';
import { sendChatQuery } from '../services/chatApi';
import { colors, shapes, spacing, typography } from '../theme/colors';
import { ChatMessage, Property } from '../types/property';

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
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const handlePropertyPress = useCallback(
    (property: Property) => {
      router.push({
        pathname: '/property/[id]',
        params: {
          id: property.id,
          title: property.title,
          price: property.price.toString(),
          city: property.city,
          address: property.address,
          bedrooms: property.bedrooms.toString(),
          bathrooms: property.bathrooms.toString(),
          square_meters: property.square_meters.toString(),
          image_url: property.image_url,
        },
      });
    },
    [router]
  );

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

  const handleMicPress = useCallback(() => {
    Alert.alert(
      'Micrófono Hubik',
      'Escuchando... Hable con tranquilidad para buscar propiedades.',
      [{ text: 'Entendido' }]
    );
  }, []);

  const handleMenu = () => {
    setIsMenuOpen(true);
  };

  const handleMenuItemSelect = (key: string) => {
    if (key === 'register') {
      router.push('/register');
    } else if (key === 'new_chat') {
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
        showBack={false}
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
        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onMicPress={handleMicPress}
          placeholder="Escriba su consulta aquí..."
          loading={loading}
        />
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
});
