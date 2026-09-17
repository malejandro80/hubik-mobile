import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { BurgerMenu } from '../components/BurgerMenu';
import { ChatInputBar } from '../components/ChatInputBar';
import { ChatMapPicker } from '../components/ChatMapPicker';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { Header } from '../components/Header';
import { PropertyPhotoGrid } from '../components/PropertyPhotoGrid';
import { SuggestionChips } from '../components/SuggestionChips';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePropertyRegistrationChat } from '../hooks/usePropertyRegistrationChat';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  AudioPayload,
  generatePropertyTitle,
  sendChatQuery,
  sendChatQueryAudio,
  VOICE_NOTE_MIME_TYPE,
} from '../services/chatApi';
import { MAX_PROPERTY_IMAGES } from '../services/propertyImages';
import { colors, shapes, spacing, typography } from '../theme/colors';
import { ChatMessage, Property, PropertyDraft } from '../types/property';

const REGISTER_COMMAND = '/agregar-propiedad';
const CANCEL_PHRASES = ['cancelar registro', 'cancelar'];
const ADD_PHOTOS_CHIP = 'Adjuntar fotos';
const SKIP_PHOTOS_CHIP = 'Continuar sin fotos';
const SET_LOCATION_CHIP = 'Fijar ubicación';
const CONFIRM_CHIP = 'Confirmar y publicar';
const CORRECT_CHIP = 'Corregir algo';
const CHANGE_PHOTOS_CHIP = 'Cambiar fotos';
const CHANGE_LOCATION_CHIP = 'Cambiar ubicación';

const REGISTER_EXAMPLE =
  'Para comenzar, indíqueme la referencia catastral de la propiedad (puede consultarla en el recibo del IBI o en la Sede Electrónica del Catastro). La verificaré para asegurarnos de que no esté ya registrada antes de seguir.';

const PROPERTY_TYPE_LABEL_ES: Record<string, string> = {
  Apartment: 'Piso',
  'Single Family': 'Casa',
  Townhouse: 'Casa adosada',
  Studio: 'Estudio',
  Condo: 'Condominio',
};

function formatDraftSummary(draft: PropertyDraft): string {
  const opLabel = draft.operation_type === 'rent' ? 'Alquiler' : 'Venta';
  const typeLabel = draft.property_type ? PROPERTY_TYPE_LABEL_ES[draft.property_type] : '—';
  const priceLabel = draft.price !== undefined ? `${draft.price.toLocaleString('es-ES')} €` : '—';

  return [
    `**Referencia catastral:** ${draft.catastro || '—'}`,
    `**Operación:** ${opLabel}`,
    `**Tipo:** ${typeLabel}`,
    `**Precio:** ${priceLabel}`,
    `**Habitaciones:** ${draft.bedrooms ?? '—'} · **Baños:** ${draft.bathrooms ?? '—'}`,
    `**Metros:** ${draft.square_meters ?? '—'} m²`,
    `**Ubicación:** ${draft.address || '—'}, ${draft.city || '—'}`,
  ].join('\n\n');
}

