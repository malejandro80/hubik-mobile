import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BurgerMenu } from '../../components/BurgerMenu';
import { ChatInputBar } from '../../components/ChatInputBar';
import { Header } from '../../components/Header';
import { useColorScheme } from '../../hooks/useColorScheme';
import { colors, shapes, spacing, typography } from '../../theme/colors';

interface AccessibilityCardItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const NEARBY_AMENITIES = [
  {
    icon: 'medical-outline' as const,
    title: 'Farmacia 24 horas',
    distance: 'A 80 metros',
  },
  {
    icon: 'cart-outline' as const,
    title: 'Supermercado tradicional',
    distance: 'A 120 metros',
  },
  {
    icon: 'bus-outline' as const,
    title: 'Líneas de autobús 1, 9 y 19',
    distance: 'A 150 metros',
  },
  {
    icon: 'fitness-outline' as const,
    title: 'Centro de Salud Lagasca',
    distance: 'A 380 metros',
  },
];

export default function PropertyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    price?: string;
    city?: string;
    address?: string;
    bedrooms?: string;
    bathrooms?: string;
    square_meters?: string;
    image_url?: string;
    description?: string;
    images?: string;
    lat?: string;
    lng?: string;
  }>();

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [quickQuestion, setQuickQuestion] = useState('');

  // Fallback defaults matching high-fidelity mockup
  const city = params.city || 'Madrid';
  const title = params.title || `Barrio de Salamanca, ${city}`;
  const price = params.price
    ? `$${Number(params.price).toLocaleString('en-US')}`
    : '485.000 €';
  const address = params.address || 'Calle Claudio Coello';
  const bedrooms = params.bedrooms || '3';
  const bathrooms = params.bathrooms || '2';
  const squareMeters = params.square_meters || '120';
  const realImages: string[] = (() => {
    if (!params.images) return [];
    try {
      const parsed = JSON.parse(params.images);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  })();
  // A real registration draft is distinguished by carrying an AI-generated description;
  // legacy/seeded properties (no description param) keep today's mockup content untouched.
  const isRealDraft = Boolean(params.description);
  const imageUrl =
    realImages[0] ||
    params.image_url ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';
  const photoCountLabel = isRealDraft
    ? realImages.length > 0
      ? `1 de ${realImages.length} foto${realImages.length === 1 ? '' : 's'}`
      : 'Sin fotos'
    : '1 de 8 fotos';

  const accessibilityFeatures: AccessibilityCardItem[] = [
    {
      icon: 'business-outline',
      title: 'Ascensor directo',
      subtitle: 'Sin escalón en portal',
    },
    {
      icon: 'walk-outline',
      title: 'Acceso plano',
      subtitle: 'Pasillos anchos (95cm)',
    },
    {
      icon: 'water-outline',
      title: `${bathrooms} Baños adaptados`,
      subtitle: 'Ducha llana antideslizante',
    },
    {
      icon: 'sunny-outline',
      title: `${squareMeters} m² soleados`,
      subtitle: 'Luz natural de mañana',
    },
    {
      icon: 'bed-outline',
      title: `${bedrooms} Habitaciones`,
      subtitle: 'Armarios empotrados',
    },
    {
      icon: 'thermometer-outline',
      title: 'Calefacción central',
      subtitle: 'Excelente aislamiento',
    },
  ];

  const handleContactAdvisor = () => {
    Alert.alert(
      'Contactar asesor',
      'Conectando con su asesor personal de Hubik para coordinar una visita accesible.',
      [{ text: 'Entendido' }]
    );
  };

  const handleQuickQuestion = () => {
    if (!quickQuestion.trim()) return;
    Alert.alert('Consulta enviada', `Su pregunta: "${quickQuestion}" ha sido enviada al asistente.`);
    setQuickQuestion('');
  };

  const handleMicPress = () => {
    Alert.alert('Micrófono Hubik', 'Hable con tranquilidad para consultar sobre esta vivienda.');
  };

  const handleMenuItemSelect = (key: string) => {
    setIsMenuOpen(false);
    if (key === 'register') {
      router.push({ pathname: '/', params: { startRegistration: '1' } });
    } else if (key === 'new_chat' || key === 'search') {
      router.push('/');
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* Top Header */}
      <Header
        title="Hubik"
        onBackPress={() => router.back()}
        onMenuPress={() => setIsMenuOpen(true)}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Hero Image Container with Photo Count Badge */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.photoCountBadge}>
            <Ionicons name="images-outline" size={14} color="#191C1B" style={styles.badgeIcon} />
            <Text style={styles.photoCountText}>{photoCountLabel}</Text>
          </View>
        </View>

        {/* Price & Location Header */}
        <View style={styles.priceLocationBlock}>
          <Text style={[styles.priceText, { color: theme.primary }]}>
            {price}
          </Text>

          <View style={styles.agencyBadge}>
            <Text style={styles.agencyBadgeText}>Sin honorarios de agencia</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={20}
              color={theme.secondary}
              style={styles.locationPin}
            />
            <View style={styles.locationTexts}>
              <Text style={[styles.neighborhoodTitle, { color: theme.text }]}>
                {title}
              </Text>
              <Text style={[styles.addressSubtitle, { color: theme.textSecondary }]}>
                {isRealDraft ? address : `${address} · 2ª planta con ascensor cota cero`}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Características de Accesibilidad y Confort */}
        {/* Only shown for legacy/seeded properties - this copy is generic marketing
            filler, not real per-property data, so it would be misleading next to an
            actual user-submitted registration draft. */}
        {!isRealDraft && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Características de Accesibilidad y Confort
            </Text>

            <View style={styles.gridContainer}>
              {accessibilityFeatures.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.featureCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.featureIconBadge}>
                    <Ionicons name={item.icon} size={20} color="#2C685A" />
                  </View>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.featureSubtitle, { color: theme.textSecondary }]}>
                    {item.subtitle}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section: Descripción de la vivienda */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>
            Descripción de la vivienda
          </Text>

          <View style={styles.descriptionBlock}>
            {isRealDraft ? (
              <Text style={[styles.descriptionParagraph, { color: theme.text }]}>
                {params.description}
              </Text>
            ) : (
              <>
                <Text style={[styles.descriptionParagraph, { color: theme.text }]}>
                  Vivienda totalmente exterior y luminosa, ubicada en una finca señorial tranquila con portero físico y ascensor accesible a cota cero sin desniveles.
                </Text>
                <Text style={[styles.descriptionParagraph, { color: theme.text }]}>
                  Dispone de un amplio salón con balcones orientados al este con sol matutino, suelo de parqué natural en espiga pulido y puertas anchas. La cocina es independiente, con espacio para mesa de comedor diario y acabados ergonómicos.
                </Text>
                <Text style={[styles.descriptionParagraph, { color: theme.text }]}>
                  Los baños disponen de plato de ducha a nivel de suelo y asideros de diseño. Un entorno pensado para el descanso, la seguridad y el confort duradero.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Section: Cercanías a pie - legacy/seeded properties only, same reasoning as above. */}
        {!isRealDraft && (
          <View style={styles.sectionContainer}>
            <View
              style={[
                styles.amenitiesCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.amenitiesTitle, { color: theme.primary }]}>
                Cercanías a pie
              </Text>

              <View style={styles.amenitiesList}>
                {NEARBY_AMENITIES.map((amenity, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.amenityRow,
                      idx < NEARBY_AMENITIES.length - 1 ? styles.amenityBorder : null,
                    ]}
                  >
                    <View style={styles.amenityLeft}>
                      <Ionicons
                        name={amenity.icon}
                        size={20}
                        color="#2C685A"
                        style={styles.amenityIcon}
                      />
                      <Text style={[styles.amenityName, { color: theme.text }]}>
                        {amenity.title}
                      </Text>
                    </View>
                    <Text style={[styles.amenityDistance, { color: theme.textSecondary }]}>
                      {amenity.distance}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Extra spacing for fixed floating dock */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Fixed Bottom Dock: Contactar Asesor + Quick Prompt Pill */}
      <View
        style={[
          styles.bottomDock,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.outlineVariant,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactAdvisor}
          accessibilityRole="button"
          accessibilityLabel="Contactar asesor de Hubik"
        >
          <Ionicons
            name="headset-outline"
            size={22}
            color="#FFFFFF"
            style={styles.contactIcon}
          />
          <Text style={styles.contactButtonText}>Contactar asesor</Text>
        </TouchableOpacity>

        {/* Uniform ChatInputBar */}
        <ChatInputBar
          value={quickQuestion}
          onChangeText={setQuickQuestion}
          onSend={handleQuickQuestion}
          onMicPress={handleMicPress}
          placeholder="Escriba su consulta aquí..."
          hasTopBorder={false}
          containerStyle={styles.detailInputContainer}
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingTop: 14,
    paddingBottom: 24,
  },
  imageWrapper: {
    width: '100%',
    height: 240,
    borderRadius: shapes.xl, // 24px
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    backgroundColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  photoCountBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shapes.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIcon: {
    marginRight: 6,
  },
  photoCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191C1B',
  },
  priceLocationBlock: {
    marginBottom: 24,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  agencyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D2F3EA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: shapes.sm, // 4px
    marginBottom: 16,
  },
  agencyBadgeText: {
    color: '#1A6354',
    fontSize: 13,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationPin: {
    marginRight: 8,
    marginTop: 2,
  },
  locationTexts: {
    flex: 1,
  },
  neighborhoodTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  addressSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    borderRadius: shapes.lg, // 16px
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  featureIconBadge: {
    width: 36,
    height: 36,
    borderRadius: shapes.sm, // 8px
    backgroundColor: '#D2F3EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  descriptionBlock: {
    paddingVertical: 4,
  },
  descriptionParagraph: {
    ...typography.bodyLG,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
  },
  amenitiesCard: {
    borderRadius: shapes.xl, // 20px
    borderWidth: 1.5,
    padding: 18,
  },
  amenitiesTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  amenitiesList: {
    width: '100%',
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  amenityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDEEEC',
  },
  amenityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amenityIcon: {
    marginRight: 12,
  },
  amenityName: {
    fontSize: 15,
    fontWeight: '600',
  },
  amenityDistance: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    shadowColor: '#02241F',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: shapes.lg, // 16px
    backgroundColor: '#163931',
    marginBottom: 10,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  detailInputContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
