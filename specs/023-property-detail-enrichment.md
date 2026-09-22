# RFC 023: Property Detail Page Enrichment & Address Privacy

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-22
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
The property detail page (`src/app/property/[id].tsx`) shows the same generic bedroom/bathroom/m² facts for every listing regardless of property type, gives no visual weight to who's listing it, and — more seriously — exposes the exact street address and precise coordinates to every viewer: a signed-in client, an agent from a *different* agency, or an anonymous visitor following a public share link (RFC 019/020). Today's `properties` RLS policy is `USING (true)` for `anon` and `authenticated` alike, so this isn't a UI oversight — the raw address is already retrievable by anyone who can reach Supabase's REST API, regardless of what the app's screens render. A client (or a competing agent) can walk straight to the property without ever contacting the listing agency, which defeats the point of the agency-mediated flow this app is built around.

Scoped with the `scope` skill (two rounds of questions, transcript in this session's `.agents/state/session-log.md`); the human approved the resulting brief before this RFC was written.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] A compact stats/spec bar near the top of the detail page shows key facts (bedrooms, bathrooms, m², property type, operation type) driven by a per-`PropertyType` field config, not hardcoded conditionals — so adding a new type later (Comercial, Terreno, ...) is a config addition, not a rewrite.
- [x] Price display adapts for rent vs sale (a "/mes" suffix for rentals).
- [x] An agent/agency info card renders near the contact button, reusing the `agency_name`/`agent_name` already on `Property` - no new data source.
- [x] The exact street address and precise `latitude`/`longitude` are withheld **at the data-fetching layer** for every read path a client-role user or an anonymous/public visitor can reach - not just hidden in the UI. Those viewers get `city` plus an approximate, deterministically-offset map pin; no address text, no precise coordinates, anywhere in the network response.
- [x] An agent or owner who belongs to the listing's own agency keeps exact address and coordinates, unchanged from today.
- [x] The masking holds even if application code queries the underlying `properties` table directly instead of going through `property_listings` (defense in depth, matching this repo's existing principle from RFC 006 that the app layer is never the sole enforcement point).

### Non-Goals (Out of Scope)
- New `PropertyType` values (Comercial, Terreno, Local, etc.) and their type-specific stat fields (lot size, floor, zoning...). The stats-bar config is built to make adding them a small follow-up, but no new type ships in this RFC.
- Reviews, house-rules-style content, an availability calendar, or a fully interactive (pannable/zoomable, directions) map. The map need here is limited to rendering a single pin (exact or jittered) for the stats/location area.
- Restricting *which rows* a client can see (row-level property visibility). Every published listing stays discoverable by everyone; only the address/coordinate *columns* are masked.
- Changing `agency.tsx`'s existing owner-only `canViewAgencyListings` capability. Today only `owner` (not `agent`) can reach that screen; this RFC doesn't change who can reach it, only what the shared masking logic returns to whoever does.
- Persisting the draft's `currency` to the `properties` table (flagged as a follow-up in the prior session's log entry) - unrelated to this RFC.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Client browsing search results)**
  - **Given** a signed-in user with the `client` role searches for properties
  - **When** they open a listing's detail page
  - **Then** they see a stats bar, an agent/agency card, and the listing's city, but no street address anywhere on screen or in the underlying network response; the map pin shown is offset from the real location.

- **Story 2 (Anonymous visitor on a shared link)**
  - **Given** someone with no Hubik account opens a `/p/<slug>` shared listing link (RFC 019/020)
  - **When** the page loads
  - **Then** the same masking applies as Story 1 - the public share page was already running with the anon key and no session, so this requires no client-side role branching, only the shared data layer to mask correctly for an unauthenticated caller.

