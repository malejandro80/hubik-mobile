import { supabase } from '../lib/supabase';
import { IMAGE_UPLOAD_ATTEMPTS, RETRYABLE_UPLOAD_ERROR } from '../constants/imageUpload';

export const MAX_PROPERTY_IMAGES = 10;

const BUCKET = 'property-images';

const IMAGE_CONTENT_TYPE = 'image/jpeg';

export async function uploadPropertyImages(draftId: string, uris: string[]): Promise<string[]> {
  if (uris.length > MAX_PROPERTY_IMAGES) {
    throw new Error(`No se pueden subir más de ${MAX_PROPERTY_IMAGES} fotos`);
  }

  const urls: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const response = await fetch(uri);
    const picked = await response.blob();
    const blob = picked.slice(0, picked.size, IMAGE_CONTENT_TYPE);
    const path = await uploadWithRetry(draftId, i, blob);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function uploadWithRetry(draftId: string, index: number, blob: Blob): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const path = `drafts/${draftId}/${index}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: IMAGE_CONTENT_TYPE,
      upsert: false,
    });

    if (!error) return path;

    const canRetry = error.name === RETRYABLE_UPLOAD_ERROR && attempt < IMAGE_UPLOAD_ATTEMPTS;
    if (!canRetry) {
      throw new Error(`No se pudo subir la foto ${index + 1}: ${error.message}`);
    }
  }
}
