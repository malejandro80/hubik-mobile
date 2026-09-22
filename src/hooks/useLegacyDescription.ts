import { useEffect, useState } from 'react';
import { generatePropertyDescription } from '../services/chatApi';

export interface UseLegacyDescriptionParams {
  title: string;
  price?: string;
  bedrooms?: string;
  bathrooms?: string;
  squareMeters?: string;
  city: string;
  address?: string;
  amenities?: string[];
  isRealDraft: boolean;
}

export interface UseLegacyDescriptionResult {
  description: string | null;
  loading: boolean;
  hasError: boolean;
}

export function useLegacyDescription({
  title,
  price,
  bedrooms,
  bathrooms,
  squareMeters,
  city,
  address,
  amenities,
  isRealDraft,
}: UseLegacyDescriptionParams): UseLegacyDescriptionResult {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const amenitiesKey = JSON.stringify(amenities ?? []);

  useEffect(() => {
    if (isRealDraft) return;
    let cancelled = false;
    const amenityList: string[] = JSON.parse(amenitiesKey);
    const run = async () => {
      setLoading(true);
      setHasError(false);

      try {
        const { description: generated } = await generatePropertyDescription({
          title,
          price: Number(price) || undefined,
          bedrooms: Number(bedrooms) || undefined,
          bathrooms: Number(bathrooms) || undefined,
          square_meters: Number(squareMeters) || undefined,
          city,
          address,
          amenities: amenityList.length > 0 ? amenityList : undefined,
        });
        if (!cancelled) setDescription(generated);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    isRealDraft,
    title,
    price,
    bedrooms,
    bathrooms,
    squareMeters,
    city,
    address,
    amenitiesKey,
  ]);

  return { description, loading, hasError };
}
