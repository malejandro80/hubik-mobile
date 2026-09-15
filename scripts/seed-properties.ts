import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { MOCK_PROPERTIES } from './mockProperties';

dotenv.config();

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://wbzfeqzvwfglirwlpzpy.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

async function seed() {
  console.log(`🌱 [seed] Initializing properties seed on: ${supabaseUrl}`);
  if (!supabaseKey) {
    console.warn(
      '⚠️ [seed] No Supabase key found in environment. Please set EXPO_PUBLIC_SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY.'
    );
    console.log(`ℹ️ [seed] Available mock rows in local dataset: ${MOCK_PROPERTIES.length}`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`📦 [seed] Upserting ${MOCK_PROPERTIES.length} properties...`);
  const { data, error } = await supabase
    .from('properties')
    .upsert(MOCK_PROPERTIES, { onConflict: 'id' })
    .select('id, title, city, price');

  if (error) {
    console.error('❌ [seed] Error seeding properties table:', error.message);
    console.log(
      '💡 Note: Ensure migration "20260914_create_properties_and_vector.sql" has been executed in your Supabase SQL Editor.'
    );
  } else {
    console.log(`✅ [seed] Successfully seeded ${data.length} properties:`);
    data.forEach((p) => console.log(`  - [${p.city}] ${p.title} ($${Number(p.price).toLocaleString()})`));
  }
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
