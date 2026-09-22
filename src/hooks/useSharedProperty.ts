import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseListingRef } from '../lib/listingSlug';
import { fetchSharedPropertyByRef } from '../services/sharedProperty';
import { Property } from '../types/property';

export type SharedPropertyStatus = 'loading' | 'ready' | 'not_found' | 'error';

interface Settled {
  key: string;
  status: 'ready' | 'not_found' | 'error';
  property: Property | null;
}

const NOT_FOUND = { status: 'not_found' as const, property: null };
const LOADING = { status: 'loading' as const, property: null };

export function useSharedProperty(value: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const ref = useMemo(() => parseListingRef(value), [value]);
  const key = `${value}:${attempt}`;

  useEffect(() => {
    if (!ref) return;
    let active = true;

    fetchSharedPropertyByRef(ref)
      .then((property) => {
        if (active) setSettled({ key, status: property ? 'ready' : 'not_found', property });
      })
      .catch(() => {
        if (active) setSettled({ key, status: 'error', property: null });
      });

    return () => {
      active = false;
    };
  }, [ref, key]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  if (!ref) return { ...NOT_FOUND, retry };
  if (settled?.key === key) return { status: settled.status, property: settled.property, retry };
  return { ...LOADING, retry };
}
