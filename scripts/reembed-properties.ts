import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { embedText } from '../supabase/functions/_shared/geminiEmbedding';
import { listingDocument } from '../supabase/functions/_shared/listingDocument';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const geminiKey = process.env.GEMINI_API_KEY ?? '';

async function main() {
  if (!supabaseUrl || !serviceRoleKey || !geminiKey) {
    throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o GEMINI_API_KEY en .env');
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('properties')
    .select('id, title, property_type, operation_type, city, description, amenities');
  if (error || !data) throw new Error(`properties: ${error?.message}`);

  let updated = 0;
  for (const row of data) {
    const embedding = await embedText(listingDocument(row), geminiKey, 'RETRIEVAL_DOCUMENT');
    if (!embedding) {
      console.warn(`⚠️  sin embedding: ${row.title}`);
      continue;
    }
    const { error: updateError } = await supabase.from('properties').update({ embedding }).eq('id', row.id);
    if (updateError) throw new Error(`${row.title}: ${updateError.message}`);
    updated += 1;
  }
  console.log(`🔁 ${updated}/${data.length} embeddings recalculados`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
