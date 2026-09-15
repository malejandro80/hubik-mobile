import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BurgerMenu } from '../components/BurgerMenu';
import { ChatInputBar } from '../components/ChatInputBar';
import { Header } from '../components/Header';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, shapes, spacing, typography } from '../theme/colors';

const EXAMPLE_QUOTE =
  '“Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.”';

export default function RegisterPropertyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    Alert.alert(
      'Vivienda recibida',
      `Hemos registrado su descripción:\n\n"${text}"\n\nSu asesor personal la revisará para completar la ficha.`,
      [
        { text: 'Volver al inicio', onPress: () => router.push('/') },
        { text: 'Aceptar', style: 'cancel' },
      ]
    );
    setInputText('');
  };

  const handleMicPress = () => {
    Alert.alert(
      'Micrófono Hubik',
      'Escuchando... Cuéntenos los detalles de su vivienda con tranquilidad.',
      [
        {
          text: 'Rellenar ejemplo',
          onPress: () => setInputText('Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.'),
        },
        { text: 'Entendido' },
      ]
    );
  };

  const handleMenuItemSelect = (key: string) => {
    setIsMenuOpen(false);
    if (key === 'search' || key === 'new_chat') {
      router.push('/');
    } else if (key === 'saved') {
      Alert.alert('Propiedades Guardadas', 'Aún no ha guardado propiedades en sus favoritos.');
    } else if (key === 'settings') {
      Alert.alert('Ajustes', 'Configuraciones de voz, lectura y accesibilidad para Don Carlos.');
    } else if (key === 'help') {
      Alert.alert('Ayuda y Soporte', 'Comuníquese con el equipo de soporte de Hubik o su asesor personal.');
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* Top Architectural Header */}
      <Header
        title="Hubik"
        onBackPress={() => router.back()}
        onMenuPress={() => setIsMenuOpen(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Editorial Title & Subtitle */}
          <View style={styles.headerBlock}>
            <Text style={[styles.mainTitle, { color: theme.primary }]}>
              Vamos a registrar su vivienda, Don Carlos.
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Es tan fácil como contármelo con sus propias palabras, sin tecnicismos ni prisas.
            </Text>
          </View>

          {/* Guide Card Container */}
          <View
            style={[
              styles.guideCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Guide Card Header with Sparkles Badge */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.sparkleBadge}>
                <Ionicons name="sparkles" size={20} color="#2C685A" />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Puede decir algo como:
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Un ejemplo sencillo y natural
                </Text>
              </View>
            </View>

            {/* Quote Container (Tappable for Quick Voice / Input Simulation) */}
            <TouchableOpacity
              style={[
                styles.quoteBox,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.outlineVariant,
                },
              ]}
              onPress={() =>
                setInputText(
                  'Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.'
                )
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Usar frase de ejemplo"
            >
              <Text style={[styles.quoteText, { color: theme.text }]}>
                {EXAMPLE_QUOTE}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spacing for fixed bottom dock */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Uniform Serene Hearth Bottom Dock */}
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.outlineVariant,
            },
          ]}
        >
          <ChatInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onMicPress={handleMicPress}
            placeholder="Escriba su consulta aquí..."
            hasTopBorder={false}
            containerStyle={styles.dockInputContainer}
          />
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
  flex1: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerBlock: {
    marginBottom: 24,
  },
  mainTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  subtitle: {
    ...typography.bodyLG,
    fontSize: 16,
    lineHeight: 24,
  },
  guideCard: {
    borderRadius: shapes.xl, // 20px
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#02241F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sparkleBadge: {
    width: 42,
    height: 42,
    borderRadius: shapes.full,
    backgroundColor: '#D2F3EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderTexts: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  quoteBox: {
    borderRadius: shapes.md, // 12px
    borderWidth: 1,
    padding: 16,
  },
  quoteText: {
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  bottomDock: {
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  dockInputContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
