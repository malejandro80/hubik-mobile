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
import { colors } from '../theme/colors';

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

  const formattedPrice = `$${Number(property.price).toLocaleString()}`;
  const formattedSqFt = Number(property.square_feet).toLocaleString();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress && onPress(property)}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${formattedPrice}, in ${property.city}`}
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
          <Text style={styles.statusText}>{property.status}</Text>
        </View>

        {/* Property Type Pill */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{property.property_type}</Text>
        </View>
      </View>

      {/* Property Details */}
      <View style={styles.content}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.text }]}>
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
          style={[styles.address, { color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280' }]}
          numberOfLines={1}
        >
          📍 {property.address}, {property.city}
        </Text>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          <View style={styles.specItem}>
            <Text style={styles.specIcon}>🛏️</Text>
            <Text
              style={[
                styles.specText,
                { color: colorScheme === 'dark' ? '#D1D5DB' : '#4B5563' },
              ]}
            >
              {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Beds`}
            </Text>
          </View>

          <View style={styles.specDivider} />

          <View style={styles.specItem}>
            <Text style={styles.specIcon}>🚿</Text>
            <Text
              style={[
                styles.specText,
                { color: colorScheme === 'dark' ? '#D1D5DB' : '#4B5563' },
              ]}
            >
              {property.bathrooms} Baths
            </Text>
          </View>

          <View style={styles.specDivider} />

          <View style={styles.specItem}>
            <Text style={styles.specIcon}>📐</Text>
            <Text
              style={[
                styles.specText,
                { color: colorScheme === 'dark' ? '#D1D5DB' : '#4B5563' },
              ]}
            >
              {formattedSqFt} sqft
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    padding: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    marginBottom: 12,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.2)',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  specIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  specText: {
    fontSize: 13,
    fontWeight: '500',
  },
  specDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(156, 163, 175, 0.4)',
    marginRight: 10,
  },
});
