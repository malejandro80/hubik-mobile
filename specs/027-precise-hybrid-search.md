# RFC 027: Precise Hybrid Search

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
`match_properties_hybrid` (RFC 008/010) ranks by the cosine similarity of an embedding built from
`description + amenities`, after hard filters. Measured against production with the new eval set
(`npm run eval:search`), it passes **10/15**:
- The title is not embedded or searchable, and neighbourhoods live in titles. Worse, Gemini's
  filter extraction returns the neighbourhood as `city` ("algo en Guataparo" → `city = Guataparo`),
  which becomes a hard filter and returns 0 rows.
- Requested amenities are an exact-string hard filter (`amenities @> …`): "zona de juegos para
  niños" returns 0 rows although "parque infantil" listings exist.
- There is no lexical search for proper nouns, and no relevance floor: an unrelated request
  ("internet satelital en la playa") still returns 7 listings.
- Explicit price sorts ("la más barata con jardín") skip the semantic ranking entirely.

Scope brief approved by the user on 2026-09-23 (single RFC; amenities as ranking signal; no
results when nothing is relevant).

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Each listing is embedded from a full document: title, type, operation, city, description,
      amenities (`listingDocument`), at publish, in the seed, and via a one-off backfill.
- [x] A weighted Spanish full-text column (title A, amenities B, description C, accent-insensitive).
- [x] A new RPC fuses semantic and lexical ranks with Reciprocal Rank Fusion, under the existing
      hard filters (city, type, price, bedrooms).
- [x] Amenities rank but no longer exclude.
- [x] A "city" with no listings is treated as a place that must appear in the listing text.
- [x] Relevance floor: when the request has distinctive terms, a listing is kept only if it
      matches them lexically or its similarity reaches `MIN_SIMILARITY`; pure-filter requests
      ("pisos en Valencia") are not thresholded.
- [x] Explicit price sorts rank by relevance first, then order the relevant rows by price.
- [x] Without a Gemini key, the RPC still works lexically (no threshold).
- [x] Eval set passes 15/15.

### Non-Goals (Out of Scope)
- Chunked RAG over documents, per-field embeddings.
- A sale/rent filter (observed in RFC 026 testing) - separate RFC.
- The client fallback `querySupabaseDirectly`; UI changes.
- Dropping `match_properties_hybrid` (kept until the new RPC is verified; removed in a cleanup).

---

## 3. User Stories & Acceptance Criteria
Acceptance is the eval set in `scripts/eval/searchEvalCases.ts`, run with `npm run eval:search`
against the deployed `chat-query`, for example:
- "algo en Guataparo" → the three Guataparo listings are the top 3.
- "con zona de juegos para niños" → both "parque infantil" listings in the top 3.
- "la casa más barata con jardín" → "Casa en alquiler en El Bosque" first.
- "castillo medieval con foso", "internet satelital en la playa" → no results.
- "pisos en Valencia" → all 9 apartments.

---

## 4. Proposed Architecture & Public Contracts

### Shared modules (Edge Functions + scripts, pure, Jest-tested)
```typescript
// _shared/listingDocument.ts
export function listingDocument(listing: ListingDocumentSource): string;

// _shared/hybridSearch.ts
export function contentTerms(message: string, knownCities: string[]): string;
export function buildHybridSearch(input: {
  message: string; filters: Record<string, unknown>; knownCities: string[]; embedding: number[] | null;
}): { params: HybridSearchParams; filters: Record<string, unknown> };
```
`contentTerms` removes stopwords and words that only restate filters (types, operations, rooms,
prices, sort words, known cities, numbers), leaving the distinctive terms for the lexical side
and deciding whether the relevance floor applies.

