# RFC 037: Strict Search Filters (operation, property type) and Verified No-Result Suggestions

- **Author**: AI Agent (Claude Code)
- **Status**: Deployed (2026-10-04); old overloads pending manual DROP
- **Created**: 2026-10-04
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
A prompt search must return only what the user asked for: "casas en alquiler" only rentals,
"apartamentos en venta" only apartments for sale. Production data (2026-10-04): 25 listings,
10 `rent` / 15 `sale`; 9 Apartment, 10 Single Family, 4 Townhouse, 2 Studio.

Review of the pipeline (`chat-query`) found:
- **Operation is ignored end to end.** `parsePromptFilters` has no `operation_type`, the Gemini
  extraction prompt does not ask for it, `search_listings` / `search_properties_nearby` have no
  parameter for it, and neither does the table fallback in `chat-query` nor the client fallback
  `querySupabaseDirectly`. "Alquiler"/"venta" are only dropped as generic words.
- **Property type detection is order-dependent substring matching.** "apartamento estudio" →
  Apartment (Studio never wins), "casa adosada" → Single Family, "pisos" works only by accident.
- **Gemini-extracted filters are not validated**: any `property_type` string reaches the RPC.
- **No-result suggestions are unverified**: the deterministic fallback lists other cities, Gemini
  invents suggestions; neither checks that the suggested search returns anything.

Decisions approved by the user on 2026-10-04: suggestions relax one filter at a time and are
offered only when they have results (with their count); with zero exact results only suggestions
are shown, never listings that do not match what was asked.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] `PromptFilters.operation_type: 'rent' | 'sale'`, parsed from the prompt (alquiler, alquilar,
      renta, rentar, arriendo, arrendar, for rent / venta, vender, comprar, compra, for sale, buy)
      and requested from Gemini; applied as a hard filter in every search path.
- [ ] Property type matched most specific type first (Studio, Townhouse, Condo before
      Apartment, Single Family); substring matching stays ("microestudio" → Studio). Operation
      words are matched on word boundaries ("ventana" is not "venta"); both present → no filter.
- [ ] Gemini-extracted filters validated at the boundary (enum values, finite numbers).
- [ ] With zero results: up to 3 suggestions, each a relaxation of one filter that returns
      results, labelled as a search phrase the parser maps back to exactly those filters; the
      answer states the counts. Gemini is not used for this answer.
- [ ] `property-ask` comparables use the listing's operation (rent compared with rent).

### Non-Goals (Out of Scope)
- Suggestions when there are results (unchanged, Gemini).
- Changing the place fallback (RFC 033): it already keeps type/price filters and now also keeps
  the operation.
- Amenities and free-text terms in suggestions: suggestions are built from structured filters
  only, so they drop them (counts are computed the same way, so they stay truthful).
- New property types or operations beyond `rent` / `sale`.

---

## 3. User Stories & Acceptance Criteria
- "Casas en alquiler en Valencia" → only `Single Family` + `rent` + Valencia.
- "Apartamentos en venta" → only `Apartment` + `sale`.
- "Apartamento estudio en alquiler" → `Studio` + `rent`.
- "Apartamentos en alquiler en Maracay" with none → no listings; answer
  "No encontré apartamentos en alquiler en Maracay. Sí hay: …" and suggestion chips such as
  "Apartamentos en venta en Maracay", "Propiedades en alquiler en Maracay",
  "Apartamentos en alquiler en Valencia", each with results.
- Tapping a suggestion runs that search and returns the counted listings.

---

## 4. Proposed Architecture & Public Contracts

### Shared modules (pure, Jest-tested)
- `promptFilters.ts`: `operation_type`; `extractOperationType`; specific-first `extractPropertyType`.
- `extractedFilters.ts`: `sanitizeExtractedFilters(raw): PromptFilters` for Gemini output.
- `searchSuggestions.ts`:
  - `describeSearch(filters): string` → "Apartamentos en venta en Valencia hasta 80000".
    Round-trip property: `parsePromptFilters(describeSearch(f))` yields `f`'s structured filters.
  - `relaxations(filters, knownCities): Relaxation[]` → flip operation, drop type, drop price
    range, drop bedrooms, other city (grouped from one city-less query).
  - `suggestionFilters(filters, knownCities)` keeps what a phrase can express (known city only).
  - `findAlternatives({ filters, knownCities, search })` runs the candidates in parallel (errors
    count as zero) and returns at most 3 `{ label, count }` with results;
    `alternativesAnswer(filters, alternatives)` builds `{ answer, suggestions }`.
