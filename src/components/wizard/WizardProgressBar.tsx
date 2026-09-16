import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WizardStep } from '../../types/voiceWizard';
import { useColorScheme } from '../../hooks/useColorScheme';
import { colors, shapes, typography } from '../../theme/colors';

interface WizardProgressBarProps {
  currentStep: WizardStep;
}

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: '1. Dictado' },
  { step: 2, label: '2. Ubicación y Fotos' },
  { step: 3, label: '3. Validación' },
];

export const WizardProgressBar: React.FC<WizardProgressBarProps> = ({
  currentStep,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceContainer,
          borderColor: theme.outlineVariant,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${currentStep} de 3`}
    >
      {STEPS.map((item) => {
        const isActive = item.step === currentStep;
        const isPassed = item.step < currentStep;

        return (
          <View
            key={item.step}
            style={[
              styles.stepBadge,
              isActive && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
              isPassed && {
                backgroundColor: theme.secondaryContainer,
                borderColor: theme.secondary,
              },
            ]}
          >
            <Text
              style={[
                styles.stepText,
                { color: theme.textSecondary },
                isActive && { color: '#FFFFFF', fontWeight: '700' },
                isPassed && { color: theme.onSecondaryContainer, fontWeight: '700' },
              ]}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: shapes.full,
    borderWidth: 1,
    marginBottom: 20,
  },
  stepBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: shapes.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepText: {
    ...typography.bodyMD,
    fontSize: 13,
  },
});
