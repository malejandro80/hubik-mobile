import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseListingRef } from '../lib/listingSlug';
import { isShareToken } from '../lib/shareLink';
import { fetchSharedListingByToken } from '../services/listingShareLinks';
import { fetchSharedPropertyByRef } from '../services/sharedProperty';
import { Property } from '../types/property';

export type SharedPropertyStatus = 'loading' | 'ready' | 'not_found' | 'error';

interface Settled {
  key: string;
  status: 'ready' | 'not_found' | 'error';
  property: Property | null;
}

type ListingLoader = (() => Promise<Property | null>) | null;

const NOT_FOUND = { status: 'not_found' as const, property: null };
const LOADING = { status: 'loading' as const, property: null };

function useListingLoader(value: string | undefined, load: ListingLoader) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const key = `${value}:${attempt}`;

  useEffect(() => {
    if (!load) return;
    let active = true;

    load()
      .then((property) => {
        if (active) setSettled({ key, status: property ? 'ready' : 'not_found', property });
      })
      .catch(() => {
        if (active) setSettled({ key, status: 'error', property: null });
      });

    return () => {
      active = false;
    };
  }, [load, key]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  if (!load) return { ...NOT_FOUND, retry };
  if (settled?.key === key) return { status: settled.status, property: settled.property, retry };
  return { ...LOADING, retry };
}

export function useSharedListing(value: string | undefined, opaque = false) {
  const load = useMemo<ListingLoader>(() => {
    if (opaque) return isShareToken(value) ? () => fetchSharedListingByToken(value) : null;
    const ref = parseListingRef(value);
    return ref ? () => fetchSharedPropertyByRef(ref) : null;
  }, [value, opaque]);
  return useListingLoader(value, load);
}

export function useSharedProperty(value: string | undefined) {
  return useSharedListing(value);
}

export function useOpaqueSharedListing(token: string | undefined) {
  return useSharedListing(token, true);
}
