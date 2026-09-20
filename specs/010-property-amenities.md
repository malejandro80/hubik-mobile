# RFC 010: Property Amenities & Characteristics

- **Author**: AI Agent (Claude Code)
- **Status**: Approved (implemented and deployed)
- **Created**: 2026-09-19
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
When registering a property, Don Carlos naturally mentions amenities and characteristics in
conversation ("tiene piscina y garaje", "está cerca de un colegio", "clima de montaña") but none of
this is captured today - `PropertyDraft`/`Property` have no field for it, `property-intake` doesn't
extract it, and `property-publish` doesn't store it. It's also unsearchable: a buyer asking "casas
con piscina" gets no structured filtering on amenities at all today.

There is no fixed, closed list of possible amenities - what matters depends on the property type
and the market, and open-ended contextual characteristics ("cerca de un colegio", "clima de
montaña") aren't enumerable at all. This RFC adds a single freeform `amenities` list captured
passively from whatever the user says during registration (not a dedicated Q&A step), confirmable
before publish, stored on the property, and usable both for exact-match search filtering and for
the app's existing semantic search - all within the project's "100% Supabase + Gemini" stack
(RFC 007/008 Non-Goals, reconfirmed here).

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] `properties.amenities TEXT[]` column, freeform (no server-side enum/vocabulary), normalized
      on write (lowercase/trim/dedupe), GIN-indexed for containment queries.
- [x] Amenities are extracted passively from any message during the registration chat (not a
      dedicated "what amenities does it have?" question), merged incrementally into the draft's
      running list as the conversation progresses - a later message never erases an amenity a
      prior message already established.
- [x] Before publish, a chip-based confirmation surface shows what was detected
      ("piscina", "garaje", "cerca de colegio"...) so the user can add/remove entries - this is
      also the mechanism for correcting a wrong/hallucinated extraction, so no separate
      error-handling path is needed for that.
- [x] Amenities are folded into the text passed to the embedding call at publish time, so
      open-ended/contextual entries ("clima de montaña") are matchable via the existing semantic
      search with zero new query logic.
- [x] Common/enumerable amenities (pool, garage, barbecue, elevator, A/C, security, gym...) are
      also usable as an exact structured filter in search (`amenities @> ARRAY[...]`), extracted
      from the search query the same cascaded way every other filter is today: cheap local
      keyword dictionary first, folded into the existing Gemini fallback call only when that
      dictionary doesn't resolve it - no new/extra LLM call added to the search path.

### Non-Goals (Out of Scope)
- No fixed/validated amenity vocabulary or enum. Values are freeform strings, normalized
  client/server-side; typos or near-duplicates across properties ("piscina" vs "alberca") are not
  reconciled in this RFC.
- No property-edit flow. Extraction is scoped to the initial registration chat only; there is no
  screen today to edit a property after publish, so re-extracting on a later description edit is
  out of scope until that flow exists.
- No changes to the existing hardcoded "nearby amenities" section on the property detail screen
  (`src/lib/propertyDetail.ts`'s `getNearbyAmenities`, `src/app/property/[id].tsx`'s
  `amenitiesCard`). That's unrelated decorative walking-distance content (pharmacy, supermarket,
  bus lines...) with its own hardcoded data, not sourced from `properties.amenities` - the naming
  is coincidentally similar but the two are not merged here to avoid conflating a display-only
  mock section with real per-property data.
- No backfill of `amenities` for already-published properties. New column defaults to `'{}'`,
  same precedent as `image_url`/`images`/`embedding` launching NULL/empty for pre-existing rows.
- No new AI vendor. Extraction reuses the existing Gemini (primary) / Groq (fallback) cascade
  already in `property-intake`; no dedicated amenities-only model or service.
- No UI/vocabulary curation per property type (e.g. "pool" suggested for houses, not studios).
  Chips shown are purely what was detected in conversation, not a suggested/browsable list.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Passive capture)**:
  - **Given** the user is mid-registration and says "tiene piscina, garaje y está cerca de un
    colegio" in any message, at any point in the conversation
  - **When** `property-intake` processes that message
  - **Then** `piscina`, `garaje`, and an entry capturing "cerca de un colegio" are added to the
    draft's `amenities` list, without requiring a dedicated question about amenities first.

