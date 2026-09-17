# RFC 006: Cadastral Reference (`catastro`) & Duplicate-Registration Guard

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-16
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
`properties` has no field identifying a real-world parcel of land, so nothing stops the same physical property from being registered twice through the chat-guided flow (RFC 004). Spain's cadastral reference (`referencia catastral`) is the standard unique identifier for a property (printed on the IBI receipt / Sede Electrónica del Catastro). This RFC adds a `catastro` field to the draft and schema, and makes checking it for duplicates the first gate in the registration flow — before the assistant spends turns collecting the rest of the fields for a property that may already exist.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] `PropertyDraft` / `properties` gain a `catastro` field, required for every new registration.
- [x] `catastro` is the first thing the assistant asks for when `/agregar-propiedad` starts, ahead of the free-text description.
- [x] As soon as a `catastro` value is extracted (text, audio, or heuristic fallback), `property-intake` checks it against the database before accepting it into the draft, and the assistant gives immediate feedback about that check either way — not just on the duplicate path.
- [x] If it's already registered, the draft keeps `catastro` missing, the assistant explains the value is a duplicate and asks for a different/corrected one, and no other field collection message is shown until it's resolved.
- [x] `property-publish` re-validates uniqueness server-side (defense in depth — the client-side check in `property-intake` is advisory, not authoritative) and the database itself enforces it with a `UNIQUE` constraint, so a race between two concurrent registrations can't produce duplicate rows.
- [x] The database enforces `catastro NOT NULL` — it is not just an application-level requirement. Pre-existing/seeded rows are backfilled with a synthetic `LEGACY-<id-fragment>` placeholder (unique, derived from `id`) rather than left null, so the constraint can be added without breaking them.

### Non-Goals (Out of Scope)
- Validating the cadastral reference's real-world format/checksum (Spain's 20-character structure). We only require a non-empty string; format-checking the reference against the actual cadastre is a different, much larger integration (there's no such API wired into this project) and isn't what was asked for.
- Looking up property data *from* the cadastre (address, surface area, etc. auto-filled from `catastro`). Out of scope — this RFC only guards against duplicates.
- A duplicate check in the client-side heuristic fallback (`parsePropertyDraft`, used only when `property-intake` is unreachable). That fallback has no DB access point today and none is being added for it; if the Edge Function is down, the format is still checked locally, but true uniqueness is only guaranteed once `property-publish` (or the DB constraint) is reachable again.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Happy path)**:
  - **Given** the user sends `/agregar-propiedad`
  - **When** the flow starts
  - **Then** the assistant's first message asks specifically for the cadastral reference, not the full property description.

- **Story 2 (Unique catastro accepted)**:
  - **Given** the user replies with a `catastro` value that has no match in `properties`
  - **When** `property-intake` processes it
  - **Then** the value is kept in the draft, the assistant's reply opens with an explicit confirmation ("✅ Referencia catastral verificada: no está duplicada.") before moving on to the rest of the missing fields, exactly like RFC 004's existing flow. If the verification lookup itself couldn't run (DB unreachable, or the client-side heuristic fallback with no DB access at all), the confirmation is phrased as pending ("Referencia catastral registrada. La verificaré de nuevo antes de publicar.") rather than claiming a check that didn't happen.

- **Story 3 (Duplicate detected)**:
  - **Given** the user replies with a `catastro` value that already exists on another row
  - **When** `property-intake` processes it
  - **Then** `catastro` is dropped from the draft (stays missing), the assistant explains the reference is already registered and asks for a corrected or different one, and no property row is written.

- **Story 4 (Publish-time race)**:
  - **Given** two registrations somehow reach `property-publish` with the same `catastro` (the `property-intake` check passed for both before either was published)
  - **When** the second `insert` runs
  - **Then** the database's `UNIQUE` constraint rejects it, `property-publish` catches the Postgres unique-violation and returns a clear 409 instead of a raw DB error, and the client's draft is preserved for the user to correct.

---

## 4. Proposed Architecture & Public Contracts

### Data Model
```typescript
export interface PropertyDraft {
  catastro?: string;   // new — required for registration, first field asked for
  title?: string;
  property_type?: PropertyType;
  operation_type?: OperationType;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
}
```
`REQUIRED_PROPERTY_DRAFT_FIELDS` gains `'catastro'` as its **first** entry — the assistant-message builder prioritizes it: while `catastro` is missing, the message only asks about it, ignoring any other still-missing fields.

