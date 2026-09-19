import { Labels } from '../hooks/useLabels';
import {
  OperationType,
  PROPERTY_DRAFT_FIELD_LABELS,
  PROPERTY_TYPE_LABEL_ES,
  PropertyDraft,
} from '../types/property';

export type LabeledField = keyof typeof PROPERTY_DRAFT_FIELD_LABELS;
export type EnumField = 'property_type' | 'operation_type';

export interface PickerConfig {
  options: string[];
  getA11yLabel: (labels: Labels, option: string) => string;
}

export const PICKER_OPTIONS: Record<EnumField, PickerConfig> = {
  property_type: {
    options: ['Piso', 'Casa', 'Casa adosada', 'Estudio', 'Condominio'],
    getA11yLabel: (lbls, opt) => lbls.livingDraft.propertyTypeA11y(opt),
  },
  operation_type: {
    options: ['Venta', 'Alquiler'],
    getA11yLabel: (lbls, opt) => lbls.livingDraft.operationTypeA11y(opt),
  },
};

export const isPickerField = (field: keyof PropertyDraft): field is EnumField =>
  field in PICKER_OPTIONS;

export const OPERATION_TYPE_LABEL: Record<OperationType, (labels: Labels) => string> = {
  rent: (labels) => labels.livingDraft.rent,
  sale: (labels) => labels.livingDraft.sale,
};

export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatKnownValue(
  field: keyof PropertyDraft,
  draft: PropertyDraft,
  labels: Labels
): string {
  switch (field) {
    case 'property_type':
      return draft.property_type ? PROPERTY_TYPE_LABEL_ES[draft.property_type] : '';
    case 'operation_type':
      return draft.operation_type ? OPERATION_TYPE_LABEL[draft.operation_type](labels) : '';
    case 'price':
      return draft.price !== undefined ? `${draft.price.toLocaleString('es-ES')} €` : '';
    case 'bedrooms':
      return draft.bedrooms !== undefined ? labels.livingDraft.bedroomShort(draft.bedrooms) : '';
    case 'bathrooms':
      return draft.bathrooms !== undefined ? labels.livingDraft.bathrooms(draft.bathrooms) : '';
    case 'square_meters':
      return draft.square_meters !== undefined ? labels.livingDraft.sqmSuffix(draft.square_meters) : '';
    default:
      return String(draft[field] ?? '');
  }
}