- **Story 2 (Additive merge, not overwrite)**:
  - **Given** the draft already has `amenities: ["piscina"]` from an earlier message
  - **When** a later message mentions "garaje" but not "piscina" again
  - **Then** the draft's `amenities` becomes `["piscina", "garaje"]` - the earlier entry is never
    dropped just because a later message didn't repeat it.

- **Story 3 (Confirmation before publish)**:
  - **Given** the draft is ready to confirm (all required fields present)
  - **When** the confirmation summary is shown
  - **Then** detected amenities are shown as removable chips, and the user can also add one that
    was missed, before the property is actually inserted.

- **Story 4 (Structured search filter)**:
  - **Given** a published property has `amenities: ["piscina", "garaje"]`
  - **When** a buyer searches "casas con piscina"
  - **Then** the result set is filtered to properties whose `amenities` contains `piscina`
    (`@>` containment), not just ranked by semantic similarity.

- **Story 5 (Semantic fallback for the long tail)**:
  - **Given** a published property has `amenities: ["cerca de colegio", "clima de montaña"]`
  - **When** a buyer searches "algo tranquilo cerca de la naturaleza" (no exact tag match possible)
  - **Then** the property is still findable via the existing semantic ranking, because its
    amenities were folded into the embedded text at publish time.

---

## 4. Proposed Architecture & Public Contracts

### Data Model
```sql
-- New migration: supabase/migrations/20260919_add_property_amenities.sql
ALTER TABLE public.properties
  ADD COLUMN amenities TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_properties_amenities
  ON public.properties USING GIN (amenities);

-- match_properties_hybrid gains one new optional param (NULL = unfiltered, same pattern as
-- every other param on this RPC):
CREATE OR REPLACE FUNCTION public.match_properties_hybrid (
  query_embedding vector(768),
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_bedrooms int DEFAULT NULL,
  p_max_bedrooms int DEFAULT NULL,
  p_amenities text[] DEFAULT NULL,
  match_count int DEFAULT 10
)
RETURNS TABLE (..., amenities text[], ...)  -- existing columns + amenities passthrough
...
WHERE (...)
  AND (p_amenities IS NULL OR p.amenities @> p_amenities)
...
```
`match_properties` (the older, non-hybrid RPC) is left untouched, consistent with RFC 008 treating
it as superseded by `match_properties_hybrid` for anything beyond a pure vector-only lookup.

### Types
```typescript
// src/types/property.ts
export interface Property {
  // ...existing fields
  amenities: string[];
}

export interface PropertyDraft {
  // ...existing fields
  amenities?: string[];
}
```
`amenities` is deliberately **not** added to `REQUIRED_PROPERTY_DRAFT_FIELDS` - it never blocks
`ready_to_confirm`.

### Edge Functions

**`property-intake/index.ts`**
- `heuristicExtract` gains a small bilingual (ES/EN) keyword dictionary for the common,
  enumerable case (piscina/pool, garaje/garage, parrillera-barbacoa/barbecue, ascensor/elevator,
  aire acondicionado/A-C, seguridad/security, gimnasio/gym, terraza/balcón...), matched
  case-insensitively against the raw message - cheap, no LLM needed for the common vocabulary.
- `propertyIntakeTextInstruction`'s JSON schema gains one more optional key:
  `amenities (array of short strings, lowercase, e.g. ["piscina", "garaje", "cerca de un
  colegio"]; open-ended, not limited to a fixed list; include contextual/locational
  characteristics the user mentions, not just physical facilities)`.
