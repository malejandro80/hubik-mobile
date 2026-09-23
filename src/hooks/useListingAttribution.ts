import { useEffect, useState } from 'react';
import { fetchAgencyName } from '../services/authApi';
import { useAuth } from './useAuth';

export interface ListingAttribution {
  agencyName?: string;
  agentName?: string;
}

export function useListingAttribution(
  isPreview: boolean,
  listingAgencyName?: string,
  listingAgentName?: string
): ListingAttribution {
  const { profile } = useAuth();
  const [previewAgencyName, setPreviewAgencyName] = useState<string | null>(null);
  const previewAgencyId = isPreview ? (profile?.agencyId ?? null) : null;

  useEffect(() => {
    if (!previewAgencyId) return;
    let cancelled = false;
    fetchAgencyName(previewAgencyId).then((name) => {
      if (!cancelled) setPreviewAgencyName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [previewAgencyId]);

  if (!isPreview) return { agencyName: listingAgencyName, agentName: listingAgentName };
  return {
    agencyName: previewAgencyName ?? undefined,
    agentName: profile?.displayName ?? undefined,
  };
}
