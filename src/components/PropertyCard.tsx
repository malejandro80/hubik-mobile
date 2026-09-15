import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return '#10B981'; // Emerald
      case 'Pending':
        return '#F59E0B'; // Amber
      case 'Sold':
        return '#EF4444'; // Rose
      default:
        return '#6B7280';
    }
  };

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

  const formattedPrice = `$${Number(property.price).toLocaleString()}`;
  const formattedArea = Number(property.square_meters).toLocaleString();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress && onPress(property)}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${formattedPrice}, en ${property.city}`}
    >
      {/* Property Cover Image */}
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
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(property.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(property.status)}</Text>
        </View>

        {/* Property Type Pill - Architectural Serene Hearth Badge */}
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: theme.badgeBackground,
              borderColor: theme.badgeBorder,
            },
          ]}
        >
          <Text style={[styles.typeText, { color: theme.text }]}>
            {getTypeLabel(property.property_type)}
          </Text>
        </View>
      </View>

      {/* Property Details */}
      <View style={styles.content}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.primary }]}>
            {formattedPrice}
          </Text>
        </View>

        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
        >
          {property.title}
        </Text>

        <Text
          style={[styles.address, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          📍 {property.address}, {property.city}
        </Text>

        {/* Specs Row */}
        <View style={[styles.specsRow, { borderTopColor: theme.border }]}>
          <View style={styles.specItem}>
            <Text style={styles.specIcon}>🛏️</Text>
            <Text
              style={[
                styles.specText,
                { color: theme.textSecondary },
              ]}
            >
              {property.bedrooms === 0
                ? 'Estudio'
                : property.bedrooms === 1
                ? '1 hab.'
                : `${property.bedrooms} hab.`}
            </Text>
          </View>

          <View style={[styles.specDivider, { backgroundColor: theme.border }]} />

          <View style={styles.specItem}>
            <Text style={styles.specIcon}>🚿</Text>
            <Text
              style={[
                styles.specText,
                { color: theme.textSecondary },
              ]}
            >
              {property.bathrooms === 1
                ? '1 baño'
                : `${property.bathrooms} baños`}
            </Text>
          </View>

          <View style={[styles.specDivider, { backgroundColor: theme.border }]} />

          <View style={styles.specItem}>
            <Text style={styles.specIcon}>📐</Text>
            <Text
              style={[
                styles.specText,
                { color: theme.textSecondary },
              ]}
              accessibilityLabel={`${property.square_meters} metros cuadrados`}
            >
              {formattedArea} m²
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

PropertyCard.displayName = 'PropertyCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: shapes.xl, // 24px
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#1A3A34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shapes.default, // 8px
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shapes.default, // 8px
    borderWidth: 1.5,
  },
  typeText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  content: {
    padding: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    ...typography.headlineMD,
    fontSize: 20,
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1.5,
    minHeight: 48,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  specIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  specText: {
    fontSize: 14,
    fontWeight: '500',
  },
  specDivider: {
    width: 1.5,
    height: 16,
    marginRight: 12,
  },
});
