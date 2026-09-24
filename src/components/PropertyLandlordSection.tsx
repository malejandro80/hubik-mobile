import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { fetchPropertyLandlord } from '../services/authApi';
import { colors } from '../theme';
import { PropertyLandlord } from '../types/auth';
import { getPropertyLandlordSectionStyles } from './PropertyLandlordSection.styles';

export interface PropertyLandlordSectionProps {
  propertyId: string;
}

export const PropertyLandlordSection: React.FC<PropertyLandlordSectionProps> = ({ propertyId }) => {
  const { profile } = useAuth();
  const { landlord: copy } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getPropertyLandlordSectionStyles(colors[colorScheme]), [colorScheme]);
  const [landlord, setLandlord] = useState<PropertyLandlord | null>(null);
  const mayView = profile?.role === 'agent' || profile?.role === 'owner';

  useEffect(() => {
    if (!mayView) return;
    let active = true;
    fetchPropertyLandlord(propertyId)
      .then((result) => {
        if (active) setLandlord(result);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mayView, propertyId]);

  if (!mayView || !landlord) return null;

  return (
    <View style={styles.container} accessible>
      <Text style={styles.title}>{copy.sectionTitle}</Text>
      <Text style={styles.value}>{copy.shown(landlord.displayName ?? copy.unnamed, landlord.email)}</Text>
    </View>
  );
};
