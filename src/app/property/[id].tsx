import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { PhotoGallery } from '../../components/PhotoGallery';
import { PropertyAgentCard } from '../../components/PropertyAgentCard';
import { PropertyLandlordSection } from '../../components/PropertyLandlordSection';
import { PropertyDescriptionSection } from '../../components/PropertyDescriptionSection';
import { PropertyMapPreview } from '../../components/PropertyMapPreview';
import { PropertyStatsBar } from '../../components/PropertyStatsBar';
import { PREVIEW_PARAM_VALUE } from '../../constants/listingPreview';
import { useAppMenu } from '../../hooks/useAppMenu';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useLabels } from '../../hooks/useLabels';
import { useVoiceNote } from '../../hooks/useVoiceNote';
import { useAuth } from '../../hooks/useAuth';
import { canContactAgents, normalizeWhatsApp, whatsAppUrl } from '../../lib/whatsapp';
import { useLegacyDescription } from '../../hooks/useLegacyDescription';
import { useListingAttribution } from '../../hooks/useListingAttribution';
import { usePhotoGallery } from '../../hooks/usePhotoGallery';
import {
  formatPrice,
  parsePropertyAmenities,
  parsePropertyImages,
  PropertyDetailRouteParams,
  resolvePhotoCountLabel,
} from '../../lib/propertyDetail';
import { colors } from '../../theme';
import { PROPERTY_TYPE_LABEL_ES, PropertyType } from '../../types/property';
import { getPropertyDetailStyles } from './[id].styles';

