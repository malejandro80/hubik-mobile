import { supabase } from '../lib/supabase';

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
    const path = `drafts/${draftId}/${i}-${Date.now()}.jpg`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: IMAGE_CONTENT_TYPE,
      upsert: false,
    });

    if (error) {
      throw new Error(`No se pudo subir la foto ${i + 1}: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}
