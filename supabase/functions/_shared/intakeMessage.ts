import {
  CATASTRO_LAST_VARIANTS,
  CATASTRO_REQUEST_VARIANTS,
  CATASTRO_UNVERIFIED_PREFIX,
  CATASTRO_VERIFIED_PREFIX,
  DESCRIBE_INVITE_VARIANTS,
  FIELD_LABELS,
  MISSING_FIELDS_PREFIX_VARIANTS,
  MISSING_FIELDS_SUFFIX_VARIANTS,
  PENDING_EXTRA_LABELS,
  READY_TO_CONFIRM_VARIANTS,
  READY_WITH_EXTRAS_VARIANTS,
  REQUIRED_FIELD_COUNT,
} from './intakeMessageConstants.ts';

export type IntakeField = keyof typeof FIELD_LABELS;
export type CatastroStatus = 'verified' | 'unverified';
export type PendingExtra = keyof typeof PENDING_EXTRA_LABELS;
export type PickVariant = <T>(variants: readonly T[]) => T;

export interface MediaState {
  images?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

const randomVariant: PickVariant = (variants) => variants[Math.floor(Math.random() * variants.length)];

export function pendingExtras(draft: MediaState): PendingExtra[] {
  const pending: PendingExtra[] = [];
  if (!Array.isArray(draft.images) || draft.images.length === 0) pending.push('photos');
  if (typeof draft.latitude !== 'number' || typeof draft.longitude !== 'number') pending.push('location');
  return pending;
}

function joinLabels(labels: string[]): string {
  return labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

function getCatastroPrefix(status?: CatastroStatus): string {
  if (status === 'verified') return CATASTRO_VERIFIED_PREFIX;
  if (status === 'unverified') return CATASTRO_UNVERIFIED_PREFIX;
  return '';
}

export function buildAssistantMessage(
  missing: IntakeField[],
  catastroStatus?: CatastroStatus,
  pick: PickVariant = randomVariant,
  pending: PendingExtra[] = []
): string {
  const prefix = getCatastroPrefix(catastroStatus);
  const extras = pending.length > 0 ? joinLabels(pending.map((extra) => PENDING_EXTRA_LABELS[extra])) : null;

  if (missing.length === 0) {
    return `${prefix}${extras ? pick(READY_WITH_EXTRAS_VARIANTS)(extras) : pick(READY_TO_CONFIRM_VARIANTS)}`;
  }
  if (missing.length >= REQUIRED_FIELD_COUNT) return pick(DESCRIBE_INVITE_VARIANTS);

  const others = missing.filter((field) => field !== 'catastro');
  if (others.length === 0) {
    return `${prefix}${extras ? pick(CATASTRO_REQUEST_VARIANTS)(extras) : pick(CATASTRO_LAST_VARIANTS)}`;
  }

  const joined = joinLabels(others.map((field) => FIELD_LABELS[field]));
  return `${prefix}${pick(MISSING_FIELDS_PREFIX_VARIANTS)}${joined}. ${pick(MISSING_FIELDS_SUFFIX_VARIANTS)}`;
}
