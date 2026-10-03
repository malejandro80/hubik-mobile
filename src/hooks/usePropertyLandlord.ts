import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchPropertyLandlord } from '../services/authApi';
import { PropertyLandlord } from '../types/auth';

export interface UsePropertyLandlordResult {
  landlord: PropertyLandlord | null;
  mayView: boolean;
  loading: boolean;
}

interface LandlordState {
  propertyId: string;
  landlord: PropertyLandlord | null;
  loading: boolean;
}

export function usePropertyLandlord(propertyId: string): UsePropertyLandlordResult {
  const { profile } = useAuth();
  const [state, setState] = useState<LandlordState>({
    propertyId,
    landlord: null,
    loading: Boolean(propertyId),
  });
  const mayView = profile?.role === 'agent' || profile?.role === 'owner';

  useEffect(() => {
    if (!mayView) return;

    let active = true;

    fetchPropertyLandlord(propertyId)
      .then((result) => {
        if (active) {
          setState({ propertyId, landlord: result, loading: false });
        }
      })
      .catch(() => {
        if (active) {
          setState({ propertyId, landlord: null, loading: false });
        }
      });

    return () => {
      active = false;
    };
  }, [mayView, propertyId]);

  const isCurrent = state.propertyId === propertyId;
  const landlord = isCurrent ? state.landlord : null;
  const loading = isCurrent ? state.loading : true;

  return {
    landlord: mayView ? landlord : null,
    mayView,
    loading: mayView ? loading : false,
  };
}
