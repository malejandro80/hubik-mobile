import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { buildReadOnlyMapHtml } from '../lib/mapPicker';
import { colors } from '../theme/colors';
import { getPropertyMapPreviewStyles } from './PropertyMapPreview.styles';

export interface PropertyMapPreviewProps {
  latitude?: number;
  longitude?: number;
  isApproximate?: boolean;
}

export const PropertyMapPreview: React.FC<PropertyMapPreviewProps> = ({
  latitude,
  longitude,
  isApproximate = false,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const { propertyDetail } = useLabels();
  const styles = useMemo(() => getPropertyMapPreviewStyles(theme), [theme]);

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  const mapHtml = buildReadOnlyMapHtml(latitude, longitude, isApproximate);

  return (
    <View
      testID="property-map-preview"
      style={styles.container}
      pointerEvents="none"
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={isApproximate ? propertyDetail.approximateLocation : undefined}
    >
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
      />
      {isApproximate && (
        <View style={styles.badge}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <Text style={styles.badgeText}>{propertyDetail.approximateLocation}</Text>
        </View>
      )}
    </View>
  );
};