### Database (`supabase/migrations/20260923_precise_hybrid_search.sql`)
- `unaccent` extension in schema `extensions`; `public.immutable_unaccent(text)` wrapper.
- `public.listing_search_tsv(title, amenities, description)` (immutable) and a generated,
  GIN-indexed `properties.search_tsv`; `GRANT SELECT (search_tsv)` to `anon`, `authenticated`
  (SELECT on `properties` is column-level).
- `property_listings` re-created with `search_tsv` appended, keeping `security_invoker = true`.
- New `public.search_properties_hybrid(query_embedding, p_query, p_place, p_city,
  p_property_type, p_min_price, p_max_price, p_min_bedrooms, p_max_bedrooms, p_min_similarity,
  p_sort, match_count)`, `SECURITY INVOKER`, reading `property_listings`. Lexical query = OR of
  the stemmed terms; place = AND of its terms. RRF constant `k = 60`.

### Edge Functions
- `chat-query`: builds params with `buildHybridSearch`, always calls the new RPC (embedding may
  be null), falls back to the unchanged structured query only if the RPC errors; passes the
  effective filters (with `place`) to the RFC 025 answer.
- `property-publish`: embeds `listingDocument(...)`.

### Scripts
- `scripts/reembed-properties.ts` (`npm run reembed`): recomputes every listing's embedding
  from `listingDocument` (service-role key + Gemini key from `.env`).
- `scripts/seed-properties.ts`: uses `listingDocument`.
- `scripts/eval-search.ts` (`npm run eval:search`).

---

## 5. Security & Error Handling
- The RPC is `SECURITY INVOKER` over the `security_invoker` view, so RLS and the masked address
  still apply; `search_tsv` holds only title, amenities and description (no address).
- User text reaches SQL only as function arguments (`plainto_tsquery`), never concatenated.
- The backfill runs locally with the service-role key the seed already uses; it only updates
  `embedding`.

| Failure Condition | Handling Strategy |
| :--- | :--- |
| No Gemini key / embedding fails | RPC runs lexically with filters, no threshold |
| RPC error | Existing structured query (unchanged) |
| Place matches nothing | 0 rows → RFC 025 answer suggests real cities |

---

## 6. Verification & Test Plan
- [x] Unit: `listingDocument` (full document, no address/catastro, missing parts).
- [x] Unit: `contentTerms` and `buildHybridSearch` (known city vs place, amenities not sent,
      threshold only with content terms, sort whitelist, no-embedding mode).
- [x] DB: after migration, the RPC returns rows for anon via the view; advisors show no new
      findings.
- [x] Calibrate `MIN_SIMILARITY` on the eval queries after the backfill.
- [x] Eval: `npm run eval:search` before (10/15) and after (target 15/15).
- [x] `npm run lint`, `npm test`, `npm run typecheck`.

---

## 7. Deployment Notes (2026-09-23)
- Migrations applied via MCP: `precise_hybrid_search` (unaccent, `search_tsv`, view, RPC) and
  `precise_hybrid_search_window` (adds `p_similarity_window`, drops the unused first signature).
- Backfill: `npm run reembed` recomputed 22/22 embeddings from `listingDocument`.
- Calibration on the eval queries: unrelated requests peak at 0.627-0.630 similarity, so
  `MIN_SIMILARITY = 0.65`; a relative `SIMILARITY_WINDOW = 0.05` from the best match keeps
  "la casa más barata con jardín" to the six houses with a garden before the price sort.
  "zona" and generic adjectives ("buena", "excelente"...) were added to the ignored words after
  they produced lexical noise.
- `chat-query` v21 and `property-publish` v9 deployed (`verify_jwt: true`).
- Eval: **10/15 before → 15/15 after**. "casas en Bilbao" still returns 0 with real alternatives
  (RFC 025). Security advisors: no new findings.
- `tsconfig.json`: `noEmit` + `allowImportingTsExtensions`, so Node scripts can import the
  Deno-style shared modules.
- Follow-up: drop `match_properties_hybrid` (no longer called) and the legacy `match_properties`
  once nothing references them.

