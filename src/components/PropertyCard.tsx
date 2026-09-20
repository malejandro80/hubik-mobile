import React, { useMemo } from 'react';
import {
  Image,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PROPERTY_TYPE_LABEL_ES, Property } from '../types/property';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme/colors';
import { getPropertyCardStyles } from './PropertyCard.styles';

interface PropertyCardProps {
  property: Property;
  onPress?: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = React.memo(({
  property,
  onPress,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const { styles, iconColorText, iconColorPrimaryText } = useMemo(
    () => getPropertyCardStyles(theme),
    [theme]
  );

  const statusLabels: Record<string, string> = useMemo(
    () => ({
      Available: labels.propertyCard.status.available,
      Pending: labels.propertyCard.status.pending,
      Sold: labels.propertyCard.status.sold,
    }),
    [labels]
  );

  const statusLabel = statusLabels[property.status] ?? property.status;

  const formattedPrice = `$${Number(property.price).toLocaleString('en-US')}`;
  const formattedArea = Number(property.square_meters).toLocaleString('en-US');

  const handleShare = async () => {
    try {
      await Share.share({
        title: property.title,
        message: labels.propertyCard.shareMessage(
          property.title,
          formattedPrice,
          property.city,
          property.address
        ),
      });
    } catch {
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              property.image_url ||
              'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80',
          }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.topBadgesRow}>
          <View style={styles.exclusiveBadge}>
            <Text style={styles.exclusiveDot}>● </Text>
            <Text style={styles.exclusiveText}>
              {statusLabel}
            </Text>
            <Text style={styles.exclusivePercent}>{labels.propertyCard.commission}</Text>
          </View>
        </View>

        <View style={styles.photoCountBadge}>
          <Ionicons
            name="camera-outline"
            size={13}
            color={iconColorText}
            style={styles.cameraIcon}
          />
          <Text style={styles.photoCountText}>
            {property.images && property.images.length > 1
              ? labels.propertyCard.photosCount(property.images.length)
              : labels.propertyCard.defaultPhotosCount}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {property.title}
          </Text>
        </View>

        <Text
          style={styles.address}
          numberOfLines={1}
        >
          {property.address} · {property.city}{labels.propertyCard.exteriorElevator}
        </Text>

        <View style={styles.specsRow}>
          <Text
            style={styles.specText}
            accessibilityLabel={labels.propertyCard.sqmLabel(property.square_meters)}
          >
            {formattedArea} {labels.propertyCard.sqmSuffix}
          </Text>
          <Text style={styles.specDot}>
            {' '}·{' '}
          </Text>
          <Text style={styles.specText}>
            {property.bedrooms === 0 ? labels.propertyCard.studio : labels.propertyCard.bedroomShort(property.bedrooms)}
          </Text>
          <Text style={styles.specDot}>
            {' '}·{' '}
          </Text>
          <Text style={styles.specText}>
            {labels.propertyCard.bathrooms(property.bathrooms)}
          </Text>
          <Text style={styles.specDot}>
            {' '}·{' '}
          </Text>
          <Text style={styles.specText}>
            {PROPERTY_TYPE_LABEL_ES[property.property_type] || property.property_type}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <View style={styles.priceCol}>
            <Text style={styles.price}>
              {formattedPrice}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => onPress && onPress(property)}
            accessibilityRole="button"
            accessibilityLabel={labels.propertyCard.viewDetailsA11y(property.title)}
          >
            <Ionicons
              name="eye-outline"
              size={18}
              color={iconColorPrimaryText}
              style={styles.actionBtnIcon}
            />
            <Text style={styles.primaryActionText}>{labels.propertyCard.viewDetails}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={labels.propertyCard.shareA11y(property.title)}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={iconColorText}
              style={styles.actionBtnIcon}
            />
            <Text style={styles.secondaryActionText}>
              {labels.propertyCard.share}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

PropertyCard.displayName = 'PropertyCard';
