# Current Milestone & Project Status

## Active Milestone: MVP 1.0 - AI Real Estate Assistant
- **Goal**: Chat-first (text + voice) real estate assistant: natural-language property search and
  conversational, chat-guided property registration for Don Carlos.
- **Phase**: Chat-guided registration (RFC 004), voice notes (RFC 005), the `catastro` uniqueness
  guard (RFC 006), and photos/location/AI-description/embedding (RFC 007) all implemented and
  locally verified (34 suites, 177 tests, lint/typecheck/secret-scan clean), and now fully deployed.
  Both pending migrations (`20260916_catastro_not_null.sql`, `20260916_add_media_location_description.sql`)
  were applied by the user directly (blocked from assistant auto-apply by the Claude Code auto-mode
  classifier); confirmed via `mcp__supabase__list_tables`/`execute_sql` that `catastro` is `NOT
  NULL`, `latitude`/`longitude`/`description` exist, and the `property-images` upload policy is
  active. All four Edge Functions are `ACTIVE` on remote (`wbzfeqzvwfglirwlpzpy`): `chat-query`
  (v4), `property-intake` (v2, catastro guard + immediate feedback), `property-publish` (v2, images/
  coordinates/description/embedding), `property-describe` (v1, first deploy) — all redeployed via
  the Supabase MCP server's `deploy_edge_function`.
- **Artifacts**: `specs/004-...md` through `specs/007-property-media-location-preview.md`,
  `src/hooks/usePropertyRegistrationChat.ts`, `src/hooks/useVoiceRecorder.ts`,
  `src/services/propertyImages.ts`, `src/components/ChatMapPicker.tsx`,
  `supabase/functions/property-intake/`, `supabase/functions/property-publish/`,
  `supabase/functions/property-describe/` (new), `supabase/functions/_shared/geminiAudio.ts`,
  `supabase/migrations/20260916_add_operation_type.sql` (already reflected in remote schema),
  `supabase/migrations/20260916_add_catastro.sql` (applied as `20260916231753_add_catastro`),
  `supabase/migrations/20260916_catastro_not_null.sql` (written, NOT applied),
  `supabase/migrations/20260916_add_media_location_description.sql` (written, NOT applied).
- **Next**: All 12 PR #3 review comments addressed locally (session 033). RFC 008 (cascading
  search/intake, `gemini-2.5-flash-lite`, `match_properties_hybrid`, `LivingDraftCard`) deployed
  and verified (sessions 039-040), including a live-confirmed fix for dynamic (non-hardcoded) city
  matching (session 042/043) - "propiedades en Valencia" now correctly returns only Valencia
  rows, and the same mechanism covers any city/region (LatAm included) automatically once at
  least one property is registered there. RFC 009 (sessions 044-045): audio transcription moved
  from Gemini to Groq/Whisper (`whisper-large-v3-turbo`) after hitting Gemini's 20-requests/day
  free-tier quota and a `gemini-2.5-flash-lite` audio 404 - **deployed and verified live**
  (`chat-query` v11, `property-intake` v9), `GROQ_API_KEY` set as a Supabase secret, confirmed via
  synthesized-voice `curl` smoke tests that Groq/Whisper transcription works end-to-end in
  production for both functions. Text extraction/embeddings/descriptions stay on Gemini - only
  transcription moved.
  Still pending overall: on-device verification of the full flow (photos grid, deferred upload,
  map pin, AI description for legacy properties, hybrid search, `LivingDraftCard`, publish with
  embedding, a real on-device voice round-trip with an actual recording), the optional
  `responseSchema` fix for Gemini's zero-listing-city extraction gap, the Valencia-embedding
  backfill, and explicit user approval before committing/pushing/replying on PR #3 - nothing from
  any session this far has been committed to git yet.
  RFC 010 (property amenities & characteristics, session 2026-09-19): also fixed a bug where
  `image_url` was never written on either insert path, leaving newly-published properties with a
  null image (`PropertyCard`/detail screen now fall back to `images[0]`). Then, after a multi-turn
  brainstorm, implemented passive amenity/characteristic capture: new `properties.amenities
  TEXT[]` column (GIN-indexed), extracted additively from any registration-chat message (local
  keyword dictionary always, Gemini/Groq escalation broadened to also fire post-completion via
  `hasAmenitySignal`), a new `AmenitiesConfirmation` chip UI wired into `index.tsx`'s
  `renderListFooter` during `confirming` mode, amenities folded into the embedded text at publish
  time, and `match_properties_hybrid`'s new `p_amenities` containment filter for search - full
  design rationale in `specs/010-property-amenities.md`. Implemented, locally verified
  (31 suites/216 tests, lint/typecheck clean), **and deployed** (user said "deploy"): migration
  applied, `property-intake` v15/`property-publish` v5/`chat-query` v12 all live and
  curl-verified working end-to-end (amenity extraction, additive merge, post-completion
  escalation, and the hybrid search `p_amenities` filter all confirmed against the real deployed
  functions). Nothing this session was committed to git. Also surfaced, not fixed: RFC
  008's `LivingDraftCard` was built/tested but was never actually wired into `index.tsx`'s render
  tree - `AmenitiesConfirmation` now occupies the `renderListFooter` hook point RFC 008 intended
  for it, but `LivingDraftCard` itself is still unused dead code.
  RFC 011 (sign-in, roles & agencies, session 2026-09-20): scoped with the new `scope` skill,
  designed (ADR 0003/0004) and implemented locally on branch `feat-011-auth-roles-agencies` -
  Google/Apple sign-in, `client`/`agent`/`owner` roles, agency as tenant, agent-only publishing
  enforced in the UI and in `property-publish`/`property-intake`, listings attributed to agency
  and agent. **Not yet applied/deployed/committed**: the migration, provider setup (Google,
  Apple, Supabase) and function deploys are pending the human lead - see the session log entry
  for the checklist.
- **See also**: `.agents/rules/07-feature-graph.md` for how RFC 004/006/007 and their modules
  relate to each other.

## Prior Milestone: LangGraph Architecture Team Orchestrator
- **Goal**: Executable multi-agent architecture squad in TypeScript.
- **Phase**: Implementation complete; pending human review + PR.
- **Artifacts**: `scripts/architecture-team/`, spec in `specs/003-langgraph-architecture-team.md`,
  ADR in `docs/adr/0002-langgraph-architecture-team.md`.
