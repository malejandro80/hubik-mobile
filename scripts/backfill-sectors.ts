import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { extractSector } from '../supabase/functions/_shared/sector';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const geminiKey = process.env.GEMINI_API_KEY ?? '';

async function main() {
  if (!supabaseUrl || !serviceRoleKey || !geminiKey) {
    throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o GEMINI_API_KEY en .env');
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await supabase.from('properties').select('id, title, address, city').is('sector', null);
  if (error || !data) throw new Error(`properties: ${error?.message}`);

  let updated = 0;
  for (const row of data) {
    const sector = await extractSector({ address: row.address, title: row.title, city: row.city }, geminiKey);
    if (!sector) {
      console.warn(`⚠️  sin sector: ${row.title}`);
      continue;
    }
    const { error: updateError } = await supabase.from('properties').update({ sector }).eq('id', row.id);
    if (updateError) throw new Error(`${row.title}: ${updateError.message}`);
    console.log(`📍 ${row.title} → ${sector}`);
    updated += 1;
  }
  console.log(`📍 ${updated}/${data.length} sectores asignados`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
