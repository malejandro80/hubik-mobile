import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { useAppMenu } from '../../hooks/useAppMenu';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useLabels } from '../../hooks/useLabels';
import { generatePropertyDescription } from '../../services/chatApi';
import { colors } from '../../theme/colors';
import { PREVIEW_PARAM_VALUE } from '../../constants/listingPreview';
import { getPropertyDetailStyles } from './[id].styles';
import {
  AccessibilityCardItem,
  DescriptionState,
  formatPrice,
  getNearbyAmenities,
  parsePropertyImages,
  resolveDescriptionState,
  resolvePhotoCountLabel,
} from '../../lib/propertyDetail';

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
    agency_name?: string;
    agent_name?: string;
    preview?: string;
  }>();

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const {
    styles,
    iconColor,
    iconColorSecondary,
    iconColorOnPrimary,
    primaryColor,
  } = useMemo(() => getPropertyDetailStyles(theme), [theme]);
  const menu = useAppMenu();
  const [quickQuestion, setQuickQuestion] = useState('');
  const nearbyAmenities = useMemo(() => getNearbyAmenities(labels), [labels]);

  const city = params.city || 'Madrid';
  const title = params.title || `Barrio de Salamanca, ${city}`;
  const price = useMemo(() => formatPrice(params.price), [params.price]);
  const address = params.address || 'Calle Claudio Coello';
  const bedrooms = params.bedrooms || '3';
  const bathrooms = params.bathrooms || '2';
  const squareMeters = params.square_meters || '120';
  const realImages = useMemo(() => parsePropertyImages(params.images), [params.images]);
  const isPreview = params.preview === PREVIEW_PARAM_VALUE;
  const isRealDraft = isPreview || Boolean(params.description);
  const imageUrl =
    realImages[0] ||
    params.image_url ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';
  const photoCountLabel = useMemo(
    () => resolvePhotoCountLabel(isRealDraft, realImages.length, labels),
    [isRealDraft, realImages.length, labels]
  );

  const [legacyDescription, setLegacyDescription] = useState<string | null>(null);
  const [legacyDescriptionLoading, setLegacyDescriptionLoading] = useState(false);
  const [legacyDescriptionError, setLegacyDescriptionError] = useState(false);

  useEffect(() => {
    if (isRealDraft) return;
    let cancelled = false;
    setLegacyDescriptionLoading(true);
    setLegacyDescriptionError(false);
    generatePropertyDescription({
      title,
      price: Number(params.price) || undefined,
      bedrooms: Number(bedrooms) || undefined,
      bathrooms: Number(bathrooms) || undefined,
      square_meters: Number(squareMeters) || undefined,
      city,
      address,
    })
      .then(({ description }) => {
        if (!cancelled) setLegacyDescription(description);
      })
      .catch(() => {
        if (!cancelled) setLegacyDescriptionError(true);
      })
      .finally(() => {
        if (!cancelled) setLegacyDescriptionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    isRealDraft,
    params.id,
    title,
    params.price,
    bedrooms,
    bathrooms,
    squareMeters,
    city,
    address,
  ]);

  const accessibilityFeatures: AccessibilityCardItem[] = [
    {
      icon: 'business-outline',
      title: labels.propertyDetail.features.directElevator,
      subtitle: labels.propertyDetail.features.directElevatorSub,
    },
    {
      icon: 'walk-outline',
      title: labels.propertyDetail.features.flatAccess,
      subtitle: labels.propertyDetail.features.flatAccessSub,
    },
    {
      icon: 'water-outline',
      title: labels.propertyDetail.features.adaptedBaths(bathrooms),
      subtitle: labels.propertyDetail.features.adaptedBathsSub,
    },
    {
      icon: 'sunny-outline',
      title: labels.propertyDetail.features.sunnySqm(squareMeters),
      subtitle: labels.propertyDetail.features.sunnySqmSub,
    },
    {
      icon: 'bed-outline',
      title: labels.propertyDetail.features.bedroomsCount(bedrooms),
      subtitle: labels.propertyDetail.features.bedroomsCountSub,
    },
    {
      icon: 'thermometer-outline',
      title: labels.propertyDetail.features.centralHeating,
      subtitle: labels.propertyDetail.features.centralHeatingSub,
    },
  ];

  const handleContactAdvisor = () => {
    Alert.alert(
      labels.propertyDetail.contactAdvisorAlertTitle,
      labels.propertyDetail.contactAdvisorAlertMessage,
      [{ text: labels.common.understood }]
    );
  };

  const handleQuickQuestion = () => {
    if (!quickQuestion.trim()) return;
    Alert.alert(
      labels.propertyDetail.quickQuestionSentTitle,
      labels.propertyDetail.quickQuestionSentMessage(quickQuestion)
    );
    setQuickQuestion('');
  };

  const handleMicPress = () => {
    Alert.alert(
      labels.propertyDetail.micAlertTitle,
      labels.propertyDetail.micAlertMessage
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Header
        onBackPress={() => router.back()}
        onMenuPress={menu.open}
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
        {isPreview && (
          <View style={styles.previewBanner}>
            <Ionicons name="eye-outline" size={18} color={iconColorSecondary} />
            <Text style={styles.previewBannerText}>{labels.propertyDetail.previewBanner}</Text>
          </View>
        )}

        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.photoCountBadge}>
            <Ionicons name="images-outline" size={14} color={iconColor} style={styles.badgeIcon} />
            <Text style={styles.photoCountText}>{photoCountLabel}</Text>
          </View>
        </View>

        <View style={styles.priceLocationBlock}>
          <Text style={styles.priceText}>
            {price}
          </Text>

          <View style={styles.agencyBadge}>
            <Text style={styles.agencyBadgeText}>{labels.propertyDetail.noAgencyFees}</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={20}
              color={iconColorSecondary}
              style={styles.locationPin}
            />
            <View style={styles.locationTexts}>
              <Text style={styles.neighborhoodTitle}>
                {title}
              </Text>
              <Text style={styles.addressSubtitle}>
                {isRealDraft ? address : `${address}${labels.propertyDetail.groundLevelElevator}`}
              </Text>
              {params.agency_name && (
                <Text testID="listing-attribution" style={styles.addressSubtitle}>
                  {labels.auth.listedBy(params.agency_name, params.agent_name)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {!isRealDraft && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {labels.propertyDetail.accessibilitySectionTitle}
            </Text>

            <View style={styles.gridContainer}>
              {accessibilityFeatures.map((item, index) => (
                <View
                  key={index}
                  style={styles.featureCard}
                >
                  <View style={styles.featureIconBadge}>
                    <Ionicons name={item.icon} size={20} color={iconColorSecondary} />
                  </View>
                  <Text style={styles.featureTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.featureSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {labels.propertyDetail.descriptionSectionTitle}
          </Text>

          <View style={styles.descriptionBlock}>
            {(() => {
              const descriptionState = resolveDescriptionState(
                isRealDraft,
                legacyDescriptionLoading,
                Boolean(legacyDescription),
                legacyDescriptionError
              );

              const descriptionRenderers: Record<DescriptionState, React.ReactNode> = {
                real_draft: (
                  <Text style={styles.descriptionParagraph}>
                    {params.description}
                  </Text>
                ),
                loading: <ActivityIndicator color={primaryColor} />,
                ready: (
                  <Text style={styles.descriptionParagraph}>
                    {legacyDescription}
                  </Text>
                ),
                error: (
                  <Text style={styles.descriptionParagraphSecondary}>
                    {labels.propertyDetail.errorGeneratingDescription}
                  </Text>
                ),
                empty: <Text style={styles.descriptionParagraphSecondary} />,
              };

              return descriptionRenderers[descriptionState];
            })()}
          </View>
        </View>

        {!isRealDraft && (
          <View style={styles.sectionContainer}>
            <View style={styles.amenitiesCard}>
              <Text style={styles.amenitiesTitle}>
                {labels.propertyDetail.nearbyAmenitiesSectionTitle}
              </Text>

              <View style={styles.amenitiesList}>
                {nearbyAmenities.map((amenity, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.amenityRow,
                      idx < nearbyAmenities.length - 1 && styles.amenityBorder,
                    ]}
                  >
                    <View style={styles.amenityLeft}>
                      <Ionicons
                        name={amenity.icon}
                        size={20}
                        color={iconColorSecondary}
                        style={styles.amenityIcon}
                      />
                      <Text style={styles.amenityName}>
                        {amenity.title}
                      </Text>
                    </View>
                    <Text style={styles.amenityDistance}>
                      {amenity.distance}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactAdvisor}
          accessibilityRole="button"
          accessibilityLabel={labels.propertyDetail.contactAdvisorA11y}
        >
          <Ionicons
            name="headset-outline"
            size={22}
            color={iconColorOnPrimary}
            style={styles.contactIcon}
          />
          <Text style={styles.contactButtonText}>{labels.propertyDetail.contactAdvisor}</Text>
        </TouchableOpacity>

        {!isPreview && (
          <ChatInputBar
            value={quickQuestion}
            onChangeText={setQuickQuestion}
            onSend={handleQuickQuestion}
            onMicPress={handleMicPress}
            placeholder={labels.chat.inputPlaceholder}
            hasTopBorder={false}
            containerStyle={styles.detailInputContainer}
          />
        )}
      </View>
    </KeyboardAvoidingView>

    <BurgerMenu {...menu.menuProps} />
  </SafeAreaView>
);
}
