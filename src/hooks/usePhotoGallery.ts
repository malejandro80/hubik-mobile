import { useCallback, useState } from 'react';

export function usePhotoGallery() {
  const [galleryVisible, setGalleryVisible] = useState(false);
  const openGallery = useCallback(() => setGalleryVisible(true), []);
  const closeGallery = useCallback(() => setGalleryVisible(false), []);
  return { galleryVisible, openGallery, closeGallery };
}
