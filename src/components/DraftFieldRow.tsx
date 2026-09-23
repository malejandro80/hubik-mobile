import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DECIMAL_KEYBOARD_FIELDS,
  ENUM_FIELDS,
  INTEGER_KEYBOARD_FIELDS,
  RequiredDraftFieldKey,
} from '../constants/draftFields';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { FieldStatus } from '../lib/draftStatus';
import { DraftEditableField, FieldEditResult } from '../lib/draftValidation';
import { capitalize, EnumField, formatKnownValue, getEnumOptions } from '../lib/livingDraft';
import { colors } from '../theme';
import { PROPERTY_DRAFT_FIELD_LABELS, PropertyDraft } from '../types/property';
import { getDraftFieldRowStyles } from './DraftFieldRow.styles';

export interface DraftFieldRowProps {
  field: RequiredDraftFieldKey;
  status: FieldStatus;
  draft: PropertyDraft;
  onEdit: (field: DraftEditableField, raw: string) => FieldEditResult;
}

const STATUS_ICONS: Record<FieldStatus, keyof typeof Ionicons.glyphMap> = {
  ok: 'checkmark-circle',
  missing: 'ellipse-outline',
  changed: 'sparkles',
};

const MISSING_VALUE = '—';

const getKeyboardType = (field: RequiredDraftFieldKey) => {
  if (INTEGER_KEYBOARD_FIELDS.includes(field)) return 'numeric';
  if (DECIMAL_KEYBOARD_FIELDS.includes(field)) return 'decimal-pad';
  return 'default';
};

export const DraftFieldRow: React.FC<DraftFieldRowProps> = ({ field, status, draft, onEdit }) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getDraftFieldRowStyles(theme), [theme]);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fieldLabel = PROPERTY_DRAFT_FIELD_LABELS[field];
  const knownValue = status === 'missing' ? '' : formatKnownValue(field, draft, labels);
  const statusWord = labels.composer.statusWords[status];
  const isEnum = ENUM_FIELDS.includes(field);

  const openEditor = () => {
    setText(String(draft[field] ?? ''));
    setErrorMessage(null);
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    setErrorMessage(null);
  };

  const submit = (raw: string) => {
    const result = onEdit(field, raw);
    if (result.ok) {
      closeEditor();
      return;
    }
    setErrorMessage(labels.composer.fieldErrors[result.error]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.row}
        onPress={editing ? closeEditor : openEditor}
        accessibilityRole="button"
        accessibilityLabel={labels.composer.fieldRowA11y(
          capitalize(fieldLabel),
          knownValue || labels.composer.noValueA11y,
          statusWord
        )}
        accessibilityState={{ expanded: editing }}
      >
        <Ionicons
          name={STATUS_ICONS[status]}
          size={20}
          color={status === 'missing' ? theme.textSecondary : theme.secondary}
          style={styles.icon}
        />
        <Text style={styles.label}>{capitalize(fieldLabel)}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {knownValue || MISSING_VALUE}
        </Text>
        <Text style={[styles.status, status === 'changed' && styles.statusChanged]}>{statusWord}</Text>
      </TouchableOpacity>

      {editing && isEnum && (
        <View style={styles.optionsRow}>
          {getEnumOptions(field as EnumField, labels).map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.option}
              onPress={() => submit(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {editing && !isEnum && (
        <View style={styles.editor}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            keyboardType={getKeyboardType(field)}
            autoCapitalize={field === 'catastro' ? 'characters' : 'sentences'}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => submit(text)}
            accessibilityLabel={labels.composer.editInputA11y(fieldLabel)}
          />
          {errorMessage && (
            <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {errorMessage}
            </Text>
          )}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => submit(text)}
              accessibilityRole="button"
              accessibilityLabel={labels.composer.editSave}
            >
              <Text style={styles.actionText}>{labels.composer.editSave}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={closeEditor}
              accessibilityRole="button"
              accessibilityLabel={labels.composer.editCancel}
            >
              <Text style={[styles.actionText, styles.actionTextSecondary]}>{labels.composer.editCancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
