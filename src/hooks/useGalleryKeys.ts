import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GALLERY_ARROW_KEYS } from '../constants/gallery';

interface UseGalleryKeysOptions {
  enabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function useGalleryKeys({ enabled, onPrevious, onNext }: UseGalleryKeysOptions) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleKey = (event: { key: string }) => {
      if (event.key === GALLERY_ARROW_KEYS.previous) onPrevious();
      else if (event.key === GALLERY_ARROW_KEYS.next) onNext();
    };

    const target = document;
    target.addEventListener('keydown', handleKey);
    return () => target.removeEventListener('keydown', handleKey);
  }, [enabled, onPrevious, onNext]);
}
