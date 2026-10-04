import React, { useMemo } from 'react';
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
import { Header } from '../../components/Header';
import { ListingTags } from '../../components/ListingTags';
import { PhotoGallery } from '../../components/PhotoGallery';
import { PropertyAgentCard } from '../../components/PropertyAgentCard';
import { PropertyAskPanel } from '../../components/PropertyAskPanel';
import { PropertyLandlordSection } from '../../components/PropertyLandlordSection';
import { PropertyDescriptionSection } from '../../components/PropertyDescriptionSection';
import { PropertyMapPreview } from '../../components/PropertyMapPreview';
import { PropertyStatsBar } from '../../components/PropertyStatsBar';
import { PREVIEW_PARAM_VALUE, SHARED_LISTING_PARAM_VALUE } from '../../constants/listingPreview';
import { useAppMenu } from '../../hooks/useAppMenu';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useLabels } from '../../hooks/useLabels';
import { useAuth } from '../../hooks/useAuth';
import { canContactAgents, normalizeWhatsApp, whatsAppUrl } from '../../lib/whatsapp';
import { useLegacyDescription } from '../../hooks/useLegacyDescription';
import { useListingAttribution } from '../../hooks/useListingAttribution';
import { useListingPublishedAt } from '../../hooks/useListingPublishedAt';
import { usePhotoGallery } from '../../hooks/usePhotoGallery';
import { resolveAskTarget } from '../../lib/askTarget';
import {
  formatPrice,
  parsePropertyAmenities,
  parsePropertyImages,
  PropertyDetailRouteParams,
  resolvePhotoCountLabel,
} from '../../lib/propertyDetail';
import { colors } from '../../theme';
import { PropertyType } from '../../types/property';
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
  const isPreview = params.preview === PREVIEW_PARAM_VALUE;
  const isSharedLink = params.shared === SHARED_LISTING_PARAM_VALUE;
  const askTarget = useMemo(
    () => resolveAskTarget({ id: params.id, preview: params.preview, shared: params.shared }),
    [params.id, params.preview, params.shared]
  );
  const publishedAt = useListingPublishedAt(askTarget?.kind === 'listing' ? askTarget.id : null, params.created_at);
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

            <ListingTags
              price={params.price}
              squareMeters={squareMeters}
              currency={params.currency}
              operationType={params.operation_type}
              publishedAt={publishedAt}
            />

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

          {!isPreview && !isSharedLink && params.id ? <PropertyLandlordSection propertyId={params.id} /> : null}

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

          {!isPreview && <PropertyAskPanel target={askTarget} />}
        </View>
      </KeyboardAvoidingView>

      <BurgerMenu {...menu.menuProps} />
    </SafeAreaView>
  );
}
