# RFC 008: Cascading Search & Intake Efficiency

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-18
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Search (`chat-query`) and property intake (`property-intake`) always call Gemini even when the
existing local heuristic (`parsePromptFilters` / `heuristicExtract`) already resolved the message
on its own, and the audio path always asks Gemini to transcribe *and* extract fields in a single
call. Both cost more tokens/latency than necessary on the common case (an explicit, well-formed
message or voice note). Separately, `chat-query`'s search only uses semantic similarity as an
all-or-nothing fallback when structured filters return zero rows, so a query mixing a hard filter
(a city) with a concept ("luminoso", "cerca de un parque") never gets concept-aware ranking. This
RFC cascades both pipelines through cheaper tiers before reaching for a full Gemini call, adds a
combined relational+semantic search RPC, and makes the registration flow's progress visible
without adding new chat turns — all within the project's existing Gemini + Supabase stack.

This was scoped down from a much larger pasted task spec that additionally asked for on-device STT
and new AI vendors (Groq, Cloudflare Workers AI, OpenAI) and a `vector(1536)` embedding column.
Both were explicitly declined by the user before implementation — see Non-Goals.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Audio search/intake transcribes first, then reuses the same local heuristic text already
      uses, before spending a second Gemini call on extraction.
- [x] Text search/intake skips the Gemini refinement call entirely when the heuristic already
      resolved the message.
- [x] Extraction/classification Gemini calls (search filters, property fields) move from
      `gemini-2.5-flash` to `gemini-2.5-flash-lite` — cheaper/faster, and pre-empts
      `gemini-2.5-flash`'s 2026-10-16 shutdown for these highest-volume call sites. Audio
      transcription stays on `gemini-2.5-flash` - see the 2026-09-18 amendment below.
- [x] New `match_properties_hybrid` RPC combines relational filters and vector similarity ranking
      in one query, replacing the current two-step "structured, then pure-semantic fallback".
- [x] A `LivingDraftCard` shows the registration draft's known/missing fields visually, with
      tappable chips for missing fields, instead of only a repeated text message.
- [x] Bulk voice intake ("describe the whole property in one note") is surfaced in the prompt copy
      — the underlying merge logic already supports it (RFC 004/005/006), nothing to build there.

### Non-Goals (Out of Scope)
- On-device speech-to-text. Already rejected in RFC 005 for New-Architecture-compatibility risk;
  reconfirmed here — no `expo-speech-recognition` / `@react-native-voice/voice`.
- Any vendor other than Gemini + Supabase (no Groq, Cloudflare Workers AI, OpenAI). This project is
  explicitly "100% Supabase" (RFC 007) plus Gemini for all AI calls.
- Changing the `embedding` column to `vector(1536)`. Stays `vector(768)`, matching the
  `gemini-embedding-001` migration from RFC 004's 2026-09-17 amendment (sessions 037/038),
  verified live minutes before this RFC was written.
- Hard `<200ms` / `>85% token reduction` guarantees. Real network round-trips to Postgres/Edge
  Functions make a hard latency gate unrealistic to promise; this RFC reports structural savings
  (fewer/smaller calls) instead of a fabricated benchmark number.
- Migrating `property-describe`'s generation call off `gemini-2.5-flash`. Left as a follow-up
  before 2026-10-16 — creative writing quality on `flash-lite` wasn't evaluated here, and that
  call site is much lower-volume (once per registration) than search/intake extraction.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Cheap audio search)**:
  - **Given** the user says a clear, explicit voice search query
  - **When** `chat-query` processes it
  - **Then** Gemini is called once for transcription (no field-extraction JSON in that call); the
    local heuristic resolves the filters from the transcript, same as if it had been typed.

- **Story 2 (Skip redundant text refinement)**:
  - **Given** a typed message the heuristic fully resolves (e.g. "pisos en Madrid bajo 300000")
  - **When** `chat-query` processes it
  - **Then** no Gemini call is made at all for filter extraction.