export default function PropertyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<PropertyDetailRouteParams>();
  const { profile } = useAuth();

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const { styles, iconColor, iconColorSecondary, iconColorOnPrimary } = useMemo(
    () => getPropertyDetailStyles(theme),
    [theme]
  );
  const menu = useAppMenu();
  const { galleryVisible, openGallery, closeGallery } = usePhotoGallery();
  const [quickQuestion, setQuickQuestion] = useState('');

  const city = params.city || 'Madrid';
  const title = params.title || `Barrio de Salamanca, ${city}`;
  const price = useMemo(
    () => formatPrice(params.price, params.currency, params.operation_type),
    [params.price, params.currency, params.operation_type]
  );
  const bedrooms = params.bedrooms || '3';
  const bathrooms = params.bathrooms || '2';
  const squareMeters = params.square_meters || '120';
  const realImages = useMemo(() => parsePropertyImages(params.images), [params.images]);
  const realAmenities = useMemo(() => parsePropertyAmenities(params.amenities), [params.amenities]);
  const propertyTypeLabel = params.property_type
    ? PROPERTY_TYPE_LABEL_ES[params.property_type as PropertyType]
    : undefined;
  const operationLabel =
    params.operation_type === 'rent'
      ? labels.propertyDetail.operationRent
      : params.operation_type === 'sale'
        ? labels.propertyDetail.operationSale
        : undefined;
  const isPreview = params.preview === PREVIEW_PARAM_VALUE;
  const isAddressMasked = isPreview || !params.address;
  const address = isAddressMasked ? labels.propertyDetail.approximateLocation : params.address;
  const attribution = useListingAttribution(isPreview, params.agency_name, params.agent_name);
  const isRealDraft = isPreview || Boolean(params.description);
  const imageUrl =
    realImages[0] ||
    params.image_url ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';
  const photoCountLabel = useMemo(
    () => resolvePhotoCountLabel(isRealDraft, realImages.length, labels),
    [isRealDraft, realImages.length, labels]
  );

  const latitude = params.lat ? parseFloat(params.lat) : undefined;
  const longitude = params.lng ? parseFloat(params.lng) : undefined;

  const { description: legacyDescription, loading: legacyDescriptionLoading, hasError: legacyDescriptionError } =
    useLegacyDescription({
      title,
      price: params.price,
      bedrooms,
      bathrooms,
      squareMeters,
      city,
      address: isAddressMasked ? undefined : params.address,
      amenities: realAmenities,
      isRealDraft,
    });

  const heroContent = (
    <>
      <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
      <View style={styles.photoCountBadge}>
        <Ionicons name="images-outline" size={14} color={iconColor} style={styles.badgeIcon} />
        <Text style={styles.photoCountText}>{photoCountLabel}</Text>
      </View>
    </>
  );

  const contactPhone = params.whatsapp ? normalizeWhatsApp(params.whatsapp) : null;
  const showContact = contactPhone !== null && canContactAgents(profile);

  const handleContactAdvisor = () => {
    if (!contactPhone) return;
    Linking.openURL(whatsAppUrl(contactPhone, labels.propertyDetail.whatsappMessage(title))).catch(() => {
      Alert.alert(
        labels.propertyDetail.whatsappUnavailableTitle,
        labels.propertyDetail.whatsappUnavailableMessage,
        [{ text: labels.common.understood }]
      );
    });
  };

  const askInChat = useCallback(
    (question: string) => {
      router.navigate({
        pathname: '/',
        params: { ask: labels.propertyDetail.askAbout(question, title), askAt: String(Date.now()) },
      });
    },
    [router, labels, title]
  );
  const voice = useVoiceNote(askInChat);

  const handleQuickQuestion = (text?: string) => {
    const question = (text ?? quickQuestion).trim();
    if (!question) return;
    setQuickQuestion('');
    askInChat(question);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <Header onBackPress={() => router.back()} onMenuPress={menu.open} />

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

          {realImages.length > 0 ? (
            <TouchableOpacity
              style={styles.imageWrapper}
              onPress={openGallery}
              accessibilityRole="button"
              accessibilityLabel={labels.gallery.openA11y(realImages.length)}
            >
              {heroContent}
            </TouchableOpacity>
          ) : (
            <View style={styles.imageWrapper}>{heroContent}</View>
          )}
          <PhotoGallery visible={galleryVisible} images={realImages} onClose={closeGallery} />

          <View style={styles.priceLocationBlock}>
            <Text style={styles.priceText}>{price}</Text>

            <View style={styles.badgeRow}>

              {propertyTypeLabel && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{propertyTypeLabel}</Text>
                </View>
              )}
              {operationLabel && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{operationLabel}</Text>
                </View>
              )}
            </View>

            <PropertyStatsBar
              propertyType={params.property_type as PropertyType | undefined}
              bedrooms={bedrooms}
              bathrooms={bathrooms}
              squareMeters={squareMeters}
            />

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={20}
                color={iconColorSecondary}
                style={styles.locationPin}
              />
              <View style={styles.locationTexts}>
                <Text style={styles.neighborhoodTitle}>{title}</Text>
                <Text style={styles.addressSubtitle}>{address}</Text>
              </View>
            </View>

            <PropertyMapPreview
              latitude={latitude}
              longitude={longitude}
              isApproximate={isAddressMasked}
            />
          </View>

          <PropertyDescriptionSection
            isRealDraft={isRealDraft}
            draftDescription={params.description}
            legacyDescription={legacyDescription}
            loading={legacyDescriptionLoading}
            hasError={legacyDescriptionError}
          />

          {realAmenities.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {labels.propertyDetail.featuresSectionTitle}
              </Text>

              <View style={styles.featuresChipsRow}>
                {realAmenities.map((amenity) => (
                  <View key={amenity} style={styles.featureChip}>
                    <Text style={styles.featureChipText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!isPreview && params.id ? <PropertyLandlordSection propertyId={params.id} /> : null}

          <PropertyAgentCard
            agencyName={attribution.agencyName}
            agentName={attribution.agentName}
          />

          <View style={{ height: 140 }} />
        </ScrollView>

        <View style={styles.bottomDock}>
          {showContact && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactAdvisor}
              accessibilityRole="button"
              accessibilityLabel={labels.propertyDetail.contactWhatsAppA11y}
            >
              <Ionicons
                name="logo-whatsapp"
                size={22}
                color={iconColorOnPrimary}
                style={styles.contactIcon}
              />
              <Text style={styles.contactButtonText}>{labels.propertyDetail.contactWhatsApp}</Text>
            </TouchableOpacity>
          )}

          {!isPreview && (
            <ChatInputBar
              value={quickQuestion}
              onChangeText={setQuickQuestion}
              onSend={handleQuickQuestion}
              onMicPress={() => void voice.onMicPress()}
              isRecording={voice.isRecording}
              loading={voice.busy}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <BurgerMenu {...menu.menuProps} />
    </SafeAreaView>
  );
}
