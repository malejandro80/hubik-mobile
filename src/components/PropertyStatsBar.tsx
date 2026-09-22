import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { getStatsForType } from '../lib/propertyStats';
import { colors } from '../theme/colors';
import { PropertyType } from '../types/property';
import { getPropertyStatsBarStyles } from './PropertyStatsBar.styles';

export interface PropertyStatsBarProps {
  propertyType?: PropertyType;
  bedrooms?: string | number;
  bathrooms?: string | number;
  squareMeters?: string | number;
}

export const PropertyStatsBar: React.FC<PropertyStatsBarProps> = ({
  propertyType,
  bedrooms,
  bathrooms,
  squareMeters,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getPropertyStatsBarStyles(theme), [theme]);

  const stats = useMemo(() => getStatsForType(propertyType), [propertyType]);

  const valueMap: Record<string, string | number> = {
    bedrooms: bedrooms ?? '—',
    bathrooms: bathrooms ?? '—',
    square_meters: squareMeters ?? '—',
  };

  return (
    <View testID="property-stats-bar" style={styles.container}>
      {stats.map((field) => {
        const value = valueMap[field.key];
        const formattedLabel = field.label(value);

        return (
          <View
            key={field.key}
            style={styles.chip}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={formattedLabel}
          >
            <Ionicons name={field.icon} size={16} color={theme.textSecondary} />
            <Text style={styles.label}>{formattedLabel}</Text>
          </View>
        );
      })}
    </View>
  );
};
