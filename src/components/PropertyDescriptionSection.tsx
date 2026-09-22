import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { DescriptionState, resolveDescriptionState } from '../lib/propertyDetail';
import { colors } from '../theme/colors';
import { getPropertyDescriptionSectionStyles } from './PropertyDescriptionSection.styles';

export interface PropertyDescriptionSectionProps {
  isRealDraft: boolean;
  draftDescription?: string;
  legacyDescription: string | null;
  loading: boolean;
  hasError: boolean;
}

export const PropertyDescriptionSection: React.FC<PropertyDescriptionSectionProps> = ({
  isRealDraft,
  draftDescription,
  legacyDescription,
  loading,
  hasError,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const { propertyDetail } = useLabels();
  const styles = useMemo(() => getPropertyDescriptionSectionStyles(theme), [theme]);

  const state = resolveDescriptionState(
    isRealDraft,
    loading,
    Boolean(legacyDescription),
    hasError
  );

  const renderers: Record<DescriptionState, React.ReactNode> = {
    real_draft: <Text style={styles.paragraph}>{draftDescription}</Text>,
    loading: <ActivityIndicator color={theme.primary} />,
    ready: <Text style={styles.paragraph}>{legacyDescription}</Text>,
    error: (
      <Text style={styles.paragraphSecondary}>
        {propertyDetail.errorGeneratingDescription}
      </Text>
    ),
    empty: <Text style={styles.paragraphSecondary} />,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{propertyDetail.descriptionSectionTitle}</Text>
      <View style={styles.block}>{renderers[state]}</View>
    </View>
  );
};
