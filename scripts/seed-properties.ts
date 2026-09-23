import { randomBytes } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { embedText } from '../supabase/functions/_shared/geminiEmbedding';
import { listingDocument } from '../supabase/functions/_shared/listingDocument';
import { EXISTING_AGENTS, SEED_AGENCIES, SEED_AGENTS } from './seed/valenciaAgencies';
import { SEED_CITY, SEED_LISTINGS, SeedListing } from './seed/valenciaListings';
import { seedPhotos } from './seed/valenciaPhotos';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wbzfeqzvwfglirwlpzpy.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const geminiKey = process.env.GEMINI_API_KEY ?? '';

type AgentRef = { userId: string; agencyId: string };

async function seedAgencies(supabase: SupabaseClient) {
  const { error } = await supabase.from('agencies').upsert(SEED_AGENCIES, { onConflict: 'id' });
  if (error) throw new Error(`agencies: ${error.message}`);
  console.log(`🏢 ${SEED_AGENCIES.length} inmobiliarias listas`);
}

async function findUserIdByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data.users.find((user) => user.email === email)?.id ?? null;
}

async function seedAgents(supabase: SupabaseClient): Promise<Record<string, AgentRef>> {
  const refs: Record<string, AgentRef> = { ...EXISTING_AGENTS };

  for (const agent of SEED_AGENTS) {
    let userId = await findUserIdByEmail(supabase, agent.email);
    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: agent.email,
        password: randomBytes(24).toString('base64url'),
        email_confirm: true,
        user_metadata: { full_name: agent.displayName },
      });
      if (error || !data.user) throw new Error(`createUser ${agent.email}: ${error?.message}`);
      userId = data.user.id;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: userId, role: agent.role, agency_id: agent.agencyId, display_name: agent.displayName },
        { onConflict: 'user_id' }
      );
    if (error) throw new Error(`profile ${agent.email}: ${error.message}`);

    refs[agent.key] = { userId, agencyId: agent.agencyId };
  }

  console.log(`👤 ${SEED_AGENTS.length} agentes listos`);
  return refs;
}

async function toRow(listing: SeedListing, index: number, agent: AgentRef) {
  const photoSet = listing.type === 'Apartment' || listing.type === 'Studio' ? 'apartment' : 'house';
  const images = seedPhotos(photoSet, index);
  const textToEmbed = listingDocument({
    title: listing.title,
    property_type: listing.type,
    operation_type: listing.operation,
    city: SEED_CITY,
    description: listing.description,
    amenities: listing.amenities,
  });
  const embedding = geminiKey ? await embedText(textToEmbed, geminiKey, 'RETRIEVAL_DOCUMENT') : null;

  return {
    catastro: `VAL-2026-${String(index + 1).padStart(4, '0')}`,
    title: listing.title,
    property_type: listing.type,
    operation_type: listing.operation,
    price: listing.price,
    currency: 'USD',
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    square_meters: listing.squareMeters,
    city: SEED_CITY,
    address: `${listing.street}, ${listing.sector}`,
    latitude: listing.latitude,
    longitude: listing.longitude,
    description: listing.description,
    status: 'Available',
    images,
    image_url: images[0],
    amenities: listing.amenities,
    embedding,
    agency_id: agent.agencyId,
    created_by: agent.userId,
  };
}

async function seedListings(supabase: SupabaseClient, agents: Record<string, AgentRef>) {
  const rows = [];
  for (const [index, listing] of SEED_LISTINGS.entries()) {
    const agent = agents[listing.agent];
    if (!agent) throw new Error(`Agente desconocido: ${listing.agent}`);
    rows.push(await toRow(listing, index, agent));
  }

  const { data, error } = await supabase
    .from('properties')
    .upsert(rows, { onConflict: 'catastro' })
    .select('title, operation_type, price');
  if (error) throw new Error(`properties: ${error.message}`);

  const withEmbedding = rows.filter((row) => row.embedding).length;
  console.log(`🏠 ${data.length} propiedades en ${SEED_CITY} (${withEmbedding} con embedding)`);
  data.forEach((p) => console.log(`  - [${p.operation_type}] ${p.title} ($${Number(p.price).toLocaleString()})`));
}

async function seed() {
  if (!serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno');
  }
  console.log(`🌱 Seed de ${SEED_CITY}, Venezuela en ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  await seedAgencies(supabase);
  const agents = await seedAgents(supabase);
  await seedListings(supabase, agents);
}

seed().catch((err) => {
  console.error('❌ Seed fallido:', err.message);
  process.exit(1);
});
