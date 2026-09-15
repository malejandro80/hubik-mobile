import React, { useState } from 'react';
import {
  Image,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Property } from '../types/property';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, shapes, typography } from '../theme/colors';

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
  const [isSaved, setIsSaved] = useState(false);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Available':
        return 'Disponible';
      case 'Pending':
        return 'Pendiente';
      case 'Sold':
        return 'Vendido';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Apartment':
        return 'Apartamento';
      case 'Single Family':
        return 'Casa Familiar';
      case 'Townhouse':
        return 'Casa Adosada';
      case 'Condo':
        return 'Condominio';
      case 'Studio':
        return 'Estudio';
      default:
        return type;
    }
  };

  const formattedPrice = `$${Number(property.price).toLocaleString('en-US')}`;
  const formattedArea = Number(property.square_meters).toLocaleString('en-US');
  const pricePerMeter = `$${Math.round(
    property.price / (property.square_meters || 1)
  ).toLocaleString('en-US')} €/m²`;
  const commission = `$${Math.round(property.price * 0.03).toLocaleString(
    'en-US'
  )} €`;

  const handleShare = async () => {
    try {
      await Share.share({
        title: property.title,
        message: `Mira esta propiedad en Hubik: ${property.title} por ${formattedPrice} en ${property.city}.\nDirección: ${property.address}`,
      });
    } catch {
      // User dismissed share dialog
    }
  };

  const handleToggleSave = () => {
    setIsSaved((prev) => !prev);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {/* Property Cover Image & Badges */}
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

        {/* Top Overlaid Badges */}
        <View style={styles.topBadgesRow}>
          {/* Exclusiva / Status Badge */}
          <View style={styles.exclusiveBadge}>
            <Text style={styles.exclusiveDot}>● </Text>
            <Text style={styles.exclusiveText}>
              {getStatusLabel(property.status)}
            </Text>
            <Text style={styles.exclusivePercent}> · 3%</Text>
          </View>

          {/* Key / Type Badge */}
          <View style={styles.glassBadge}>
            <Ionicons
              name="key-outline"
              size={13}
              color="#191C1B"
              style={styles.keyIcon}
            />
            <Text style={styles.glassBadgeText}>Llaves en oficina · </Text>
            <Text style={styles.glassBadgeText}>
              {getTypeLabel(property.property_type)}
            </Text>
          </View>
        </View>

        {/* Bottom Right Photo Count Badge */}
        <View style={styles.photoCountBadge}>
          <Ionicons
            name="camera-outline"
            size={13}
            color="#191C1B"
            style={styles.cameraIcon}
          />
          <Text style={styles.photoCountText}>
            {property.images && property.images.length > 1
              ? `${property.images.length} fotos`
              : '14 fotos'}
          </Text>
        </View>
      </View>

      {/* Property Content Area */}
      <View style={styles.content}>
        {/* Title & Bookmark Row */}
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={2}
          >
            {property.title}
          </Text>
          <TouchableOpacity
            onPress={handleToggleSave}
            accessibilityRole="button"
            accessibilityLabel={
              isSaved ? 'Quitar de guardados' : 'Guardar propiedad'
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.bookmarkButton}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? theme.secondary : theme.text}
            />
          </TouchableOpacity>
        </View>

        {/* Address / Location Line */}
        <Text
          style={[styles.address, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {property.address} · {property.city} · Exterior con ascensor
        </Text>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          <Text
            style={[styles.specText, { color: theme.textSecondary }]}
            accessibilityLabel={`${property.square_meters} metros cuadrados`}
          >
            {formattedArea} m²
          </Text>
          <Text style={[styles.specDot, { color: theme.textSecondary }]}>
            {' '}·{' '}
          </Text>
          <Text style={[styles.specText, { color: theme.textSecondary }]}>
            {property.bedrooms === 0 ? 'Estudio' : `${property.bedrooms} hab.`}
          </Text>
          <Text style={[styles.specDot, { color: theme.textSecondary }]}>
            {' '}·{' '}
          </Text>
          <Text style={[styles.specText, { color: theme.textSecondary }]}>
            {property.bathrooms === 1 ? '1 baño' : `${property.bathrooms} baños`}
          </Text>
          <Text style={[styles.specDot, { color: theme.textSecondary }]}>
            {' '}·{' '}
          </Text>
          <Text style={[styles.specHighlight, { color: theme.secondary }]}>
            Cota cero
          </Text>
        </View>

        {/* Financial Block (Price + Commission) */}
        <View style={styles.financialRow}>
          <View style={styles.priceCol}>
            <Text style={[styles.price, { color: theme.primary }]}>
              {formattedPrice}
            </Text>
            <Text
              style={[styles.pricePerMeter, { color: theme.textSecondary }]}
            >
              {pricePerMeter}
            </Text>
          </View>

          <View style={styles.commissionCol}>
            <Text style={[styles.commissionLabel, { color: theme.secondary }]}>
              Tu comisión:
            </Text>
            <Text style={[styles.commissionAmount, { color: theme.secondary }]}>
              {commission}
            </Text>
            <Text
              style={[
                styles.commissionCaption,
                { color: theme.textSecondary },
              ]}
            >
              Captación propia
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: '#163931' }]}
            onPress={() => onPress && onPress(property)}
            accessibilityRole="button"
            accessibilityLabel={`Ver detalle de ${property.title}`}
          >
            <Ionicons
              name="eye-outline"
              size={18}
              color="#FFFFFF"
              style={styles.actionBtnIcon}
            />
            <Text style={styles.primaryActionText}>Ver detalle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryAction,
              {
                backgroundColor: theme.surfaceContainerLow,
                borderColor: theme.outlineVariant,
              },
            ]}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={`Compartir ${property.title}`}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={theme.text}
              style={styles.actionBtnIcon}
            />
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

PropertyCard.displayName = 'PropertyCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: shapes.xl, // 24px
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 22,
    shadowColor: '#1A3A34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 210,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14352D', // Deep forest pine
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shapes.full,
    marginRight: 8,
  },
  exclusiveDot: {
    color: '#52D1A8', // Mint green indicator
    fontSize: 10,
  },
  exclusiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  exclusivePercent: {
    color: '#E1E3E1',
    fontWeight: '600',
    fontSize: 12,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shapes.full,
  },
  keyIcon: {
    marginRight: 4,
  },
  glassBadgeText: {
    color: '#191C1B',
    fontWeight: '600',
    fontSize: 12,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shapes.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cameraIcon: {
    marginRight: 4,
  },
  photoCountText: {
    color: '#191C1B',
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
    marginRight: 10,
  },
  bookmarkButton: {
    padding: 2,
  },
  address: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 10,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  specText: {
    fontSize: 14,
    fontWeight: '500',
  },
  specDot: {
    fontSize: 14,
    fontWeight: '700',
  },
  specHighlight: {
    fontSize: 14,
    fontWeight: '700',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    marginBottom: 18,
  },
  priceCol: {
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  pricePerMeter: {
    fontSize: 14,
    fontWeight: '500',
  },
  commissionCol: {
    alignItems: 'flex-end',
  },
  commissionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  commissionCaption: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: shapes.md, // 12px
    marginRight: 10,
  },
  actionBtnIcon: {
    marginRight: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    ...typography.labelMD,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: shapes.md, // 12px
    borderWidth: 1,
  },
  secondaryActionText: {
    ...typography.labelMD,
    fontSize: 15,
    fontWeight: '600',
  },
});
