import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import {
  PROPERTY_DRAFT_FIELD_LABELS,
  PROPERTY_TYPE_LABEL_ES,
  PropertyDraft,
  REQUIRED_PROPERTY_DRAFT_FIELDS,
} from '../types/property';
import { colors } from '../theme/colors';
import { styles } from './LivingDraftCard.styles';

export interface LivingDraftCardProps {
  draft: PropertyDraft;
  missingFields: (keyof PropertyDraft)[];
  /** Enum fields (property_type/operation_type): sends the picked option straight through the
   *  same chat pipeline as if the user had typed/said it. */
  onQuickAnswer: (text: string) => void;
  /** Free-value fields: hints the input with what's needed next instead of guessing a value. */
  onSelectField: (fieldLabel: string) => void;
}

// REQUIRED_PROPERTY_DRAFT_FIELDS/missingFields are typed as the broader keyof PropertyDraft
// (shared with fields like images/description that have no label), even though at runtime they
// only ever hold the 9 labeled required fields - same narrowing cast already used in chatApi.ts.
type LabeledField = keyof typeof PROPERTY_DRAFT_FIELD_LABELS;

const PROPERTY_TYPE_OPTIONS = ['Piso', 'Casa', 'Casa adosada', 'Estudio', 'Condominio'];
const OPERATION_TYPE_OPTIONS = ['Venta', 'Alquiler'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatKnownValue(field: keyof PropertyDraft, draft: PropertyDraft): string {
  switch (field) {
    case 'property_type':
      return draft.property_type ? PROPERTY_TYPE_LABEL_ES[draft.property_type] : '';
    case 'operation_type':
      return draft.operation_type === 'rent' ? 'Alquiler' : 'Venta';
    case 'price':
      return draft.price !== undefined ? `${draft.price.toLocaleString('es-ES')} €` : '';
    case 'bedrooms':
      return draft.bedrooms !== undefined ? `${draft.bedrooms} hab.` : '';
    case 'bathrooms':
      return draft.bathrooms !== undefined ? `${draft.bathrooms} baños` : '';
    case 'square_meters':
      return draft.square_meters !== undefined ? `${draft.square_meters} m²` : '';
    default:
      return String(draft[field] ?? '');
  }
}

export const LivingDraftCard: React.FC<LivingDraftCardProps> = ({
  draft,
  missingFields,
  onQuickAnswer,
  onSelectField,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const [expandedField, setExpandedField] = useState<keyof PropertyDraft | null>(null);

  const knownFields = REQUIRED_PROPERTY_DRAFT_FIELDS.filter((field) => !missingFields.includes(field));

  const handleChipPress = (field: keyof PropertyDraft) => {
    if (field === 'property_type' || field === 'operation_type') {
      setExpandedField((current) => (current === field ? null : field));
      return;
    }
    onSelectField(PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceContainer, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.primary }]}>Ficha en progreso</Text>

      {knownFields.map((field) => (
        <View key={field} style={styles.knownRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.secondary} style={styles.knownIcon} />
          <Text style={[styles.knownLabel, { color: theme.textSecondary }]}>
            {capitalize(PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField])}:
          </Text>
          <Text style={[styles.knownValue, { color: theme.text }]} numberOfLines={1}>
            {formatKnownValue(field, draft)}
          </Text>
        </View>
      ))}

      {missingFields.length > 0 && (
        <View style={styles.missingSection}>
          <View style={styles.chipsRow}>
            {missingFields.map((field) => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.badgeBackground,
                    borderColor: expandedField === field ? theme.secondary : theme.outline,
                  },
                ]}
                onPress={() => handleChipPress(field)}
                accessibilityRole="button"
                accessibilityLabel={`Completar ${PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField]}`}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {capitalize(PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField])}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {expandedField === 'property_type' && (
            <View style={styles.pickerRow}>
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.pickerChip, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setExpandedField(null);
                    onQuickAnswer(option);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Tipo de propiedad: ${option}`}
                >
                  <Text style={[styles.pickerChipText, { color: theme.onPrimary }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {expandedField === 'operation_type' && (
            <View style={styles.pickerRow}>
              {OPERATION_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.pickerChip, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setExpandedField(null);
                    onQuickAnswer(option);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Operación: ${option}`}
                >
                  <Text style={[styles.pickerChipText, { color: theme.onPrimary }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
