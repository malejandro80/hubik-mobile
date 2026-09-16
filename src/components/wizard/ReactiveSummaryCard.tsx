import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ExtractedPropertyData } from '../../types/voiceWizard';
import { useColorScheme } from '../../hooks/useColorScheme';
import { colors, shapes, spacing, typography } from '../../theme/colors';

interface ReactiveSummaryCardProps {
  data: ExtractedPropertyData;
}

export const ReactiveSummaryCard: React.FC<ReactiveSummaryCardProps> = ({ data }) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const hasData = Boolean(
    data.property_type || data.neighborhood || data.price || data.bedrooms
  );

  if (!hasData) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceContainer,
          borderColor: theme.outlineVariant,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Resumen visual reactivo de la vivienda"
    >
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={18} color={theme.secondary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Datos Extraídos por Voz
        </Text>
      </View>

      <View style={styles.chipsRow}>
        {data.property_type && (
          <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="home-outline" size={16} color={theme.primary} />
            <Text style={[styles.chipText, { color: theme.text }]}>
              {data.property_type}
              {data.neighborhood ? ` · ${data.neighborhood}` : ''}
            </Text>
          </View>
        )}

        {data.price && (
          <View style={[styles.chip, { backgroundColor: '#E3EFEA', borderColor: theme.secondary }]}>
            <Ionicons name="pricetag-outline" size={16} color={theme.primary} />
            <Text style={[styles.chipText, { color: theme.primary, fontWeight: '700' }]}>
              {data.price.toLocaleString('es-ES')} €
            </Text>
          </View>
        )}

        {data.bedrooms && (
          <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="bed-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.chipText, { color: theme.text }]}>
              {data.bedrooms} hab.
            </Text>
          </View>
        )}

        {data.has_elevator && (
          <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.chipText, { color: theme.text }]}>
              Ascensor{data.elevator_cota_cero ? ' (Cota cero)' : ''}
            </Text>
          </View>
        )}

        {data.parking_included !== undefined && (
          <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="car-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.chipText, { color: theme.text }]}>
              {data.parking_included ? 'Garaje incluido' : 'Sin garaje'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: shapes.lg,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...typography.bodyMD,
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: shapes.md,
    borderWidth: 1,
    gap: 6,
    minHeight: spacing.touchMin,
  },
  chipText: {
    ...typography.bodyMD,
    fontSize: 15,
  },
});
