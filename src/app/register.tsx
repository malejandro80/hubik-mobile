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
import { BinaryClarificationCard } from '../components/wizard/BinaryClarificationCard';
import { PushToTalkButton } from '../components/wizard/PushToTalkButton';
import { ReactiveSummaryCard } from '../components/wizard/ReactiveSummaryCard';
import { WizardProgressBar } from '../components/wizard/WizardProgressBar';
import { useColorScheme } from '../hooks/useColorScheme';
import { useVoiceWizardMachine } from '../hooks/useVoiceWizardMachine';
import { colors, shapes, spacing, typography } from '../theme/colors';

const EXAMPLE_QUOTE =
  '“Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.”';

export default function RegisterPropertyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    state,
    startRecording,
    stopRecording,
    processInput,
    answerQuestion,
    goToStep,
    addPhoto,
    publishProperty,
  } = useVoiceWizardMachine();

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    processInput(text);
    setInputText('');
  };

  const handleMicPress = () => {
    Alert.alert(
      'Micrófono Hubik',
      'Escuchando... Cuéntenos los detalles de su vivienda con tranquilidad.',
      [
        {
          text: 'Rellenar ejemplo',
          onPress: () => {
            const quote = 'Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.';
            setInputText(quote);
            processInput(quote);
          },
        },
        { text: 'Entendido' },
      ]
    );
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      goToStep((state.currentStep - 1) as 1 | 2);
    } else {
      router.back();
    }
  };

  const activeQuestion =
    state.questions.length > 0 && state.activeQuestionIndex < state.questions.length
      ? state.questions[state.activeQuestionIndex]
      : null;

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Hubik" onBackPress={handleBack} onMenuPress={() => setIsMenuOpen(true)} />

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <WizardProgressBar currentStep={state.currentStep} />

          {/* STEP 1: EXTRACCIÓN E INGESTA POR VOZ */}
          {state.currentStep === 1 && (
            <View>
              <View style={styles.headerBlock}>
                <Text style={[styles.mainTitle, { color: theme.primary }]}>Vamos a registrar su vivienda, Don Carlos.</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Es tan fácil como contármelo con sus propias palabras, sin tecnicismos ni prisas.
                </Text>
              </View>

              {/* Guide Card Container */}
              <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.sparkleBadge}><Ionicons name="sparkles" size={20} color="#2C685A" /></View>
                  <View style={styles.cardHeaderTexts}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Puede decir algo como:</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Un ejemplo sencillo y natural</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.quoteBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}
                  onPress={() => {
                    const quote = 'Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.';
                    setInputText(quote);
                    processInput(quote);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Usar frase de ejemplo"
                >
                  <Text style={[styles.quoteText, { color: theme.text }]}>{EXAMPLE_QUOTE}</Text>
                </TouchableOpacity>
              </View>

              {/* Push-to-Talk 68dp button with pulse */}
              <PushToTalkButton
                isRecording={state.step1State === 'recording'}
                onPressIn={startRecording}
                onPressOut={() => {
                  stopRecording();
                  processInput('Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.');
                }}
              />

              {/* Reactive Visual Summary Card */}
              <ReactiveSummaryCard data={state.data} />

              {/* Binary Clarification Question Card [SÍ] / [NO] */}
              {activeQuestion && !activeQuestion.answered && (
                <BinaryClarificationCard
                  question={activeQuestion}
                  currentIndex={state.activeQuestionIndex}
                  totalQuestions={state.questions.length}
                  onAnswer={answerQuestion}
                />
              )}

              {/* Continue to Step 2 Button */}
              {state.step1State === 'step_1_complete' && (
                <TouchableOpacity
                  style={[styles.primaryActionButton, { backgroundColor: theme.primary }]}
                  onPress={() => goToStep(2)}
                  accessibilityRole="button"
                  accessibilityLabel="Continuar a Ubicación y Fotos"
                >
                  <Text style={styles.primaryActionButtonText}>Continuar a Ubicación y Fotos</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 2: UBICACIÓN Y FOTOS */}
          {state.currentStep === 2 && (
            <View>
              <View style={styles.headerBlock}>
                <Text style={[styles.mainTitle, { color: theme.primary }]}>Ubicación y Fotografías</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Verifique la ubicación en Chamberí y agregue fotos de las estancias principales.
                </Text>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="location-outline" size={22} color={theme.primary} />
                  <Text style={[styles.cardTitle, { color: theme.text, marginLeft: 8 }]}>Calle Santa Engracia, Chamberí, Madrid</Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Zona céntrica de alta demanda · Código Postal 28010</Text>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>Fotos Categorizadas ({state.photos.length})</Text>
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: theme.surfaceContainer, borderColor: theme.outline }]}
                    onPress={() => addPhoto({ id: `photo-${Date.now()}`, category: 'salon', uri: 'file://salon.jpg', label: 'Salón' })}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir foto de salón"
                  >
                    <Ionicons name="camera-outline" size={20} color={theme.primary} />
                    <Text style={[styles.photoButtonText, { color: theme.text }]}>+ Salón</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: theme.surfaceContainer, borderColor: theme.outline }]}
                    onPress={() => addPhoto({ id: `photo-${Date.now()}`, category: 'fachada', uri: 'file://fachada.jpg', label: 'Fachada' })}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir foto de fachada"
                  >
                    <Ionicons name="image-outline" size={20} color={theme.primary} />
                    <Text style={[styles.photoButtonText, { color: theme.text }]}>+ Fachada</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionButton, { backgroundColor: theme.primary }]}
                onPress={() => goToStep(3)}
                accessibilityRole="button"
                accessibilityLabel="Continuar a Validación"
              >
                <Text style={styles.primaryActionButtonText}>Continuar a Validación</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: IDENTIDAD, DUEÑO Y VALIDACIÓN */}
          {state.currentStep === 3 && (
            <View>
              <View style={styles.headerBlock}>
                <Text style={[styles.mainTitle, { color: theme.primary }]}>Validación y Publicación</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Revisión catastral y aislamiento estricto de sus datos de contacto.
                </Text>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 6 }]}>Referencia Catastral</Text>
                <Text style={[styles.cadastralText, { color: theme.primary }]}>9872023VH5797S0001WX</Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary, marginTop: 4 }]}>Inmueble verificado en Sede Electrónica de Catastro</Text>
              </View>

              {/* Isolated PII Banner */}
              <View style={[styles.piiBanner, { backgroundColor: '#E3EFEA', borderColor: theme.secondary }]}>
                <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
                <View style={styles.piiBannerContent}>
                  <Text style={[styles.piiTitle, { color: theme.primary }]}>Aislamiento Estricto de PII</Text>
                  <Text style={[styles.piiSubtitle, { color: theme.onSurfaceVariant }]}>
                    Don Carlos: su teléfono y correo jamás serán incluidos en el buscador ni en copys comerciales públicos.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  publishProperty();
                  Alert.alert('¡Vivienda Publicada!', 'Su piso en Chamberí ha sido registrado exitosamente en Hubik.', [
                    { text: 'Ir al Chat', onPress: () => router.push('/') },
                  ]);
                }}
                accessibilityRole="button"
                accessibilityLabel="Publicar Vivienda"
              >
                <Text style={styles.primaryActionButtonText}>Publicar Vivienda en Hubik</Text>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={[styles.bottomDock, { backgroundColor: theme.background, borderTopColor: theme.outlineVariant }]}>
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

      <BurgerMenu visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} onSelectMenuItem={() => setIsMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.marginMobile, paddingTop: 16, paddingBottom: 24 },
  headerBlock: { marginBottom: 18 },
  mainTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: { ...typography.bodyLG, fontSize: 16, lineHeight: 24 },
  guideCard: { borderRadius: shapes.xl, borderWidth: 1.5, padding: 18, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sparkleBadge: { width: 42, height: 42, borderRadius: shapes.full, backgroundColor: '#D2F3EA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardHeaderTexts: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  cardSubtitle: { fontSize: 14 },
  quoteBox: { borderRadius: shapes.md, borderWidth: 1, padding: 14 },
  quoteText: { fontStyle: 'italic', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  primaryActionButton: {
    height: spacing.touchDefault,
    borderRadius: shapes.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  primaryActionButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  sectionCard: { borderRadius: shapes.lg, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  photoActionsRow: { flexDirection: 'row', gap: 12 },
  photoButton: { flex: 1, height: spacing.touchMin, borderRadius: shapes.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoButtonText: { fontSize: 15, fontWeight: '600' },
  cadastralText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, marginVertical: 4 },
  piiBanner: { flexDirection: 'row', padding: 16, borderRadius: shapes.lg, borderWidth: 1.5, marginBottom: 20, gap: 12 },
  piiBannerContent: { flex: 1 },
  piiTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  piiSubtitle: { fontSize: 14, lineHeight: 20 },
  bottomDock: { paddingHorizontal: spacing.marginMobile, paddingTop: 8, paddingBottom: 16, borderTopWidth: 1 },
  dockInputContainer: { paddingHorizontal: 0, paddingVertical: 0 },
});
