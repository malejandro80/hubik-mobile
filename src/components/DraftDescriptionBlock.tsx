import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme';
import { getDraftPanelStyles } from './DraftPanel.styles';

export interface DraftDescriptionBlockProps {
  description?: string;
  ready: boolean;
  describing: boolean;
  failed: boolean;
  onRequest: () => void;
}

export const DraftDescriptionBlock: React.FC<DraftDescriptionBlockProps> = ({
  description,
  ready,
  describing,
  failed,
  onRequest,
}) => {
  const { composer } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getDraftPanelStyles(colors[colorScheme]), [colorScheme]);

  const renderAction = (label: string) => (
    <TouchableOpacity
      style={styles.pillButton}
      onPress={onRequest}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.pillText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderBody = () => {
    if (describing) return <Text style={styles.mutedText}>{composer.descriptionWorking}</Text>;
    if (failed) {
      return (
        <>
          <Text style={styles.errorText}>{composer.descriptionFailed}</Text>
          {renderAction(composer.descriptionRetry)}
        </>
      );
    }
    if (description) {
      return (
        <>
          <Text style={styles.descriptionText}>{description}</Text>
          {renderAction(composer.descriptionRegenerate)}
        </>
      );
    }
    if (ready) return renderAction(composer.descriptionGenerate);
    return <Text style={styles.mutedText}>{composer.descriptionPending}</Text>;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{composer.descriptionTitle}</Text>
      {renderBody()}
    </View>
  );
};
