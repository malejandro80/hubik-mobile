import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { usePropertyLandlord } from '../hooks/usePropertyLandlord';
import { colors } from '../theme';
import { getPropertyLandlordSectionStyles } from './PropertyLandlordSection.styles';

export interface PropertyLandlordSectionProps {
  propertyId: string;
}

export const PropertyLandlordSection: React.FC<PropertyLandlordSectionProps> = ({ propertyId }) => {
  const { landlord, mayView } = usePropertyLandlord(propertyId);
  const { landlord: copy } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getPropertyLandlordSectionStyles(colors[colorScheme]), [colorScheme]);

  if (!mayView || !landlord) return null;

  return (
    <View style={styles.container} accessible>
      <Text style={styles.title}>{copy.sectionTitle}</Text>
      <Text style={styles.value}>{copy.shown(landlord.displayName ?? copy.unnamed, landlord.email)}</Text>
    </View>
  );
};