- **Story 3 (Hybrid ranking)**:
  - **Given** a query with both a hard filter and a concept (e.g. "piso luminoso en Valencia")
  - **When** the structured filter (city=Valencia) matches multiple rows
  - **Then** results are ranked by semantic similarity to "luminoso" among the city-matching rows,
    not returned in plain price order as today.

- **Story 4 (Visible draft progress)**:
  - **Given** the user is mid-registration with some fields already known
  - **When** they view the chat
  - **Then** `LivingDraftCard` shows known fields checked and missing ones as tappable chips,
    without needing to re-read a text paragraph to know what's left.

---

## 4. Proposed Architecture & Public Contracts

### Edge Functions
- `_shared/geminiAudio.ts`: `transcribeAndExtractFromAudio` gains a transcribe-only mode (the
  caller's `systemInstruction` controls whether extraction fields are requested at all - no new
  exported function needed, just a leaner instruction from `_shared/prompts.ts` for the first
  pass).
- `chat-query/index.ts`, `property-intake/index.ts`: both gain a cheap-tier check
  (`Object.keys(filters).length > 0` / `missing_fields.length === 0` after the heuristic pass)
  that skips the Gemini refinement call when satisfied.
- `_shared/prompts.ts`: extraction/transcription instructions unchanged in content; their call
  sites switch the model string to `gemini-2.5-flash-lite`.
- New `_shared` helper is not needed for the hybrid RPC - `chat-query` calls
  `supabase.rpc('match_properties_hybrid', {...})` directly, same as it already calls
  `match_properties`.

### Data Model
```sql
-- match_properties_hybrid(query_embedding vector(768), p_city text, p_property_type text,
--   p_min_price numeric, p_max_price numeric, p_min_bedrooms int, match_count int)
-- Optional relational filters (NULL = unfiltered) combined with ORDER BY embedding <=> query_embedding.
-- Reuses the existing `embedding` column and its HNSW index - no schema change.
```

### Client
- `src/components/LivingDraftCard.tsx` (+ `.styles.ts`): new, rendered via the messages
  `FlatList`'s `ListFooterComponent` while `registration.state.mode === 'collecting'`, mirroring
  how `PropertyPhotoGrid` is wired into `src/app/index.tsx`.
- `src/app/index.tsx`: `REGISTER_EXAMPLE` copy updated to invite bulk description.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- No change to trust boundaries: the heuristic-bypass paths run the exact same regex/heuristic
  code already trusted for typed text; skipping Gemini never skips validation, since
  `property-publish` remains the sole authoritative write path (RFC 004's existing principle).
- `match_properties_hybrid`'s relational filters are passed as bound RPC parameters (no string
  interpolation into SQL), same parameterization pattern as every other Supabase client call here.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Heuristic under-resolves an audio transcript | Falls through to the existing Gemini extraction call (tier 1), unchanged from today's behavior | 200 |
