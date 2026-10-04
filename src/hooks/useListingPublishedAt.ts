import { useEffect, useState } from 'react';
import { fetchListingPublishedAt } from '../services/listingPublishedAt';

export function useListingPublishedAt(listingId: string | null, knownPublishedAt?: string): string | undefined {
  const [fetched, setFetched] = useState<string | null>(null);
  const shouldFetch = Boolean(listingId) && !knownPublishedAt;

  useEffect(() => {
    if (!shouldFetch || !listingId) return;
    let cancelled = false;
    fetchListingPublishedAt(listingId).then((publishedAt) => {
      if (!cancelled) setFetched(publishedAt);
    });
    return () => {
      cancelled = true;
    };
  }, [listingId, shouldFetch]);

  return knownPublishedAt ?? fetched ?? undefined;
}
