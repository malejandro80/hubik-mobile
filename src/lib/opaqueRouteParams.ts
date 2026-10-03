import { Property } from '../types/property';
import { buildPropertyRouteParams } from './chatRegistration';
import { SHARED_LISTING_PARAM_VALUE } from '../constants/listingPreview';

export function buildOpaqueRouteParams(property: Property) {
  return { ...buildPropertyRouteParams({ ...property, agent_name: null }), shared: SHARED_LISTING_PARAM_VALUE };
}
