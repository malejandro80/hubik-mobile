import type { GenerateMetadataFunction } from 'expo-server';
import { useLocalSearchParams } from 'expo-router';
import { SharedListingRoute } from '../../components/SharedListingRoute';
import { resolveOpaqueSharedMetadata, resolveOrigin } from '../../services/sharedMetadata';

export const generateMetadata: GenerateMetadataFunction = async (request, params) => {
  const token = typeof params.token === 'string' ? params.token : undefined;
  return resolveOpaqueSharedMetadata(token, resolveOrigin(request.url));
};

export default function OpaqueSharedListingRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  return <SharedListingRoute value={params.token} opaque />;
}
