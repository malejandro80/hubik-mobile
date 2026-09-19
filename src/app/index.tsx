import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ChatMessage, Property, PROPERTY_TYPE_LABEL_ES, PropertyDraft } from '../types/property';

const REGISTER_COMMAND = '/agregar-propiedad';
const CANCEL_PHRASES = ['cancelar registro', 'cancelar'];

function isConfirmIntent(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'confirmar y publicar',
    'confirmar',
    'publicar',
    'confirmo',
    'publicala',
    'publicalo',
    'publicar propiedad',
    'sí',
    'si',
    'adelante',
    'todo bien',
    'de acuerdo',
    'correcto',
    'está bien',
    'esta bien',
    'dale',
    'perfecto',
    'listo',
    'ok',
    'proceder',
  ];
  return phrases.some((p) => lower === p || lower.startsWith(p + ' ') || lower.endsWith(' ' + p));
}

function isContinueIntent(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'continuar sin fotos',
    'continuar',
    'sin fotos',
    'no tengo fotos',
    'no quiero fotos',
    'omitir fotos',
    'omitir',
    'seguir',
    'pasar',
    'siguiente',
    'después',
    'despues',
    'más tarde',
    'mas tarde',
    'ninguna',
    'no por ahora',
    'no',
  ];
  return phrases.some((p) => lower === p || lower.startsWith(p + ' ') || lower.endsWith(' ' + p));
}

function isLocationIntent(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'fijar ubicación',
    'fijar ubicacion',
    'marcar ubicación',
    'marcar ubicacion',
    'abrir mapa',
    'ver mapa',
    'mapa',
    'ubicar',
    'ubicación',
    'ubicacion',
    'poner ubicación',
    'poner ubicacion',
    'localización',
    'localizacion',
  ];
  return phrases.some((p) => lower === p || lower.includes(p));
}

function isPhotosIntent(text: string): boolean {
  if (isContinueIntent(text)) return false;
  const lower = text.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const phrases = [
    'adjuntar fotos',
    'adjuntar más fotos',
    'adjuntar mas fotos',
    'agregar fotos',
    'subir fotos',
    'poner fotos',
    'cambiar fotos',
    'añadir fotos',
    'anadir fotos',
    'fotos',
    'imágenes',
    'imagenes',
  ];
  return phrases.some((p) => lower === p || lower.includes(p));
}

const REGISTER_EXAMPLE =
  'Para comenzar, indíqueme la referencia catastral de la propiedad (puede consultarla en el recibo del IBI o en la Sede Electrónica del Catastro). La verificaré para asegurarnos de que no esté ya registrada antes de seguir. Después de eso, puede describir el resto de la propiedad de una sola vez, por voz o por texto (tipo, precio, habitaciones, baños, metros, ciudad y dirección) — no hace falta ir dato por dato.';

