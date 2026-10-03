# RFC 033: Location-Aware Search (sectors, nearby results, search review fixes)

- **Author**: AI Agent (Claude Code)
- **Status**: Deployed (2026-10-03)
- **Created**: 2026-10-03
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Users search by neighbourhood, urbanización, sector or town ("La Trigaleña", "Altos de Guataparo",
"Prebo"), not only by city. Today (RFC 027) a name that is not a known `properties.city` becomes
`p_place`, which must appear in `search_tsv` (title, amenities, description). Production data
(25 listings, 3 cities, all with coordinates and address) shows the gap:
- The sector lives in `address` ("Calle 137, Res. Los Samanes, **La Trigaleña**"), which is kept
  out of search for privacy. A sector is found only when the agent repeats it in the title.
- When a place has no match, the user gets a dead end instead of "nothing in X, but 3 nearby".
- Privacy defect found while designing this: clients receive jittered coordinates
  (`jitter_coordinate`, ±0.003°), but the jitter is `md5(id || seed)` and `anon` can execute
  `public.jitter_coordinate(id, 'lat', 0)`, which returns the offset. Exact coordinates are
  recoverable as `jittered - offset`.

The review of the search pipeline (2026-10-03) also found:
- `min/max_square_meters` are parsed but never sent to `search_properties_hybrid`.
- `GEMINI_EXTRACTION_MODEL` is `gemini-2.5-flash`, shut down on 2026-10-16.
- `fetchKnownCities` reads `city` from every row on each request.
- The query embedding waits for the Gemini filter extraction although it does not depend on it.
- The filter heuristic is duplicated in `chat-query` and `src/lib/promptFilters.ts`.

Decisions approved by the user on 2026-10-03: phase 1 of the location brainstorm (sector from the
address, sector in search and embeddings, cascading answer); users may see nearby listings and the
sector name, never the address or the exact map location; the review fixes go in this RFC.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] `properties.sector`: the neighbourhood/urbanización, extracted at publish by Gemini from
      `address` and `title`, kept only when it literally appears in them (grounded), backfilled
      for existing listings.
- [x] `sector` is public (view + column grant) and weighted `A` in `search_tsv`. It is NOT part of
      `listingDocument`: see §7.
- [ ] Known sectors are matched locally like cities (`known_places()`), so "casas en La Trigaleña,
      Valencia" filters by both without a Gemini call.
- [ ] Cascade when a place search returns nothing: listings within `NEARBY_RADIUS_KM` of the
      place, then the rest of the city, then the RFC 025 alternatives. "cerca de X" goes straight
      to the nearby search. The answer always says the results are not in the requested place.
- [ ] Nearby distance uses the coordinates the caller can already see (jittered for clients),
      `SECURITY INVOKER`, returned rounded to `0.5 km`.
- [ ] Jitter uses a secret salt from Vault; `jitter_coordinate` is no longer executable by
      `anon`/`authenticated`.
- [ ] Review fixes: m² hard filters, extraction model `gemini-3.5-flash-lite`, `known_places()`
      with `DISTINCT`, embedding requested in parallel, one shared filter heuristic.

### Non-Goals (Out of Scope)
- Reverse geocoding, a `places` gazetteer with aliases/trigram typo tolerance, municipality/state
  hierarchy (phase 2 of the brainstorm).
- Proximity to points of interest that are not listing sectors ("cerca del Sambil") - needs
  geocoding (phase 3).
- UI changes (cards showing the sector or the distance), editing a published listing.
- Amenities as hard filters (RFC 027 keeps them as a ranking signal).

---

## 3. User Stories & Acceptance Criteria
- "casas en La Trigaleña" → listings whose sector is La Trigaleña, even if the title does not
  mention it.
- "apartamentos en Prebo por menos de 50k" with nothing under 50k in Prebo → nearby apartments
  under 50k, and the answer says they are near Prebo, not in it.
- "algo cerca de Guataparo" → listings ordered by distance from Guataparo.
- "pisos de más de 100 m2" → no listing under 100 m².
- Anonymous `rpc/jitter_coordinate` → permission denied; the map pin of a listing seen by a client
  is still ~330 m from the real location.

---

## 4. Proposed Architecture & Public Contracts

### Shared modules (pure, Jest-tested)
```typescript
// _shared/promptFilters.ts (used by chat-query and by the client fallback)
export function parsePromptFilters(message: string, knownCities: readonly string[],
  knownSectors?: readonly string[]): PromptFilters; // adds `place` for a known sector

// _shared/sector.ts
export function groundSector(candidate: unknown, source: SectorSource): string | null;
export function extractSector(source: SectorSource, geminiKey: string): Promise<string | null>;

// _shared/placeFallback.ts
export async function searchWithPlaceFallback(input: PlaceFallbackInput): Promise<PlaceFallbackResult>;
// result: { items, relaxed: 'nearby' | 'city' | null }
```

### Database (`supabase/migrations/20261003_*.sql`, four migrations, no `DROP`)
- `properties.sector text`; `GRANT SELECT (sector)`; `property_listings` re-created with `sector`
  appended (`security_invoker = true`).
- `listing_search_tsv(title, sector, amenities, description)`: title and sector `A`, amenities `B`,
  description `C`; `search_tsv` switched with `ALTER COLUMN ... SET EXPRESSION` (Postgres 17).
