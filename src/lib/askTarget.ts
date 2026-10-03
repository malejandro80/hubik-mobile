import { PREVIEW_PARAM_VALUE, SHARED_LISTING_PARAM_VALUE } from '../constants/listingPreview';
import { AskTarget } from '../types/propertyAsk';
import { isPropertyId, isShareToken } from './shareLink';

export function resolveAskTarget(params: { id?: string; preview?: string; shared?: string }): AskTarget | null {
  if (params.preview === PREVIEW_PARAM_VALUE) return null;
  if (params.shared === SHARED_LISTING_PARAM_VALUE) {
    return isShareToken(params.id) ? { kind: 'shared', token: params.id } : null;
  }
  return isPropertyId(params.id) ? { kind: 'listing', id: params.id } : null;
}
