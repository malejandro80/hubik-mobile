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
- **Next**: All 12 PR #3 review comments addressed locally (session 033 in `session-log.md`) —
  photo staging/grid, semantic search fallback, prompt centralization/translation, theme/hardcoding
  fixes, docs translation, catastro indexing verified. Still pending: manual on-device verification
  of the full flow (photos grid, deferred upload, map pin, AI description for legacy properties,
  semantic search, publish with embedding), a real voice recording round-trip through Gemini, and
  explicit user approval before committing/pushing/replying on PR #3.
- **See also**: `.agents/rules/07-feature-graph.md` for how RFC 004/006/007 and their modules
  relate to each other.

## Prior Milestone: LangGraph Architecture Team Orchestrator
- **Goal**: Executable multi-agent architecture squad in TypeScript.
- **Phase**: Implementation complete; pending human review + PR.
- **Artifacts**: `scripts/architecture-team/`, spec in `specs/003-langgraph-architecture-team.md`,
  ADR in `docs/adr/0002-langgraph-architecture-team.md`.
