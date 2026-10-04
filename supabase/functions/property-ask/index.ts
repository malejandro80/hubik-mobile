import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { requireUser } from '../_shared/auth.ts';
import { AppError, ErrorCode, handleErrorResponse } from '../_shared/errorFacade.ts';
import { geminiGenerateJson } from '../_shared/geminiFacade.ts';
import { promptGuard } from '../_shared/promptGuardProvider.ts';
import { propertyAskInstruction } from '../_shared/prompts.ts';
import {
  AskOutcome,
  AskRequest,
  AskTarget,
  buildAskPrompt,
  comparableFacts,
  listingFacts,
  parseAskOutcome,
  parseAskRequest,
} from '../_shared/propertyAsk.ts';
import {
  ASK_BLOCKED,
  ASK_REFUSAL,
  ASK_SURFACE,
  ASK_TIMEOUT_MS,
  ASK_UNAVAILABLE,
  COMPARABLE_FETCH_COUNT,
  LISTING_CONTEXT_COLUMNS,
  MAX_CLARIFICATION_ROUNDS,
  PROPERTY_ASK_MODEL,
} from '../_shared/propertyAskConstants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const refusal = (answer: string): AskOutcome => ({ type: 'answer', answer, refused: true });

const requestContext = (request: AskRequest): string[] =>
  [...request.history, ...request.clarifications].flatMap((turn) => [turn.question, turn.answer]);

async function recordSecurityEvent(userId: string, category: string): Promise<void> {
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  await admin
    .from('ai_security_events')
    .insert({ user_id: userId, surface: ASK_SURFACE, category })
    .then(() => undefined, () => undefined);
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function loadListing(client: SupabaseClient, target: AskTarget): Promise<Record<string, unknown> | null> {
  if (target.kind === 'listing') {
    const { data, error } = await client.from('property_listings').select(LISTING_CONTEXT_COLUMNS).eq('id', target.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.rpc('get_shared_listing', { p_token: target.token });
  if (error) throw error;
  return Array.isArray(data) ? (data[0] ?? null) : null;
}

async function loadComparables(client: SupabaseClient, listing: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const { data, error } = await client.rpc('search_listings', {
    p_city: listing.city,
    p_property_type: listing.property_type,
    p_operation_type: listing.operation_type ?? null,
    match_count: COMPARABLE_FETCH_COUNT,
  });
  return error || !Array.isArray(data) ? [] : data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStart = Date.now();

  try {
    const identity = await requireUser(req, corsHeaders);
    if (identity instanceof Response) return identity;

    const request = parseAskRequest(await req.json().catch(() => null));
    if (!request) throw AppError.badRequest('Pregunta inválida');

    const verdict = await promptGuard.inspect({ question: request.question, context: requestContext(request) });
    if (!verdict.allowed && verdict.reason === 'threat') {
      await recordSecurityEvent(identity.userId, verdict.category);
      return json(refusal(ASK_BLOCKED));
    }
    if (!verdict.allowed) return json(refusal(ASK_REFUSAL));

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw AppError.upstream(ASK_UNAVAILABLE);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const listing = await loadListing(client, request.target);
    if (!listing) throw AppError.notFound('Propiedad no encontrada');

    const self = request.target.kind === 'listing' ? { id: request.target.id } : { title: listing.title, price: listing.price };
    const comparables = comparableFacts(await loadComparables(client, listing), self);
    const mustAnswer = request.clarifications.length >= MAX_CLARIFICATION_ROUNDS;

    const outcome = await geminiGenerateJson<AskOutcome>({
      model: PROPERTY_ASK_MODEL,
      key: geminiKey,
      prompt: buildAskPrompt({
        question: request.question,
        listing: listingFacts(listing),
        comparables,
        history: request.history,
        clarifications: request.clarifications,
        mustAnswer,
      }),
      systemInstruction: propertyAskInstruction(),
      timeoutMs: ASK_TIMEOUT_MS,
      logTag: 'property-ask',
      parser: (text) => parseAskOutcome(text, mustAnswer),
    });

    if (!outcome) throw AppError.upstream(ASK_UNAVAILABLE);
    return json(outcome);
  } catch (error: unknown) {
    return handleErrorResponse(error, {
      logTag: 'property-ask',
      corsHeaders,
      requestStart,
      fallbackCode: ErrorCode.INTERNAL_SERVER_ERROR,
      fallbackMessage: ASK_UNAVAILABLE,
    });
  }
});
