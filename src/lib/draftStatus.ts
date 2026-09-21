import {
  DESCRIPTION_KEY_FIELDS,
  DRAFT_FIELD_DISPLAY_ORDER,
  LOCAL_ONLY_FIELDS,
  RequiredDraftFieldKey,
} from '../constants/draftFields';
import {
  MAX_SUGGESTIONS,
  MIN_DESCRIPTION_LENGTH,
  MIN_RECOMMENDED_PHOTOS,
  SUGGESTION_PRIORITY,
  SuggestionKey,
} from '../constants/draftSuggestions';
import { PropertyDraft } from '../types/property';

export type FieldStatus = 'ok' | 'missing' | 'changed';

export interface FieldStatusEntry {
  field: RequiredDraftFieldKey;
  status: FieldStatus;
}

export function isFieldFilled(draft: PropertyDraft, field: keyof PropertyDraft): boolean {
  const value = draft[field];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

export function getFieldStatuses(
  draft: PropertyDraft,
  recentlyChanged: (keyof PropertyDraft)[]
): FieldStatusEntry[] {
  return DRAFT_FIELD_DISPLAY_ORDER.map((field) => {
    if (!isFieldFilled(draft, field)) return { field, status: 'missing' };
    return { field, status: recentlyChanged.includes(field) ? 'changed' : 'ok' };
  });
}

export function getMissingFields(draft: PropertyDraft): RequiredDraftFieldKey[] {
  return DRAFT_FIELD_DISPLAY_ORDER.filter((field) => !isFieldFilled(draft, field));
}

export function getMissingCount(draft: PropertyDraft): number {
  return getMissingFields(draft).length;
}

export function isReadyToPublish(draft: PropertyDraft): boolean {
  return getMissingCount(draft) === 0;
}

export function getDescriptionKey(draft: PropertyDraft): string {
  return JSON.stringify(DESCRIPTION_KEY_FIELDS.map((field) => draft[field] ?? null));
}

export function getSuggestions(draft: PropertyDraft, describedFrom: string | null): SuggestionKey[] {
  const photoCount = draft.images?.length ?? 0;
  const description = draft.description?.trim() ?? '';
  const hasDescription = description !== '';
  const applicable = new Set<SuggestionKey>();

  if (photoCount === 0) applicable.add('no_photos');
  else if (photoCount < MIN_RECOMMENDED_PHOTOS) applicable.add('few_photos');

  if (draft.latitude === undefined || draft.longitude === undefined) applicable.add('no_pin');

  if (!hasDescription && isReadyToPublish(draft)) applicable.add('no_description');

  if (hasDescription && describedFrom !== null && describedFrom !== getDescriptionKey(draft)) {
    applicable.add('stale_description');
  }

  if (hasDescription && description.length < MIN_DESCRIPTION_LENGTH) applicable.add('short_description');

  if (!draft.amenities || draft.amenities.length === 0) applicable.add('no_amenities');

  return SUGGESTION_PRIORITY.filter((key) => applicable.has(key)).slice(0, MAX_SUGGESTIONS);
}

export function getChangedFields(before: PropertyDraft, after: PropertyDraft): (keyof PropertyDraft)[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof PropertyDraft>;
  return [...keys].filter(
    (key) =>
      !LOCAL_ONLY_FIELDS.includes(key) &&
      JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)
  );
}