| `gemini-2.5-flash-lite` unreachable | Falls back to the heuristic result as-is (already the existing text-path behavior for a failed Gemini call) | 200 (degraded) |
| `match_properties_hybrid` RPC error | Caught, logged, chat-query returns the plain structured-filter result instead (fail open, same precedent as the existing semantic fallback's own try/catch) | 200 (degraded) |

---

### Amendment (bug report, 2026-09-18): audio transcription reverted to `gemini-2.5-flash`
On-device testing after deploy: voice notes failed with "failed to process voice note".
`function_logs` showed `Gemini audio request failed (404)` from `transcribeAndExtractFromAudio`.
The *text* extraction calls to `gemini-2.5-flash-lite` were already confirmed working live (the
smoke tests in session 038/040), so this is specific to the audio `inlineData` request shape, not
a bad model string in general - Google's own model docs list audio as a supported input for
`gemini-2.5-flash-lite`, but the live `generateContent` call 404s for it regardless. Root cause not
further isolated (no direct API access to experiment). Fixed by splitting the model constant:
`GEMINI_EXTRACTION_MODEL` (`gemini-2.5-flash-lite`) stays for the text-only extraction calls;
new `GEMINI_AUDIO_MODEL` (`gemini-2.5-flash`) is used only by `_shared/geminiAudio.ts`'s
transcription call. Both `chat-query` and `property-intake` redeployed with the fix.

### Amendment (bug report + planning discussion, 2026-09-18): dynamic city matching
User report: searching "propiedades en Valencia" returned 10 properties from all over (Miami,
Austin, Denver...) instead of the 2 actually in Valencia. Root-caused to two compounding bugs,
both introduced by this RFC's own Phase 1/2 cascade:
1. `parsePromptFilters`'s city list (`chat-query`) was hardcoded to 5 US cities - any Spanish or
   Latin American city (Valencia, Bogotá, Lima, CDMX...) was invisible to the heuristic.
2. The "skip Gemini when the heuristic found *anything*" bypass (this RFC's Phase 2) was too
   coarse: a message like "casas en Valencia" matches `property_type` via the heuristic, which
   skipped Gemini entirely and never gave it a chance to fill in the missing `city` - so the
   search ran with no city constraint at all, ranking every property by semantic similarity to
   the raw text instead.
(A third, smaller factor: the 2 real Valencia properties still have `embedding: NULL` - published
before the 2026-09-17 embedding-model fix and never backfilled - so even a pure-semantic fallback
would rank them last. Not fixed here; a backfill was offered to the user and deferred.)

Discussed with the user: reject a third-party geocoding/gazetteer vendor (same "no new vendors"
decision as earlier this session) in favor of two changes, both reusing what's already in place:
- **Dynamic city list**: new `supabase/functions/_shared/cities.ts` derives known cities from
  `SELECT city FROM properties` (deduped, longest-first) instead of a hardcoded array - scales to
  any city/region automatically as listings get published, zero maintenance. Matching is
  accent/case-insensitive (`normalize('NFD')` diacritic stripping) so "Bogota"/"bogotá"/"BOGOTÁ"
  all match a stored "Bogotá"; the matched value returned is the exact DB-stored spelling, used
  directly as the filter so no Postgres `unaccent` extension is needed. Used by both `chat-query`
  and `property-intake` (replacing `property-intake`'s old Spain-only `DRAFT_CITIES` array too).
- **Fixed the cascade bypass** (`chat-query` only - `property-intake` already escalated correctly
  since `city` is one of its required fields): now escalates to Gemini when the heuristic found
  nothing *or* found something but no city, since Gemini has no city list at all (world knowledge)
  and can catch anything the DB-derived list can't yet (a brand-new city, a typo, an unusual
  spelling). Merge order changed to `{ ...geminiResult, ...heuristicResult }` so the heuristic's
  DB-grounded values always win on conflict; Gemini only fills genuine gaps.

**Known remaining gap, not fixed here (flagged, not asked for)**: `chatApi.ts`'s client-side
fallback heuristics (`querySupabaseDirectly`, `parsePropertyDraft` - used only when the Edge
Function itself is unreachable) still use their own hardcoded city lists. Lower priority since
they're a rarely-hit fallback path with no Gemini available to them either way.

## 6. Verification & Test Plan
- [x] Regression: `npm run typecheck`, `npm run lint`, `npm test` after each phase.
- [ ] Deno unit tests for the Edge Function branches - **not done**, same documented repo-wide gap
      as RFC 005/006/007 (no Deno test runner here). Verified manually via `curl` against the
      deployed functions instead, once deployed.
- [x] Unit Test: `LivingDraftCard` rendering (known vs. missing fields) and chip interactions.
- [ ] Manual on-device: full registration flow using the new draft card; a hybrid search query
      mixing a city filter with a concept term. **Not done in this session** - needs deploy
      approval first (same human-release-authority gate as sessions 037/038).
