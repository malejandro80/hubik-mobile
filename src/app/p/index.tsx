import type { GenerateMetadataFunction } from 'expo-server';
import { useLocalSearchParams } from 'expo-router';
import { SharedListingRoute } from '../../components/SharedListingRoute';
import { SHARE_QUERY_PARAM } from '../../constants/share';
import { resolveOrigin, resolveSharedMetadata } from '../../services/sharedMetadata';

export const generateMetadata: GenerateMetadataFunction = async (request) => {
  const id = new URL(request.url).searchParams.get(SHARE_QUERY_PARAM) ?? undefined;
  return resolveSharedMetadata(id, resolveOrigin(request.url));
};

export default function LegacySharedPropertyRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  return <SharedListingRoute value={params[SHARE_QUERY_PARAM]} />;
}
