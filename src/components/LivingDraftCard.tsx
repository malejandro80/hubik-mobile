import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { FieldStatusEntry } from '../lib/draftStatus';
import { DraftEditableField, FieldEditResult } from '../lib/draftValidation';
import {
  capitalize,
  formatKnownValue,
  isPickerField,
  LabeledField,
  PICKER_OPTIONS,
} from '../lib/livingDraft';
import {
  PROPERTY_DRAFT_FIELD_LABELS,
  PropertyDraft,
  REQUIRED_PROPERTY_DRAFT_FIELDS,
} from '../types/property';
import { colors } from '../theme';
import { DraftFieldRow } from './DraftFieldRow';
import { getLivingDraftCardStyles } from './LivingDraftCard.styles';

export interface LivingDraftCardProps {
  draft: PropertyDraft;
  missingFields: (keyof PropertyDraft)[];
  onSelectEnumOption?: (option: string) => void;
  onSelectMissingField?: (fieldLabel: string) => void;
  onQuickAnswer?: (option: string) => void;
  onSelectField?: (fieldLabel: string) => void;
  statuses?: FieldStatusEntry[];
  onEditField?: (field: DraftEditableField, raw: string) => FieldEditResult;
}

export const LivingDraftCard: React.FC<LivingDraftCardProps> = ({
  draft,
  missingFields,
  onSelectEnumOption,
  onSelectMissingField,
  onQuickAnswer,
  onSelectField,
  statuses,
  onEditField,
}) => {
  const handleEnumOptionSelect = onSelectEnumOption ?? onQuickAnswer ?? (() => {});
  const handleMissingFieldSelect = onSelectMissingField ?? onSelectField ?? (() => {});

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const { styles, checkmarkColor } = useMemo(
    () => getLivingDraftCardStyles(theme),
    [theme]
  );
  const [expandedField, setExpandedField] = useState<keyof PropertyDraft | null>(null);

  if (statuses && onEditField) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{labels.livingDraft.title}</Text>
        {statuses.map(({ field, status }) => (
          <DraftFieldRow key={field} field={field} status={status} draft={draft} onEdit={onEditField} />
        ))}
      </View>
    );
  }

  const knownFields = REQUIRED_PROPERTY_DRAFT_FIELDS.filter((field) => !missingFields.includes(field));

  const handleChipPress = (field: keyof PropertyDraft) => {
    if (isPickerField(field)) {
      setExpandedField((current) => (current === field ? null : field));
      return;
    }
    handleMissingFieldSelect(PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{labels.livingDraft.title}</Text>

      {knownFields.map((field) => (
        <View key={field} style={styles.knownRow}>
          <Ionicons name="checkmark-circle" size={18} color={checkmarkColor} style={styles.knownIcon} />
          <Text style={styles.knownLabel}>
            {capitalize(PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField])}:
          </Text>
          <Text style={styles.knownValue} numberOfLines={1}>
            {formatKnownValue(field, draft, labels)}
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
                  expandedField === field && styles.chipExpanded,
                ]}
                onPress={() => handleChipPress(field)}
                accessibilityRole="button"
                accessibilityLabel={labels.livingDraft.completeFieldA11y(
                  PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField]
                )}
              >
                <Text style={styles.chipText}>
                  {capitalize(PROPERTY_DRAFT_FIELD_LABELS[field as LabeledField])}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {expandedField && isPickerField(expandedField) && (
            <View style={styles.pickerRow}>
              {PICKER_OPTIONS[expandedField].options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.pickerChip}
                  onPress={() => {
                    setExpandedField(null);
                    handleEnumOptionSelect(option);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={PICKER_OPTIONS[expandedField].getA11yLabel(labels, option)}
                >
                  <Text style={styles.pickerChipText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
