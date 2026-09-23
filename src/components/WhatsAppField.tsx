import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { normalizeWhatsApp } from '../lib/whatsapp';
import { colors } from '../theme';
import { getWhatsAppFieldStyles } from './WhatsAppField.styles';

export interface WhatsAppFieldProps {
  title: string;
  value: string | null | undefined;
  onSave: (phone: string | null) => Promise<void>;
}

export const WhatsAppField: React.FC<WhatsAppFieldProps> = ({ title, value, onSave }) => {
  const { whatsapp } = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getWhatsAppFieldStyles(theme), [theme]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft(value ?? '');
    setError(null);
    setEditing(true);
  };

  const commit = async (phone: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(phone);
      setEditing(false);
    } catch {
      setError(whatsapp.saveError);
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const phone = normalizeWhatsApp(draft);
    if (!phone) {
      setError(whatsapp.invalid);
      return;
    }
    void commit(phone);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{whatsapp.hint}</Text>

      {editing ? (
        <>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={whatsapp.placeholder}
            placeholderTextColor={theme.textTertiary}
            keyboardType="phone-pad"
            autoFocus
            editable={!saving}
            accessibilityLabel={whatsapp.inputA11y}
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.button}
              onPress={save}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={whatsapp.save}
              accessibilityState={{ disabled: saving, busy: saving }}
            >
              {saving ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.buttonText}>{whatsapp.save}</Text>}
            </TouchableOpacity>
            {value ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => void commit(null)}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={whatsapp.remove}
                accessibilityState={{ disabled: saving }}
              >
                <Text style={styles.secondaryButtonText}>{whatsapp.remove}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setEditing(false)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={whatsapp.cancel}
              accessibilityState={{ disabled: saving }}
            >
              <Text style={styles.secondaryButtonText}>{whatsapp.cancel}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          {value ? <Text style={styles.value}>{value}</Text> : null}
          <TouchableOpacity
            style={[styles.button, value ? styles.secondaryButton : null]}
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel={value ? whatsapp.change : whatsapp.add}
          >
            <Text style={value ? styles.secondaryButtonText : styles.buttonText}>{value ? whatsapp.change : whatsapp.add}</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};