function generateMessageId(prefix: 'user' | 'assistant'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDraftPreviewProperty(draft: PropertyDraft): Property {
  return {
    id: 'draft-preview',
    catastro: draft.catastro,
    title: draft.title || generatePropertyTitle(draft),
    property_type: draft.property_type!,
    operation_type: draft.operation_type,
    price: draft.price ?? 0,
    bedrooms: draft.bedrooms ?? 0,
    bathrooms: draft.bathrooms ?? 0,
    square_meters: draft.square_meters ?? 0,
    city: draft.city ?? '',
    address: draft.address ?? '',
    latitude: draft.latitude,
    longitude: draft.longitude,
    description: draft.description,
    status: 'Available',
    image_url: draft.images?.[0] || '',
    images: draft.images || [],
  };
}

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
  const params = useLocalSearchParams<{ startRegistration?: string }>();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

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
          ...(property.description ? { description: property.description } : {}),
          ...(property.images && property.images.length > 0
            ? { images: JSON.stringify(property.images) }
            : {}),
          ...(property.latitude !== undefined ? { lat: property.latitude.toString() } : {}),
          ...(property.longitude !== undefined ? { lng: property.longitude.toString() } : {}),
        },
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
          timestamp: 'Just now',
        },
      ]);
    },
    []
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
          timestamp: 'Just now',
        },
      ];

      setMessages(newMessages);
      setInputText('');

      // Start the guided property registration flow.
      if (lower === REGISTER_COMMAND) {
        registration.start();
        appendAssistantMessage(newMessages, REGISTER_EXAMPLE);
        return;
      }

      // Cancel the flow from any in-progress state.
      if (registration.state.mode !== 'idle' && CANCEL_PHRASES.includes(lower)) {
        registration.cancel();
        appendAssistantMessage(newMessages, 'De acuerdo, cancelé el registro. Puede volver a intentarlo cuando quiera.');
        return;
      }

      // Confirmation / correction handling once the draft is complete.
      if (registration.state.mode === 'confirming') {
        if (textToSend === CONFIRM_CHIP) {
          setLoading(true);
          try {
            const property = await registration.confirmPublish();
            appendAssistantMessage(
              newMessages,
              `¡Listo! Publiqué "${property.title}" en Hubik.`,
              [property]
            );
          } catch (err: any) {
            appendAssistantMessage(
              newMessages,
              `⚠️ No pude publicar la propiedad (${err?.message || 'error desconocido'}). Sus datos siguen guardados, puede intentar de nuevo.`
            );
          } finally {
            setLoading(false);
          }
          return;
        }

        if (textToSend === CORRECT_CHIP) {
          appendAssistantMessage(newMessages, '¿Qué dato desea corregir? Cuéntemelo y lo actualizo.');
          return;
        }

        if (textToSend === CHANGE_PHOTOS_CHIP) {
          registration.editPhotos();
          appendAssistantMessage(newMessages, '¿Desea agregar o cambiar las fotos de la propiedad?');
          return;
        }

        if (textToSend === CHANGE_LOCATION_CHIP) {
          registration.editLocation();
          appendAssistantMessage(newMessages, 'Toque "Fijar ubicación" para ajustar el pin en el mapa.');
          return;
        }
      }

      // Photos step: either open the picker or move on without photos.
      if (registration.state.mode === 'photos') {
        if (textToSend === ADD_PHOTOS_CHIP) {
          setLoading(true);
          try {
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
                `Añadí ${uris.length} foto(s). Tiene ${images.length} en total (se subirán al publicar). Puede reordenarlas o eliminarlas abajo, agregar más (hasta ${MAX_PROPERTY_IMAGES}), o tocar "${SKIP_PHOTOS_CHIP}" para continuar.`
              );
            } else {
              appendAssistantMessage(newMessages, 'No se seleccionó ninguna foto. Puede intentarlo de nuevo o continuar sin fotos.');
            }
          } catch (err: any) {
            appendAssistantMessage(
              newMessages,
              `⚠️ No pude subir esas fotos (${err?.message || 'error desconocido'}). Intente de nuevo.`
            );
          } finally {
            setLoading(false);
          }
          return;
        }

        if (textToSend === SKIP_PHOTOS_CHIP) {
          registration.skipPhotos();
          appendAssistantMessage(
            newMessages,
            `Perfecto. Ahora toque "${SET_LOCATION_CHIP}" para marcar en el mapa dónde está la propiedad.`
          );
          return;
        }
      }

      // Location step: opens the map picker modal; confirming it is handled separately.
      if (registration.state.mode === 'location' && textToSend === SET_LOCATION_CHIP) {
        setMapPickerVisible(true);
        return;
      }

      // Any other message while a draft is in progress is treated as new/updated info.
      if (registration.state.mode !== 'idle') {
        setLoading(true);
        try {
          const outcome = await registration.processMessage(textToSend);
          const text = outcome.readyToConfirm
            ? `${outcome.assistantMessage}\n\n¿Desea agregar fotos de la propiedad? Puede subir hasta ${MAX_PROPERTY_IMAGES}, o continuar sin fotos.`
            : outcome.assistantMessage;
          appendAssistantMessage(newMessages, text);
        } catch (err: any) {
          appendAssistantMessage(
            newMessages,
            `⚠️ No pude procesar esos datos (${err?.message || 'Verifica la conexión'}). Intente nuevamente.`
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
          `⚠️ No se pudo conectar con el servicio de IA (${err?.message || 'Verifica la conexión'}). Por favor intenta nuevamente.`
        );
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [inputText, loading, messages, registration, appendAssistantMessage]
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
          const newMessages: ChatMessage[] = [
            ...messages,
            { id: generateMessageId('user'), sender: 'user', text: outcome.transcript, timestamp: 'Just now' },
          ];
          const text = outcome.readyToConfirm
            ? `${outcome.assistantMessage}\n\n¿Desea agregar fotos de la propiedad? Puede subir hasta ${MAX_PROPERTY_IMAGES}, o continuar sin fotos.`
            : outcome.assistantMessage;
          appendAssistantMessage(newMessages, text);
          return;
        }

        const response = await sendChatQueryAudio(audio);
        const newMessages: ChatMessage[] = [
          ...messages,
          { id: generateMessageId('user'), sender: 'user', text: response.transcript, timestamp: 'Just now' },
        ];
        appendAssistantMessage(newMessages, response.answer, response.data);
      } catch (err: any) {
        const newMessages: ChatMessage[] = [
          ...messages,
          { id: generateMessageId('user'), sender: 'user', text: '🎤 Nota de voz', timestamp: 'Just now' },
        ];
        appendAssistantMessage(
          newMessages,
          `⚠️ No pude procesar la nota de voz (${err?.message || 'Verifica la conexión'}). Intenta grabar de nuevo o escribir tu mensaje.`
        );
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [loading, messages, registration, appendAssistantMessage]
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
        // Reverse geocoding is a nicety only; fall back to raw coordinates above.
      }

      const withLocationMessages: ChatMessage[] = [
        ...messages,
        {
          id: generateMessageId('assistant'),
          sender: 'assistant',
          text: `📍 Ubicación confirmada: ${addressLine}. Generando la descripción de la propiedad...`,
          timestamp: 'Just now',
        },
      ];
      setMessages(withLocationMessages);
      setLoading(true);

      try {
        const { description } = await registration.generateDescription();
        const finalDraft: PropertyDraft = { ...registration.state.draft, latitude, longitude, description };
        appendAssistantMessage(
          withLocationMessages,
          `¡Listo! Aquí tiene la vista previa. Puede editar cualquier dato antes de publicar.\n\n${formatDraftSummary(finalDraft)}`,
          [buildDraftPreviewProperty(finalDraft)]
        );
      } catch (err: any) {
        appendAssistantMessage(
          withLocationMessages,
          `⚠️ No pude generar la descripción (${err?.message || 'error desconocido'}). Toque "${SET_LOCATION_CHIP}" para intentar de nuevo.`
        );
      } finally {
        setLoading(false);
      }
    },
    [registration, messages, appendAssistantMessage]
  );

  // Entry point from other screens (e.g. property detail), which route back
  // here with `startRegistration=1` instead of a dedicated register screen.
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
        'Micrófono no disponible',
        'No pudimos acceder al micrófono. Revisa los permisos de la app o escribe tu mensaje.',
        [{ text: 'Entendido' }]
      );
    }
  }, [recorder, handleSendAudio]);

  const handleMenu = () => {
    setIsMenuOpen(true);
  };

  const handleMenuItemSelect = (key: string) => {
    if (key === 'register') {
      handleSend(REGISTER_COMMAND);
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
          initialNumToRender={50}
        />

        {/* Registration step quick actions */}
        {registration.state.mode === 'photos' && (
          <>
            {(registration.state.draft.images?.length || 0) > 0 && (
              <View style={styles.photoGridWrapper}>
                <PropertyPhotoGrid
                  images={registration.state.draft.images || []}
                  maxImages={MAX_PROPERTY_IMAGES}
                  onRemove={registration.removePhoto}
                  onMove={registration.movePhoto}
                  onAddPress={() => handleSend(ADD_PHOTOS_CHIP)}
                />
              </View>
            )}
            <SuggestionChips
              chips={[ADD_PHOTOS_CHIP, SKIP_PHOTOS_CHIP]}
              onSelectChip={handleSend}
              disabled={loading}
            />
          </>
        )}
        {registration.state.mode === 'location' && (
          <SuggestionChips
            chips={[SET_LOCATION_CHIP]}
            onSelectChip={handleSend}
            disabled={loading}
          />
        )}
        {registration.state.mode === 'confirming' && (
          <SuggestionChips
            chips={[CONFIRM_CHIP, CORRECT_CHIP, CHANGE_PHOTOS_CHIP, CHANGE_LOCATION_CHIP]}
            onSelectChip={handleSend}
            disabled={loading}
          />
        )}

        {/* Don Carlos Serene Hearth Input Dock */}
        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onMicPress={handleMicPress}
          isRecording={recorder.state.status === 'recording'}
          placeholder="Escriba su consulta aquí..."
          loading={loading || recorder.state.status === 'processing'}
        />
      </KeyboardAvoidingView>

      {/* Slide-in Burger Menu */}
      <BurgerMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectMenuItem={handleMenuItemSelect}
      />

      {/* Location picker for property registration */}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  photoGridWrapper: {
    paddingHorizontal: spacing.marginMobile,
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