- **Story 3 (Agent viewing their own agency's listing)**
  - **Given** a signed-in `agent` or `owner` whose `profiles.agency_id` matches the listing's `agency_id`
  - **When** they open that listing's detail page
  - **Then** they see the exact address and exact coordinates, unchanged from today's behavior.

- **Story 4 (Agent viewing a different agency's listing)**
  - **Given** a signed-in `agent` whose agency does **not** match the listing's `agency_id`
  - **When** they open that listing
  - **Then** they are treated like a client - masked address, offset pin - since cross-agency address visibility was never part of the approved scope.

- **Story 5 (Bypassing the view)**
  - **Given** `src/services/chatApi.ts`'s `querySupabaseDirectly` fallback (used only when the `chat-query` Edge Function is unreachable) runs
  - **When** it queries for listings
  - **Then** it still cannot retrieve the real address/coordinates for a masked viewer, because direct column access to `properties.address/latitude/longitude` is revoked at the database level for `anon`/`authenticated` - the only path to those columns is the masking functions described below.

- **Story 6 (Rent vs sale price)**
  - **Given** a listing with `operation_type = 'rent'`
  - **When** its price renders
  - **Then** the price string ends with "/mes"; a `sale` listing's price has no suffix.

---

## 4. Proposed Architecture & Public Contracts

### Data Model / Database

**New SQL functions** (migration `supabase/migrations/20260922_property_address_privacy.sql`), matching this repo's existing `SECURITY DEFINER` + `SET search_path = ''` convention (`supabase/migrations/20260922_client_search.sql`):

```sql
-- Deterministic ~300m jitter, same output every time for the same (property id, axis) pair,
-- so a masked pin doesn't visibly jump between page loads. No PostGIS in this project - plain
-- arithmetic on the existing double precision lat/lng columns.
CREATE OR REPLACE FUNCTION public.jitter_coordinate(p_id uuid, p_seed text, p_base double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_base IS NULL THEN NULL ELSE
    p_base + ((abs(('x' || substr(md5(p_id::text || p_seed), 1, 8))::bit(32)::int) % 601) - 300) / 100000.0
  END;
$$;

-- Caller identity check only (no property data touched here) - true when the current
-- authenticated user is an agent/owner of the given agency.
CREATE OR REPLACE FUNCTION public.viewer_has_agency_access(p_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.user_id = auth.uid()
      AND pr.role IN ('agent', 'owner')
      AND pr.agency_id = p_agency_id
  );
$$;
REVOKE ALL ON FUNCTION public.viewer_has_agency_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.viewer_has_agency_access(uuid) TO anon, authenticated;

-- Elevated readers: each always has access to the real column internally (SECURITY DEFINER),
-- and returns the real value only when viewer_has_agency_access allows it - masked/jittered
-- otherwise. These, not the raw columns, are the only path anon/authenticated get to
-- address/latitude/longitude (see the REVOKE below).
CREATE OR REPLACE FUNCTION public.masked_property_address(p_id uuid, p_agency_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.viewer_has_agency_access(p_agency_id)
    THEN (SELECT address FROM public.properties WHERE id = p_id)
    ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.masked_property_latitude(p_id uuid, p_agency_id uuid)
RETURNS double precision
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.viewer_has_agency_access(p_agency_id)
    THEN (SELECT latitude FROM public.properties WHERE id = p_id)
    ELSE public.jitter_coordinate(p_id, 'lat', (SELECT latitude FROM public.properties WHERE id = p_id))
  END;
$$;

CREATE OR REPLACE FUNCTION public.masked_property_longitude(p_id uuid, p_agency_id uuid)
RETURNS double precision
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.viewer_has_agency_access(p_agency_id)
    THEN (SELECT longitude FROM public.properties WHERE id = p_id)
    ELSE public.jitter_coordinate(p_id, 'lng', (SELECT longitude FROM public.properties WHERE id = p_id))
  END;
$$;

REVOKE ALL ON FUNCTION public.masked_property_address(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.masked_property_latitude(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.masked_property_longitude(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.masked_property_address(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.masked_property_latitude(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.masked_property_longitude(uuid, uuid) TO anon, authenticated;

-- The actual lockdown: anon/authenticated lose direct column access to the sensitive columns.
-- Every other column keeps its existing grant (unaffected).
REVOKE SELECT (address, latitude, longitude) ON public.properties FROM anon, authenticated;

-- property_listings now calls the masking functions instead of passing the columns through.
-- Still security_invoker = true (unchanged) - the functions themselves are SECURITY DEFINER,
-- which is what gives them elevated read access regardless of the invoking role.
CREATE OR REPLACE VIEW public.property_listings WITH (security_invoker = true) AS
SELECT
  p.id, p.title, p.property_type, p.operation_type, p.price, p.bedrooms, p.bathrooms,
  p.square_meters, p.city,
  public.masked_property_address(p.id, p.agency_id) AS address,
  public.masked_property_latitude(p.id, p.agency_id) AS latitude,
  public.masked_property_longitude(p.id, p.agency_id) AS longitude,
  p.description, p.status, p.image_url, p.images, p.amenities, p.embedding, p.created_at,
  p.agency_id, p.created_by,
  a.name AS agency_name,
  ap.display_name AS agent_name
FROM public.properties p
JOIN public.agencies a ON a.id = p.agency_id
LEFT JOIN public.agents_public ap ON ap.user_id = p.created_by;
```

Why this shape, not a simpler RLS policy: RLS filters *rows*, not *columns*, and every listing must stay visible to everyone (Non-Goal above) - only two columns need hiding. Postgres also has no per-app-role distinction at the database-role level (`anon`/`authenticated` are the only DB roles; `client`/`agent`/`owner` is an app-level `profiles.role` column) - column-level `GRANT`/`REVOKE` can't itself be role-aware, so the actual role check has to live inside a function. `SECURITY DEFINER` on the three `masked_*` functions is required so they can always read the real column internally regardless of the revoked grant, while still deciding per-caller what to return - the same trusted-narrow-function pattern this repo already uses for `search_agent_candidates`/`add_agent_by_id`.

### Client-side field config (extensible per property type)

`src/lib/propertyStats.ts` (new):
```typescript
export interface PropertyStatField {
  key: 'bedrooms' | 'bathrooms' | 'square_meters';
  icon: keyof typeof Ionicons.glyphMap;
  label: (value: string) => string;
}

// One entry per PropertyType. Every current type uses the same three stats; a future type
// (e.g. Terreno) adds its own entry here (e.g. just a lot-size field, no bedrooms/bathrooms)
// without touching the render code in [id].tsx.
export const PROPERTY_TYPE_STATS: Record<PropertyType, PropertyStatField[]> = {
  Apartment: DEFAULT_RESIDENTIAL_STATS,
  'Single Family': DEFAULT_RESIDENTIAL_STATS,
  Townhouse: DEFAULT_RESIDENTIAL_STATS,
  Studio: DEFAULT_RESIDENTIAL_STATS,
  Condo: DEFAULT_RESIDENTIAL_STATS,
};

export function getStatsForType(type?: PropertyType): PropertyStatField[];
```

`[id].tsx` renders `getStatsForType(params.property_type)` as a row of icon+value chips instead of any hardcoded bed/bath/sqm JSX, reading each field's value off `params` by `key`.

### Detail screen changes (`src/app/property/[id].tsx`)

- New stats bar section using the config above.
- New agent/agency card (icon-circle initial, name, agency) placed near the contact button, replacing the current plain `listing-attribution` text line.
- `formatPrice(price, currency, operationType)` gains a third parameter; appends "/mes" (labels-driven, not hardcoded per call site) when `operationType === 'rent'`.
- Address rendering: if `params.address` is present, render it as today; if absent (masked), render `labels.propertyDetail.approximateLocation` ("Ubicación aproximada") instead of the address line, and always render a small read-only map pin using `params.lat`/`params.lng` (real or jittered - the screen doesn't know or care which, it just renders whatever coordinates it received).
- A minimal read-only map pin view is the only new map surface added - no pan/zoom/directions (Non-Goal).

### Edge Function / fetch changes

- `supabase/functions/chat-query/index.ts`: the query that returns listings (`property_listings` select and the `match_properties_hybrid` RPC call) must run as the caller's own identity, not the service-role key, so `auth.uid()` inside `viewer_has_agency_access` resolves correctly. A second Supabase client is built with the anon key plus the incoming request's `Authorization` header (empty/absent is fine - it just resolves to `anon`, i.e. masked) and used only for that query; `fetchKnownCities` and other non-sensitive lookups keep using whichever key they use today.
- `src/services/chatApi.ts`'s `querySupabaseDirectly` fallback: change its `.from('properties')` to `.from('property_listings')` (same column list otherwise) - this fixes the one path the research for this RFC found bypassing the view entirely, and is required in addition to (not instead of) the database-level `REVOKE`, since a table-level revoke alone would turn this fallback's existing query into an error rather than a masked result.
- `src/services/sharedProperty.ts`, `src/services/authApi.ts` (`fetchAgencyListings`): no code change - both already read through `property_listings` using the caller's own session (or no session, for the public share page), so they inherit the masking automatically once the view/functions above are in place.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- The masking decision (`viewer_has_agency_access`) is entirely server-side, keyed off `auth.uid()` from the caller's verified JWT - never trusts a client-supplied role or agency id.
- `SECURITY DEFINER` functions are the narrowest possible: each takes only the IDs needed, returns only what it's designed to return (a boolean, or one already-decided column value), and is not itself a general-purpose data access point. `search_path = ''` is pinned on every one, matching this repo's existing convention, so they can't be tricked by a session-local `search_path` override.
- Column-level `REVOKE` on `properties.address/latitude/longitude` is the actual enforcement boundary - even a future engineer (or agent) adding a new direct `properties` query gets a Postgres permission error on those columns instead of silently leaking them, rather than relying on every call site remembering to use the view.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Any future code selects `properties.address/latitude/longitude` directly with the anon/authenticated key | Postgres rejects the column reference | `42501 insufficient_privilege` (surfaces as a Supabase/PostgREST error to the caller - a visible failure, not a silent leak) |
| `chat-query`'s caller sends no `Authorization` header (anonymous search) | `auth.uid()` is `NULL` inside `viewer_has_agency_access`, `EXISTS` is false | 200, masked address/coordinates - same as a client, by design |
| An agent's `profiles.agency_id` doesn't match the listing's `agency_id` | Same as above - `EXISTS` false | 200, masked (Story 4) |
| `latitude`/`longitude` are `NULL` on the row (no pin set yet) | `jitter_coordinate` returns `NULL` unchanged; masking functions return `NULL` either way | 200, no pin rendered (screen falls back to no-map state) |

---

## 6. Verification & Test Plan
- [ ] Unit Test: `getStatsForType` returns the same three-field config for every current `PropertyType`.
- [ ] Unit Test: `formatPrice` appends "/mes" only when `operation_type === 'rent'`, for every currency branch.
- [ ] Unit Test: `[id].tsx` renders the approximate-location copy and a jittered pin when `address` is absent from params; renders the real address when present. (The screen itself is intentionally naive here - see below.)
- [ ] Integration/manual (Supabase MCP `execute_sql`, post-deploy): as an anon/masked caller, `select * from property_listings` returns `address/latitude/longitude` as `NULL`/jittered for a listing belonging to another agency, and the real values for a caller whose `profiles.agency_id` matches; a direct `select address from properties` as `anon`/`authenticated` fails with `42501`.
- [ ] Regression: `npm run typecheck`, `npm run lint`, `npm test` all green; existing RFC 015 (preview), RFC 019/020 (shared page), RFC 011 (roles) flows unaffected for the always-privileged draft-preview path (which never touches the DB - `buildDraftPreviewProperty` builds a `Property` straight from local draft state, so it's unaffected by any of this).
