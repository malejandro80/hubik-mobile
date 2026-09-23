import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DRAFT_FIELD_DISPLAY_ORDER } from '../constants/draftFields';
import { PANEL_MAX_HEIGHT_RATIO } from '../constants/draftPanel';
import { MIN_PHOTOS_TO_ORDER } from '../constants/photoOrder';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { getFieldStatuses, getMissingCount, getMissingFields, getSuggestions } from '../lib/draftStatus';
import { DraftEditableField, FieldEditResult } from '../lib/draftValidation';
import { MAX_PROPERTY_IMAGES } from '../services/propertyImages';
import { colors, hitSlop } from '../theme';
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
  onOrderPhotos?: () => void;
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
  onOrderPhotos,
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
  const canOrderPhotos = Boolean(onOrderPhotos) && photoCount >= MIN_PHOTOS_TO_ORDER;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? composer.collapsePanelA11y : composer.expandPanelA11y}
        accessibilityState={{ expanded }}
      >
        <View style={[styles.progressBadge, ready && styles.progressBadgeReady]}>
          {ready ? (
            <Ionicons name="checkmark" size={18} color={theme.onSecondary} />
          ) : (
            <Text style={styles.progressBadgeText}>
              {DRAFT_FIELD_DISPLAY_ORDER.length - missingCount}/{DRAFT_FIELD_DISPLAY_ORDER.length}
            </Text>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.progress}>
            {composer.panelProgress(DRAFT_FIELD_DISPLAY_ORDER.length - missingCount, DRAFT_FIELD_DISPLAY_ORDER.length)}
          </Text>
          <Text style={styles.hint}>{ready ? composer.mediaStatus(photoCount > 0, hasPin) : composer.missingHint(missingCount)}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, photoCount > 0 && styles.chipDone]}
          onPress={onAddPhotos}
          accessibilityRole="button"
          accessibilityLabel={composer.attachPhotosA11y(photoCount)}
        >
          <Ionicons
            name={photoCount > 0 ? 'checkmark-circle' : 'camera-outline'}
            size={18}
            color={photoCount > 0 ? theme.secondary : theme.onSurfaceVariant}
          />
          <View style={styles.chipText}>
            <Text style={styles.chipLabel}>{composer.photoChipLabel(photoCount)}</Text>
            <Text style={styles.chipHint}>{composer.photoChipHint(photoCount)}</Text>
          </View>
          {canOrderPhotos && (
            <TouchableOpacity
              style={styles.chipAction}
              onPress={onOrderPhotos}
              hitSlop={hitSlop.spacious}
              accessibilityRole="button"
              accessibilityLabel={composer.orderPhotosA11y}
            >
              <Ionicons name="swap-vertical" size={16} color={theme.secondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, hasPin && styles.chipDone]}
          onPress={onPickLocation}
          accessibilityRole="button"
          accessibilityLabel={composer.pickLocationA11y(hasPin)}
        >
          <Ionicons
            name={hasPin ? 'checkmark-circle' : 'location-outline'}
            size={18}
            color={hasPin ? theme.secondary : theme.onSurfaceVariant}
          />
          <View style={styles.chipText}>
            <Text style={styles.chipLabel}>{composer.locationChipLabel(hasPin)}</Text>
            <Text style={styles.chipHint}>{composer.locationChipHint(hasPin)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
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
