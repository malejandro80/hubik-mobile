import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DRAFT_FIELD_DISPLAY_ORDER } from '../constants/draftFields';
import { PANEL_MAX_HEIGHT_RATIO } from '../constants/draftPanel';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { getFieldStatuses, getMissingCount, getMissingFields, getSuggestions } from '../lib/draftStatus';
import { DraftEditableField, FieldEditResult } from '../lib/draftValidation';
import { MAX_PROPERTY_IMAGES } from '../services/propertyImages';
import { colors } from '../theme/colors';
import { PropertyDraft } from '../types/property';
import { AmenitiesConfirmation } from './AmenitiesConfirmation';
import { DraftDescriptionBlock } from './DraftDescriptionBlock';
import { getDraftPanelStyles } from './DraftPanel.styles';
import { LivingDraftCard } from './LivingDraftCard';
import { PropertyPhotoGrid } from './PropertyPhotoGrid';

export interface DraftPanelProps {
  draft: PropertyDraft;
  recentlyChanged: (keyof PropertyDraft)[];
  describing: boolean;
  descriptionFailed: boolean;
  describedFrom: string | null;
  publishing: boolean;
  onEditField: (field: DraftEditableField, raw: string) => FieldEditResult;
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
  onMovePhoto: (index: number, direction: 'up' | 'down') => void;
  onPickLocation: () => void;
  onAmenitiesChange: (amenities: string[]) => void;
  onRequestDescription: () => void;
  onPublish: () => void;
  onPreview: () => void;
}

export const DraftPanel: React.FC<DraftPanelProps> = ({
  draft,
  recentlyChanged,
  describing,
  descriptionFailed,
  describedFrom,
  publishing,
  onEditField,
  onAddPhotos,
  onRemovePhoto,
  onMovePhoto,
  onPickLocation,
  onAmenitiesChange,
  onRequestDescription,
  onPublish,
  onPreview,
}) => {
  const { composer } = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getDraftPanelStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);

  const missingCount = getMissingCount(draft);
  const ready = missingCount === 0;
  const photoCount = draft.images?.length ?? 0;
  const hasPin = draft.latitude !== undefined && draft.longitude !== undefined;
  const suggestions = getSuggestions(draft, describedFrom);
  const statuses = getFieldStatuses(draft, recentlyChanged);
  const publishDisabled = !ready || publishing;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.summary}
          onPress={() => setExpanded((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? composer.collapsePanelA11y : composer.expandPanelA11y}
          accessibilityState={{ expanded }}
        >
          <View style={styles.summaryLine}>
            <Text style={styles.progress}>
              {composer.panelProgress(DRAFT_FIELD_DISPLAY_ORDER.length - missingCount, DRAFT_FIELD_DISPLAY_ORDER.length)}
            </Text>
            <Text style={styles.summaryPart}>{composer.photosSummary(photoCount)}</Text>
            <Text style={styles.summaryPart}>{composer.pinSummary(hasPin)}</Text>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.textSecondary}
              style={styles.chevron}
            />
          </View>
          <Text style={styles.hint}>{ready ? composer.readyToPublish : composer.missingHint(missingCount)}</Text>
          {!expanded && suggestions.length > 0 && (
            <Text style={styles.topSuggestion} numberOfLines={2}>
              {composer.suggestions[suggestions[0]]}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishButton, publishDisabled && styles.publishButtonDisabled]}
          onPress={onPublish}
          disabled={publishDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            ready ? composer.publishA11yReady : composer.publishA11yBlocked(composer.missingHint(missingCount))
          }
          accessibilityState={{ disabled: publishDisabled, busy: publishing }}
        >
          <Text style={styles.publishText}>{publishing ? composer.publishing : composer.publish}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewRow}>
        <TouchableOpacity
          style={[styles.previewButton, !ready && styles.previewButtonDisabled]}
          onPress={onPreview}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityLabel={ready ? composer.previewA11yReady : composer.previewA11yBlocked}
          accessibilityState={{ disabled: !ready }}
        >
          <Ionicons name="eye-outline" size={20} color={theme.secondary} />
          <Text style={styles.pillText}>{composer.preview}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <ScrollView style={[styles.body, { maxHeight: height * PANEL_MAX_HEIGHT_RATIO }]} keyboardShouldPersistTaps="handled">
          {suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{composer.suggestionsTitle}</Text>
              {suggestions.map((key) => (
                <View key={key} style={styles.suggestionRow}>
                  <Ionicons name="bulb-outline" size={18} color={theme.secondary} />
                  <Text style={styles.suggestionText}>{composer.suggestions[key]}</Text>
                </View>
              ))}
            </View>
          )}

          <LivingDraftCard
            draft={draft}
            missingFields={getMissingFields(draft)}
            statuses={statuses}
            onEditField={onEditField}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{composer.photosTitle}</Text>
            <PropertyPhotoGrid
              images={draft.images ?? []}
              maxImages={MAX_PROPERTY_IMAGES}
              onRemove={onRemovePhoto}
              onMove={onMovePhoto}
              onAddPress={onAddPhotos}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{composer.pinTitle}</Text>
            <View style={styles.pinRow}>
              <Text style={styles.pinText}>
                {hasPin ? composer.pinSet(draft.latitude as number, draft.longitude as number) : composer.pinNone}
              </Text>
              <TouchableOpacity
                style={styles.pillButton}
                onPress={onPickLocation}
                accessibilityRole="button"
                accessibilityLabel={hasPin ? composer.pinChangeA11y : composer.pinMark}
              >
                <Text style={styles.pillText}>{hasPin ? composer.pinChange : composer.pinMark}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <AmenitiesConfirmation amenities={draft.amenities ?? []} onChange={onAmenitiesChange} />

          <DraftDescriptionBlock
            description={draft.description}
            ready={ready}
            describing={describing}
            failed={descriptionFailed}
            onRequest={onRequestDescription}
          />
        </ScrollView>
      )}
    </View>
  );
};
