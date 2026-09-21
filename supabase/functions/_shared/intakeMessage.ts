import {
  CATASTRO_LAST_VARIANTS,
  CATASTRO_UNVERIFIED_PREFIX,
  CATASTRO_VERIFIED_PREFIX,
  DESCRIBE_INVITE_VARIANTS,
  FIELD_LABELS,
  MISSING_FIELDS_PREFIX_VARIANTS,
  MISSING_FIELDS_SUFFIX_VARIANTS,
  READY_TO_CONFIRM_VARIANTS,
  REQUIRED_FIELD_COUNT,
} from './intakeMessageConstants.ts';

export type IntakeField = keyof typeof FIELD_LABELS;
export type CatastroStatus = 'verified' | 'unverified';
export type PickVariant = (variants: readonly string[]) => string;

const randomVariant: PickVariant = (variants) => variants[Math.floor(Math.random() * variants.length)];

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
  pick: PickVariant = randomVariant
): string {
  const prefix = getCatastroPrefix(catastroStatus);

  if (missing.length === 0) return `${prefix}${pick(READY_TO_CONFIRM_VARIANTS)}`;
  if (missing.length >= REQUIRED_FIELD_COUNT) return pick(DESCRIBE_INVITE_VARIANTS);

  const others = missing.filter((field) => field !== 'catastro');
  if (others.length === 0) return `${prefix}${pick(CATASTRO_LAST_VARIANTS)}`;

  const joined = joinLabels(others.map((field) => FIELD_LABELS[field]));
  return `${prefix}${pick(MISSING_FIELDS_PREFIX_VARIANTS)}${joined}. ${pick(MISSING_FIELDS_SUFFIX_VARIANTS)}`;
}