- `extractedFilters.ts` constants in `extractedFiltersConstants.ts`, phrases in
  `searchSuggestionsConstants.ts`; `SUGGESTION_COUNT_LIMIT` (50) caps each count query.
- `hybridSearch.ts`: `p_operation_type` in the hard filters of all param sets.

### Database (`supabase/migrations/20261004_search_operation_filter.sql`, no `DROP`)
New overloads of `search_listings` and `search_properties_nearby` with a **required**
`p_operation_type text` (no default, so calls that omit it still resolve to the old functions
and nothing breaks between the migration and the function deploys). Same body plus
`AND (p_operation_type IS NULL OR l.operation_type = p_operation_type)`, same `STABLE`,
`search_path`, grants. The old overloads are dropped by the user afterwards (the assistant's
`DROP` is declined in auto mode).

### Edge Functions
- `chat-query`: sanitized Gemini filters, operation in the table fallback, zero results →
  `findAlternatives` + `alternativesAnswer`; with no alternative, the deterministic
  `fallbackSearchAnswer` (no Gemini at zero results, so no unverified suggestions).
- `property-ask`: passes `p_operation_type` (the listing's) to `search_listings`.

### App
- `querySupabaseDirectly`: `.eq('operation_type', …)`.

---

## 5. Security & Error Handling
- Gemini output is untrusted: only whitelisted enum values and finite numbers survive.
- Relaxation queries run with the caller's client (same RLS and agency scoping as the search).
- A failing relaxation query counts as zero; the answer falls back to the existing
  no-results text.

---

## 6. Verification & Test Plan
- Jest: operation/type parsing table, sanitizer, `describeSearch` round trip, relaxation
  candidates and suggestion assembly with fake counters, hybrid params carry the operation.
- SQL: the new overloads filter by operation; calls without `p_operation_type` still work.
- Smoke (deployed): "casas en alquiler" returns only rent; an empty search returns verified chips.

---

## 7. Implementation Notes (2026-10-04)
- Jest 161/1490 in the worktree; shared modules type-check standalone; lint clean on touched files
  apart from the pre-existing `jsr:` resolution and unused `supabase` in `chat-query`.
- The migration was run against production inside a `DO` block ended by `RAISE EXCEPTION`
  (rolled back): rent only 0 wrong of 10, sale apartments 0 wrong of 5, `NULL` operation 25/25,
  call without `p_operation_type` still resolves to the old overload (2 studios), nearby rent
  0 wrong of 10. Overload count afterwards unchanged (1 each).
- Deploy order: migration → `chat-query` and `property-ask` → user drops the old overloads.
- `hybridSearch.test.ts`: the two exact-shape assertions gained `p_operation_type: null`
  (requirement change, not a weakened assertion). `searchSuggestions` test data for the
  price/bedrooms case was corrected before the implementation existed.

## 8. Deployment (2026-10-04)
- Migration `search_operation_filter` applied via MCP; `chat-query` v25 → v26 (v26 quotes the user's
  search in the no-result answer: with an unknown city the structured description contradicted
  the suggestions), `property-ask` v2 (also ships the prompt-guard refactor). `verify_jwt: true`.
- Smoke (anon): "casas en alquiler" 3/3 rent Single Family; "apartamentos en venta" 5/5 sale
  Apartment; "apartamento estudio en alquiler en Valencia" → Studio rent; "casa adosada en alquiler
  en Maracay" → 0 + 3 verified suggestions; tapping "Casas adosadas en venta" returns its 2;
  "casas con ventanas grandes" applies no operation. `property-ask` anonymous → 401.
- Advisors: no new findings (the new overloads are `SECURITY INVOKER` with a fixed `search_path`).
- Manual step: drop the old overloads (see session log).
