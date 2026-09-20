import { createClient } from 'jsr:@supabase/supabase-js@2';
import { embedText } from '../_shared/geminiEmbedding.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type PropertyType = 'Apartment' | 'Single Family' | 'Townhouse' | 'Studio' | 'Condo';
type OperationType = 'sale' | 'rent';

const MAX_PROPERTY_IMAGES = 10;

interface PropertyDraft {
  catastro?: string;
  title?: string;
  property_type?: PropertyType;
  operation_type?: OperationType;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  description?: string;
}

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'Single Family', 'Townhouse', 'Studio', 'Condo'];
const OPERATION_TYPES: OperationType[] = ['sale', 'rent'];

const REQUIRED_FIELDS: (keyof PropertyDraft)[] = [
  'catastro',
  'property_type',
  'operation_type',
  'price',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'address',
];

const TYPE_LABEL_ES: Record<PropertyType, string> = {
  Apartment: 'Piso',
  'Single Family': 'Casa',
  Townhouse: 'Casa adosada',
  Studio: 'Estudio',
  Condo: 'Condominio',
};

function generateTitle(draft: PropertyDraft): string {
  const typeLabel = draft.property_type ? TYPE_LABEL_ES[draft.property_type] : 'Propiedad';
  const opLabel = draft.operation_type === 'rent' ? 'en alquiler' : 'en venta';
  const location = draft.city ? ` en ${draft.city}` : '';
  return `${typeLabel} ${opLabel}${location}`.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const property: PropertyDraft = body?.property && typeof body.property === 'object' ? body.property : {};

    const missing_fields = REQUIRED_FIELDS.filter((field) => {
      const value = property[field];
      return value === undefined || value === null || value === '';
    });

    if (missing_fields.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', missing_fields }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PROPERTY_TYPES.includes(property.property_type as PropertyType)) {
      return new Response(
        JSON.stringify({ error: `Invalid property_type: ${property.property_type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPERATION_TYPES.includes(property.operation_type as OperationType)) {
      return new Response(
        JSON.stringify({ error: `Invalid operation_type: ${property.operation_type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof property.price !== 'number' || property.price <= 0) {
      return new Response(
        JSON.stringify({ error: 'price must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof property.square_meters !== 'number' || property.square_meters <= 0) {
      return new Response(
        JSON.stringify({ error: 'square_meters must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (property.images !== undefined) {
      if (!Array.isArray(property.images) || property.images.length > MAX_PROPERTY_IMAGES) {
        return new Response(
          JSON.stringify({ error: `images must be an array of at most ${MAX_PROPERTY_IMAGES} URLs` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (property.latitude !== undefined && (typeof property.latitude !== 'number' || property.latitude < -90 || property.latitude > 90)) {
      return new Response(
        JSON.stringify({ error: 'latitude must be between -90 and 90' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (property.longitude !== undefined && (typeof property.longitude !== 'number' || property.longitude < -180 || property.longitude > 180)) {
      return new Response(
        JSON.stringify({ error: 'longitude must be between -180 and 180' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured in Edge Function');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('catastro', property.catastro)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una propiedad registrada con esa referencia catastral' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';
    const embedding =
      property.description && hasGeminiKey
        ? await embedText(property.description, geminiKey!, 'RETRIEVAL_DOCUMENT')
        : null;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        catastro: property.catastro,
        title: property.title || generateTitle(property),
        property_type: property.property_type,
        operation_type: property.operation_type,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_meters: property.square_meters,
        city: property.city,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        description: property.description,
        status: 'Available',
        images: property.images || [],
        embedding,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Ya existe una propiedad registrada con esa referencia catastral' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Database insert error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ property: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [property-publish] Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error in property-publish Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
