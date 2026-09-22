import type { GenerateMetadataFunction } from 'expo-server';
import { useLocalSearchParams } from 'expo-router';
import { SharedListingRoute } from '../../components/SharedListingRoute';
import { resolveOrigin, resolveSharedMetadata } from '../../services/sharedMetadata';

export const generateMetadata: GenerateMetadataFunction = async (request, params) => {
  const slug = typeof params.slug === 'string' ? params.slug : undefined;
  return resolveSharedMetadata(slug, resolveOrigin(request.url));
};

export default function SharedPropertyRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <SharedListingRoute value={params.slug} />;
}
