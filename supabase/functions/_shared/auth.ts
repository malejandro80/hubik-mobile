import { createClient } from 'jsr:@supabase/supabase-js@2';
import { decideAgentAccess } from './agentAccess.ts';

export interface AgentIdentity {
  userId: string;
  agencyId: string;
}

const BEARER_PREFIX = /^Bearer\s+/i;

export async function requireAgent(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<AgentIdentity | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables not configured in Edge Function');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const token = (req.headers.get('Authorization') ?? '').replace(BEARER_PREFIX, '');

  let userId: string | null = null;
  if (token) {
    const { data } = await admin.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  let profile: { role: string; agency_id: string | null } | null = null;
  if (userId) {
    const { data, error } = await admin
      .from('profiles')
      .select('role, agency_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`Profile lookup failed: ${error.message}`);
    profile = data;
  }

  const decision = decideAgentAccess(userId, profile);
  if (!decision.allowed) {
    return new Response(JSON.stringify({ error: decision.error }), {
      status: decision.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { userId: decision.userId, agencyId: decision.agencyId };
}