- New `search_listings` (the RFC 027 hybrid search plus `p_min_square_meters`,
  `p_max_square_meters` and `sector` in the result). `search_properties_hybrid` stays untouched so
  the previous `chat-query` kept working during the deploy; it is dropped in a cleanup.
- `search_properties_nearby(p_place, p_radius_km, <hard filters>, match_count)`: anchor = mean
  visible coordinates of the listings matching the place; haversine distance; role scope as in
  RFC 030; returns `distance_km` rounded to 0.5.
- `known_places()` returns `(name, kind)` for distinct cities and sectors, longest first.
- `jitter_coordinate` salted with the Vault secret `coordinate_jitter_salt` (generated in SQL,
  never in the repo); EXECUTE revoked from `PUBLIC`, `anon`, `authenticated`.

### Edge Functions
- `chat-query`: known places → heuristic (+Gemini when no city) → hybrid search →
  `searchWithPlaceFallback` → RFC 025 answer with `relaxed`/`distance_km`.
- `property-publish`: `extractSector` before the embedding; stores `sector`.
- `property-intake`: imports the city matcher from `_shared/cityMatch.ts`.

### Scripts
- `scripts/backfill-sectors.ts` (`npm run backfill:sectors`), then `npm run reembed` (now embeds
  the sector).

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- The extracted sector must appear (accent/case-insensitive) in the agent's own `address` or
  `title`, is 3-60 characters and differs from the city; anything else is discarded. Gemini can
  never invent a public location string.
- The sector is the only part of the address that becomes public, as approved.
- Nearby search runs as the caller over `property_listings`, so it sees exactly the coordinates
  that caller already sees; only a rounded distance leaves the function, never the anchor.
- Jitter is no longer reversible: the salt is secret and the function is not callable by clients.
  Existing pins move once (new jitter), which is intended.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy |
| :--- | :--- |
| Gemini fails at publish | `sector = null`; listing still published |
| Place has no listing with coordinates | Skip nearby, try the city, then RFC 025 alternatives |
| Nearby RPC error | Logged; cascade continues |
| Gemini answer fails | Template that states the relaxation |

---

## 6. Verification & Test Plan
- [ ] Unit: `promptFilters` (shared), `groundSector`, `placeFallback`, `buildHybridSearch` (m²,
      known sector place), `listingDocument` (sector), `fallbackSearchAnswer` (relaxed answers).
- [ ] DB: migration dry-run in a rolled-back transaction; after apply: `known_places()`, nearby
      for a known sector, m² filter, anon `jitter_coordinate` denied, advisors.
- [ ] Backfill sectors, reembed, `npm run eval:search` (no regression vs 16/16).
- [ ] `npm run lint`, `npm test`, `npm run typecheck`.

---

## 7. Deployment Notes (2026-10-03)
- **Migrations via MCP, without `DROP`**: the Supabase MCP server declines any migration that
  contains `DROP` in this environment, so the RFC was reshaped: `properties_sector_column`,
  `salted_coordinate_jitter`, `sector_in_search_tsv_and_view`, `location_search_functions`. The
  hybrid search moved to a new `search_listings`; `search_properties_hybrid` and the 3-argument
  `listing_search_tsv` are left unused. Cleanup, to run in the SQL editor:
  `DROP FUNCTION public.search_properties_hybrid(vector, text, text, text, text, numeric, numeric,
  integer, integer, double precision, double precision, text, integer);`
  `DROP FUNCTION public.listing_search_tsv(text, text[], text);`
- **Privacy**: `anon`/`authenticated` can no longer execute `jitter_coordinate`; the 25 listings
  still show jittered coordinates (max offset 0.00299°). Pins moved once, as intended.
- **Edge Functions**: `chat-query` v23, `property-intake` v23, `property-publish` v12
  (`verify_jwt: true`).
- **Backfill**: `npm run backfill:sectors` assigned 22/25 sectors. Naguanagua and Campo Carabobo have
  no sector in the address; "Torre Kerdell" made the model return null for Kerdell (still found
  through its title). Gemini free tier is 15 requests/min per model: the backfill hit 429s and was
  rerun.
- **Sector left out of the embedding**: with the sector in `listingDocument`, "con pileta" ranked
  sector-less listings above pool listings (similarities 0.65-0.69). Proper nouns dilute the
  semantic signal, so the sector stays lexical only (`search_tsv`, weight A); `listingDocument` and
  the embeddings are unchanged from RFC 027.
- **Eval**: 15/16. The failing case ("con pileta") gives the same ranking with the untouched
  `search_properties_hybrid` over the same embeddings: it comes from listings published after
  2026-09-23 (Campo Carabobo, Naguanagua), not from this RFC.
- **End-to-end (anon, deployed)**: "apartamentos en Los Mangos, Valencia" → place + city, 2 results;
  "algo cerca de Guataparo" → `near`, ordered by distance; "casas en Prebo" → `nearby` (El Bosque,
  La Viña, Las Chimeneas); "casas en Prebo, Valencia con más de 400 m2" → `city`; "pisos de más de
  100 m2" → only ≥100 m². Addresses stay hidden.
- **Advisors**: no new findings.
- **Watch**: search extraction, search answers, intake and sector extraction now share the
  `gemini-3.5-flash-lite` free-tier limit (15/min); `gemini-2.5-flash-lite` already returns 404.
  `property-describe` still uses `gemini-2.5-flash` (shutdown 2026-10-16).