- **Escalation condition changes.** Today, Gemini/Groq is only called while
  `REQUIRED_FIELDS.some(field => data[field] === undefined)` - once the draft is complete, no
  further LLM call happens, so an amenity mentioned after that point (e.g. "ah, y está cerca de un
  colegio" added once everything else is already known) would otherwise be silently lost since the
  local keyword dictionary can't parse open-ended phrasing. Fix: escalate to the LLM whenever
  required fields are missing (existing condition, full-field extraction) **or** whenever the
  message contains amenity-signal language the local dictionary didn't already fully resolve into
  a keyword hit (a cheap heuristic - e.g. verbs/phrases like "tiene", "cuenta con", "incluye",
  "cerca de", "con vista a" - used only to decide *whether* to call the LLM, not to do the
  extraction itself). When required fields are already complete, this second-mode call asks only
  for the `amenities` key (a leaner prompt) rather than the full schema, keeping the marginal cost
  small.
- **Merge semantics differ from every other field.** Every other field in
  `data = { ...data, ...llmExtracted }` is last-write-wins. `amenities` is append + normalize +
  dedupe instead: `data.amenities = normalizeAmenities([...(known.amenities ?? []),
  ...(heuristicHits ?? []), ...(llmExtracted?.amenities ?? [])])`, so a message that doesn't
  repeat an earlier amenity never drops it (Story 2).
- `sanitizeGeminiFields` gains handling for `amenities`: accept only an array, keep string
  entries, trim/lowercase each, drop empty/duplicate entries, cap each entry's length (~60 chars)
  and the array length (~20 entries) to bound what an LLM could otherwise stuff into a single
  response - defense-in-depth against a degenerate/adversarial completion, not a normal-path
  concern.

**`property-publish/index.ts`**
- Insert payload gains `amenities: property.amenities ?? []`.
- The text passed to `embedText(...)` for the embedding column becomes the description plus an
  explicit amenities clause when the list is non-empty, e.g.
  `` `${property.description}\n\nComodidades: ${property.amenities.join(', ')}` ``, computed at
  publish time regardless of whether `property-describe`'s generated prose already happened to
  mention some of them. This guarantees the embedding reflects the user's final, confirmed
  amenities list (post chip-edit) even if description generation ran earlier in the flow, without
  needing to regenerate/rewrite the stored `description` text itself.
- `src/services/chatApi.ts`'s `publishPropertyDirect` (local fallback insert, used when the edge
  function is unreachable) gets the same `amenities: draft.amenities || []` addition for parity.

**`property-describe/index.ts`**
- No code change needed: `propertyDescribeInstruction`'s `known` payload already passes through
  whatever draft fields the caller includes. Once the caller includes `amenities` in `known`, the
  existing "use EXCLUSIVELY the provided data, never invent amenities... if not present, don't
  mention it" instruction naturally lets Gemini truthfully weave confirmed amenities into the
  generated prose, since they're now genuinely present in the data.

**`chat-query/index.ts`** and its client twin **`src/services/chatApi.ts`**
- `parsePromptFilters` in both gains the same cheap local amenity-keyword dictionary as
  `property-intake`'s heuristic (kept in sync manually, same as the existing duplicated
  city/price/bedroom regexes between these two files - no shared module exists for this today, and
  introducing one is a larger refactor than this RFC's scope).