### Schema Change
```sql
-- 1. Add the column and its UNIQUE constraint (idempotent guard, same pattern as the
--    operation_type migration). Postgres UNIQUE constraints allow multiple NULLs, so this
--    step alone doesn't touch existing rows.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS catastro VARCHAR(20);
ALTER TABLE public.properties ADD CONSTRAINT properties_catastro_key UNIQUE (catastro);

-- 2. Backfill legacy/seeded rows (which predate catastro) with a synthetic, unique
--    placeholder derived from their id, then enforce NOT NULL. Split into a second
--    migration so the backfill's origin is explicit and auditable.
UPDATE public.properties
SET catastro = 'LEGACY-' || upper(substr(replace(id::text, '-', ''), 1, 13))
WHERE catastro IS NULL;
ALTER TABLE public.properties ALTER COLUMN catastro SET NOT NULL;
```

### Edge Functions

**`property-intake`**: after extracting fields from text/audio/heuristic (unchanged extraction logic otherwise), if the resulting `catastro` differs from the `known.catastro` already on the draft (i.e. newly supplied this turn), query `properties` for an existing row with that value using the service-role client (same pattern `property-publish` already uses). If found: strip `catastro` back out of `data`, and set `assistant_message` to a duplicate-specific message instead of the normal missing-fields message. Response shape is unchanged (`data`, `missing_fields`, `assistant_message`, `ready_to_confirm`, optional `transcript`) — no new fields, since the duplicate state is fully expressed by `catastro` staying in `missing_fields` plus the message text.

**`property-publish`**: `catastro` joins `REQUIRED_FIELDS`. Before inserting, run the same duplicate lookup as a pre-check (fast, friendly error). Also wrap the `insert` call's error handling to detect Postgres error code `23505` (unique_violation) and return `409 Conflict` with `{ error: 'Ya existe una propiedad registrada con esa referencia catastral' }` instead of the generic 500 path, covering the race-condition case the pre-check can't.

### Client
`src/app/index.tsx`'s `REGISTER_EXAMPLE` (the message shown right after `registration.start()`) changes to ask for the cadastral reference first. `formatDraftSummary` (the pre-publish confirmation summary) gains a `catastro` line. No changes to `usePropertyRegistrationChat` — it already passes `known`/`data` through opaquely, so `catastro` flows through the same `draft` merge logic as every other field.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- `catastro` is treated as untrusted input like every other extracted field — it's a plain string merged into client state, never interpolated into SQL (Supabase client uses parameterized queries).
- The duplicate check in `property-intake` is a UX convenience, not the enforcement point — `property-publish`'s pre-check plus the database `UNIQUE` constraint are what actually prevent duplicate rows, consistent with RFC 004's existing principle that the client/intake step is never the sole enforcement point.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| `catastro` missing | Assistant asks for it specifically, ignoring other missing fields | 200 (`missing_fields` includes `catastro`) |
| `catastro` duplicates an existing row (`property-intake`) | Drop it from the draft, explain the duplicate, ask for a different one | 200 (degraded, still `missing_fields` includes `catastro`) |
| `catastro` duplicates an existing row (`property-publish`, pre-check) | Reject before insert, keep client draft intact | 409 Conflict |
| Concurrent publish race (DB constraint fires) | Catch `23505`, return the same friendly message | 409 Conflict |
| DB unreachable during the `property-intake` duplicate check | Log and treat as "no duplicate found" (fail-open at intake — it's advisory only; `property-publish`'s own check plus the DB constraint still guard the actual write); the assistant's feedback is phrased as pending, not verified, so the user isn't given false assurance | 200 (degraded) |

---

## 6. Verification & Test Plan
- [x] Unit Test: `parsePropertyDraft` (client heuristic) extracts a `catastro`-shaped token from free text.
- [x] Unit Test: `buildAssistantMessage`-equivalent behavior — when `catastro` is missing, the assistant message only asks for it, even if other fields are also missing.
- [x] Unit Test: immediate feedback is shown the moment `catastro` is newly provided, and is not repeated on a later turn once it was already known.
- [ ] Unit Test (Deno): `property-intake` / `property-publish` duplicate-check branches. **Not done** — same documented gap as RFC 005: this repo has no Deno test runner and none of the three Edge Functions have test coverage; adding a harness is out of scope here too.
- [x] Regression: `npm run typecheck`, `npm run lint`, `npm test` all green; existing RFC 004/005 flows (search chat, text/voice registration for fields other than `catastro`) unaffected.
