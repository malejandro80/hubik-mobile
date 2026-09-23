import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { PREVIEW_PARAM, PREVIEW_PARAM_VALUE } from '../constants/listingPreview';
import { buildDraftPreviewProperty, buildPropertyRouteParams } from '../lib/chatRegistration';
import { PropertyDraft } from '../types/property';

interface UseDraftReviewOptions {
  draft: PropertyDraft;
  setPhotos: (uris: string[]) => void;
}

export function useDraftReview({ draft, setPhotos }: UseDraftReviewOptions) {
  const router = useRouter();
  const [orderVisible, setOrderVisible] = useState(false);

  const openPreview = useCallback(() => {
    router.push({
      pathname: '/property/[id]',
      params: {
        ...buildPropertyRouteParams(buildDraftPreviewProperty(draft)),
        [PREVIEW_PARAM]: PREVIEW_PARAM_VALUE,
      },
    });
  }, [router, draft]);

  const openOrder = useCallback(() => setOrderVisible(true), []);
  const closeOrder = useCallback(() => setOrderVisible(false), []);

  const confirmOrder = useCallback(
    (uris: string[]) => {
      setPhotos(uris);
      setOrderVisible(false);
    },
    [setPhotos]
  );

  return { openPreview, orderVisible, openOrder, closeOrder, confirmOrder };
}