function formatDraftSummary(draft: PropertyDraft): string {
  const opLabel = draft.operation_type === 'rent' ? 'Alquiler' : 'Venta';
  const typeLabel = draft.property_type ? PROPERTY_TYPE_LABEL_ES[draft.property_type] : '—';
  const currencySymbol = draft.currency === 'USD' ? '$' : draft.currency === 'VES' ? 'Bs.' : '€';
  const priceLabel = draft.price !== undefined ? `${draft.price.toLocaleString('es-ES')} ${currencySymbol}` : '—';

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
        if (isConfirmIntent(lower)) {
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

        if (isPhotosIntent(lower)) {
          registration.editPhotos();
          appendAssistantMessage(newMessages, '¿Desea agregar o cambiar las fotos de la propiedad? Diga "adjuntar fotos", o "continuar" para mantener las que tiene.');
          return;
        }

        if (isLocationIntent(lower)) {
          registration.editLocation();
          setMapPickerVisible(true);
          return;
        }

        if (lower.includes('corregir') || lower.includes('cambiar') || lower.includes('modificar')) {
          appendAssistantMessage(newMessages, '¿Qué dato desea corregir? Cuéntemelo y lo actualizo.');
          return;
        }
      }

      // Photos step: either open the picker or move on (with or without photos already staged).
      if (registration.state.mode === 'photos') {
        if (isContinueIntent(lower)) {
          registration.skipPhotos();
          appendAssistantMessage(
            newMessages,
            'Perfecto. Ahora diga o escriba "fijar ubicación" o "abrir mapa" para marcar en el mapa dónde está la propiedad.'
          );
          return;
        }

        if (isPhotosIntent(lower)) {
          setLoading(true);
          try {
            // Request permission explicitly before launching the picker - asking for it
            // up front (rather than relying on launchImageLibraryAsync's implicit request)
            // avoids the OS permission prompt interrupting the picker call itself, which on
            // some devices makes that first launch return canceled right after the user taps
            // "OK" on the permission note, silently blocking the flow.
            const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
            const granted = permission.granted
              ? true
              : (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;

            if (!granted) {
              appendAssistantMessage(
                newMessages,
                'Necesito permiso para acceder a sus fotos. Actívelo desde los ajustes del dispositivo para adjuntar imágenes, o diga "continuar sin fotos".'
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
                `Añadí ${uris.length} foto(s). Tiene ${images.length} en total (se subirán al publicar). Puede decir o escribir "continuar" para seguir con el registro, o agregar más fotos.`
              );
            } else {
              appendAssistantMessage(newMessages, 'No se seleccionó ninguna foto. Puede intentarlo de nuevo o decir "continuar sin fotos".');
            }
          } catch (err: any) {
            appendAssistantMessage(
              newMessages,
              `⚠️ No pude seleccionar esas fotos (${err?.message || 'error desconocido'}). Intente de nuevo.`
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

      // Location step: opens the map picker modal; confirming it is handled separately.
      if (registration.state.mode === 'location' && isLocationIntent(lower)) {
        setMapPickerVisible(true);
        return;
      }

      // Any other message while a draft is in progress is treated as new/updated info.
      if (registration.state.mode !== 'idle') {
        const wasConfirming = registration.state.mode === 'confirming';
        setLoading(true);
        try {
          const outcome = await registration.processMessage(textToSend);
          // Correcting a field from the confirmation screen returns straight there (see the
          // hook's nextModeOnReady) - show the updated summary instead of re-asking for photos,
          // which only makes sense the first time the draft becomes complete.
          const text = outcome.readyToConfirm
            ? wasConfirming
              ? `${outcome.assistantMessage}\n\n${formatDraftSummary(outcome.draft)}\n\n¿Los datos son correctos? Diga o escriba "confirmar" o "publicar" para publicarla, o indíqueme qué desea corregir.`
              : `${outcome.assistantMessage}\n\n¿Desea agregar fotos de la propiedad? Puede decir "adjuntar fotos" (hasta ${MAX_PROPERTY_IMAGES}), o decir "continuar sin fotos" para seguir adelante.`
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
          const transcript = (outcome.transcript || '').trim();
          const lowerTranscript = transcript.toLowerCase();

          // Check cancel
          if (CANCEL_PHRASES.some((p) => lowerTranscript.includes(p))) {
            registration.cancel();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
            ];
            appendAssistantMessage(newMessages, 'De acuerdo, cancelé el registro. Puede volver a intentarlo cuando quiera.');
            return;
          }

          // Check confirm in confirming mode
          if (registration.state.mode === 'confirming' && isConfirmIntent(lowerTranscript)) {
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
            ];
            setMessages(newMessages);
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
            }
            return;
          }

          // Check photos in confirming mode
          if (registration.state.mode === 'confirming' && isPhotosIntent(lowerTranscript)) {
            registration.editPhotos();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
            ];
            appendAssistantMessage(newMessages, '¿Desea agregar o cambiar las fotos de la propiedad? Diga "adjuntar fotos", o "continuar" para mantener las que tiene.');
            return;
          }

          // Check location in confirming mode
          if (registration.state.mode === 'confirming' && isLocationIntent(lowerTranscript)) {
            registration.editLocation();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
            ];
            setMessages(newMessages);
            setMapPickerVisible(true);
            return;
          }

          // Check photos in photos mode (voice note to add photos)
          if (registration.state.mode === 'photos' && isPhotosIntent(lowerTranscript)) {
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
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
                  'Necesito permiso para acceder a sus fotos. Actívelo desde los ajustes del dispositivo para adjuntar imágenes, o diga "continuar sin fotos".'
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
                  `Añadí ${uris.length} foto(s). Tiene ${images.length} en total (se subirán al publicar). Puede decir o escribir "continuar" para seguir con el registro, o agregar más fotos.`
                );
              } else {
                appendAssistantMessage(newMessages, 'No se seleccionó ninguna foto. Puede intentarlo de nuevo o decir "continuar sin fotos".');
              }
            } catch (err: any) {
              appendAssistantMessage(
                newMessages,
                `⚠️ No pude seleccionar esas fotos (${err?.message || 'error desconocido'}). Intente de nuevo.`
              );
            }
            return;
          }

          // Check continue in photos mode
          if (registration.state.mode === 'photos' && isContinueIntent(lowerTranscript)) {
            registration.skipPhotos();
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
            ];
            appendAssistantMessage(
              newMessages,
              'Perfecto. Ahora diga o escriba "fijar ubicación" o "abrir mapa" para marcar en el mapa dónde está la propiedad.'
            );
            return;
          }

          // Check location in location mode
          if (registration.state.mode === 'location' && isLocationIntent(lowerTranscript)) {
            const newMessages: ChatMessage[] = [
              ...messages,
              { id: generateMessageId('user'), sender: 'user', text: transcript, timestamp: 'Just now' },
            ];
            setMessages(newMessages);
            setMapPickerVisible(true);
            return;
          }

          // Normal draft field extraction outcome:
          const wasConfirming = registration.state.mode === 'confirming';
          const newMessages: ChatMessage[] = [
            ...messages,
            { id: generateMessageId('user'), sender: 'user', text: transcript || '🎤 Nota de voz', timestamp: 'Just now' },
          ];
          const text = outcome.readyToConfirm
            ? wasConfirming
              ? `${outcome.assistantMessage}\n\n${formatDraftSummary(outcome.draft)}\n\n¿Los datos son correctos? Diga o escriba "confirmar" o "publicar" para publicarla, o indíqueme qué desea corregir.`
              : `${outcome.assistantMessage}\n\n¿Desea agregar fotos de la propiedad? Puede decir "adjuntar fotos" (hasta ${MAX_PROPERTY_IMAGES}), o decir "continuar sin fotos" para seguir adelante.`
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
          `¡Listo! Aquí tiene la vista previa. Puede editar cualquier dato antes de publicar.\n\n${formatDraftSummary(finalDraft)}\n\n¿Los datos son correctos? Diga o escriba "confirmar" o "publicar" para publicarla, o indíqueme qué desea corregir.`,
          [buildDraftPreviewProperty(finalDraft)]
        );
      } catch (err: any) {
        appendAssistantMessage(
          withLocationMessages,
          `⚠️ No pude generar la descripción (${err?.message || 'error desconocido'}). Diga o escriba "fijar ubicación" para intentar de nuevo.`
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
            onAddPress={() => handleSend('Adjuntar más fotos')}
          />
        </View>
      );
    }

    return null;
  }, [
    registration.state.mode,
    stagedImages,
    registration.removePhoto,
    registration.movePhoto,
    handleSend,
  ]);

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
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={50}
        />



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