- `chatQueryTextInstruction()`'s JSON schema gains an `amenities` key, extracted only when the
  existing escalation condition already fires (`Object.keys(filters).length === 0 ||
  !filters.city`, unchanged) - no new/extra Gemini call. A query whose only unresolved content is
  an amenity phrase the local dictionary misses (and that doesn't otherwise trigger escalation)
  simply doesn't get a structured amenity filter; it still surfaces via the existing semantic
  ranking against the amenities-augmented embedding (Story 5) - an accepted trade-off, not a bug.
- The hybrid RPC call adds `p_amenities: filters.amenities ?? null`.
- `querySupabaseDirectly` (client-side direct-query fallback, used only when the edge function is
  unreachable) adds `amenities` to its `.select(...)` column list and applies
  `.contains('amenities', filters.amenities)` when present - same fallback-path parity precedent
  RFC 008 already established for city matching.

### Client
- New `src/components/AmenitiesConfirmation.tsx` (+ `.styles.ts`): chip list of detected
  amenities with a remove (×) affordance per chip and a small text input to add a missed one,
  rendered alongside (not merged into) `LivingDraftCard` once `ready_to_confirm` is true - kept as
  a separate component rather than extending `LivingDraftCard` itself, since `LivingDraftCard`'s
  contract (`missingFields`, `onSelectEnumOption`, ...) is specifically about the *required*
  field checklist, and amenities are neither required nor picker-driven. Deliberately named to
  avoid colliding with the unrelated existing `getNearbyAmenities`/`amenitiesCard` naming on the
  property detail screen (Non-Goals).
- `usePropertyRegistrationChat.ts`: draft state gains `amenities: string[]` (default `[]`),
  updated additively on each `property-intake` response the same way other fields are today;
  exposes an updater the new confirmation component calls when the user edits the list pre-publish.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- `amenities` values originate from user chat text (typed or transcribed) and/or an LLM
  completion derived from that text - both untrusted. Every entry is trimmed, lowercased, and
  length/array-capped in `sanitizeGeminiFields`/`normalizeAmenities` before it ever reaches the
  draft or the DB; no raw user string is interpolated into SQL (the RPC and insert both use bound
  parameters, same as every other field here).
- No new secrets, no new external service, no change to the property-publish authority model
  (still the sole write path enforcing validation, per RFC 004's existing principle).

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Gemini/Groq extraction call fails or returns malformed JSON for the amenities-only escalation | Fails open: draft's `amenities` stays whatever was already confirmed, nothing added this turn (same precedent as every other field's LLM-fallback failure) | 200 (degraded) |
| LLM returns a non-array or oversized `amenities` value | `sanitizeGeminiFields` drops/truncates it rather than throwing | 200 |
| `match_properties_hybrid`'s new `p_amenities` param errors (e.g. bad type) | Caught by the existing try/catch around the hybrid RPC call; falls back to the plain structured-filter query (amenities filter simply not applied) | 200 (degraded) |
| `querySupabaseDirectly` fallback path used (edge function unreachable) and `filters.amenities` present | `.contains(...)` applied the same as any other filter; no special-case failure beyond the existing fallback's own error handling | 200 |

---

## 6. Verification & Test Plan
- [x] Unit Test: `normalizeAmenities`/merge logic (append, dedupe, trim, lowercase, length caps,
      never drops an existing entry when a new message doesn't repeat it) -
      `src/lib/__tests__/amenities.test.ts`.
- [x] Unit Test: local amenity-keyword heuristic (client copy tested directly in
      `src/lib/__tests__/amenities.test.ts`; the edge-function copy in
      `supabase/functions/_shared/amenities.ts` is intentionally identical logic, not
      independently unit-tested - see the Deno gap below) plus `parsePropertyDraft`/
      `parsePromptFilters` integration coverage in `src/services/__tests__/chatApi.test.ts`
      (additive merge across turns, `.contains('amenities', ...)` wiring on the direct-query
      fallback).
- [x] Unit Test: `AmenitiesConfirmation` component (add/remove chip interactions, empty state,
      duplicate/empty-input rejection) - `src/components/__tests__/AmenitiesConfirmation.test.tsx`.
- [x] Regression: `npm run typecheck` (clean), `npm run lint` (0 errors, 5 pre-existing warnings
      unrelated to this change), `npm test` (31 suites / 216 tests passing, up from 29/194).
- [ ] Deno unit tests for the Edge Function branches - **not planned**, matching the documented
      repo-wide gap already noted in RFC 005/006/007/008 (no Deno test runner here).
- [x] Manual `curl` verification against the deployed functions (migration applied,
      `property-intake` v15/`property-publish` v5/`chat-query` v12 live): confirmed
      `property-intake` extracts local-dictionary + Gemini amenities in one call, merges
      additively, and correctly escalates for amenity-only follow-ups after the draft is already
      `ready_to_confirm`; confirmed `chat-query`'s `"casas con piscina"` returns
      `applied_filters.amenities: ["piscina"]` and runs cleanly through `match_properties_hybrid`'s
      new `p_amenities` param. `property-publish`'s insert path was deliberately NOT curl-tested
      live (would write a real row into the production `properties` table).
- [ ] Manual on-device (real app, not curl): register a property mentioning amenities
      mid-conversation, confirm/edit the pre-publish chip list, publish, then search for it both by
      an exact amenity term and a rephrased contextual query. **Not done this session** - the
      client UI (`AmenitiesConfirmation`, the registration hook wiring) hasn't been exercised on a
      device yet, only unit-tested and curl-verified at the API layer.
