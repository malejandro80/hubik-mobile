# RFC 004: Chat-Guided Property Registration

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-16
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Property owners (e.g. Don Carlos) need to register a new listing without filling out a traditional multi-field form. The existing `/register` screen (`src/app/register.tsx` + `useVoiceWizardMachine`) is a separate, hardcoded 3-step wizard with binary Sí/No clarification cards that was never wired to actually write to Supabase. This RFC replaces it with a single conversational flow inside the main chat screen: the user describes their property in free text, the assistant extracts whatever it can, and asks — in one consolidated message — for whatever required fields are still missing, looping until the draft is complete. Nothing is written to Supabase until the user explicitly confirms the completed draft.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Sidebar "Registrar Vivienda" button sends the slash-command `/agregar-propiedad` into the chat automatically (no navigation to a separate screen).
- [x] Typing `/agregar-propiedad` manually in the chat also starts the flow.
- [x] Free-text property descriptions are parsed into structured fields via a Gemini-backed Edge Function (`property-intake`), with a regex heuristic fallback when no Gemini key is configured.
- [x] The client keeps an in-memory draft (`PropertyDraft`); nothing is persisted to Supabase until all required fields are present **and** the user confirms.
- [x] When required fields are missing, the assistant sends a single message listing all of them; the user may answer all at once or incrementally, and each reply re-triggers extraction against the current draft.
- [x] On completion, the assistant shows a text summary of the draft with two quick-reply actions ("Confirmar y publicar" / "Corregir algo") via the existing `SuggestionChips` component.
- [x] Confirming calls a privileged Edge Function (`property-publish`) that validates required fields server-side and inserts the row (service-role key, since there is no public INSERT policy).
- [x] The user can cancel the flow at any time by sending "cancelar registro", returning to normal search chat.
- [x] Remove the old `/register` wizard screen, its hook, its types, and its dedicated wizard components — they are fully superseded.

### Non-Goals (Out of Scope)
- ~~Vector embedding generation for the new property.~~ **Superseded by RFC 007**: `property-publish`
  now computes a real Gemini embedding from the description at publish time.
  **Superseded by this document's own PR-review amendment below**: `chat-query` now also has a
  semantic-search fallback that queries by that embedding via `match_properties`.
- Photo upload, cadastral reference lookup, and owner PII capture (previously Steps 2 & 3 of the old wizard). These are not modeled in the `properties` schema and are out of scope for this RFC.
- Authentication / per-user ownership of listings (the app has no login flow today).
- Editing or deleting previously published properties via chat.

### Amendment (PR review, 2026-09-17): semantic search fallback
Every published property already carries a real embedding (RFC 007), but nothing consumed it —
`chat-query` only ever ran structured SQL filters, so `match_properties` (present since the first
migration) had zero callers. `chat-query/index.ts` now falls back to it: when the structured
filter query returns zero rows and a Gemini key is configured, the user's message (or transcript)
is embedded and passed to `match_properties`; a non-empty result is returned as "similar
properties" instead of the plain empty-results message. This is Edge-Function-only (same asymmetry
the audio path already has vs. the client-side heuristic fallback) — there is no local/offline
equivalent since embedding requires the Gemini API.

### Amendment (bug report, 2026-09-17): embedding model migration
`text-embedding-004` (used since this project's first migration) was shut down by Google on
2026-01-14 — Gemini started returning 404 for it, and `computeEmbedding`'s `if (!res.ok) return
null` swallowed that silently, so **every property published since RFC 007 shipped had
`embedding: NULL`** despite the code "succeeding". Fixed by centralizing embedding calls in
`supabase/functions/_shared/geminiEmbedding.ts`, migrated to `gemini-embedding-001` with
`outputDimensionality: 768` (its new default is 3072 - the `properties.embedding` column and
`match_properties`'s HNSW index are fixed at `vector(768)`) and manual L2 normalization (this model
doesn't auto-normalize non-default output dimensions, unlike the newer `gemini-embedding-2`). Also
added logging on non-OK Gemini responses so a future model deprecation is diagnosable from Edge
Function logs instead of silently producing `NULL` embeddings again.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Happy path via sidebar)**:
  - **Given** the user opens the sidebar and taps "Registrar Vivienda"
  - **When** the chat receives `/agregar-propiedad`
  - **Then** the assistant asks the user to describe the property in their own words.

- **Story 2 (Partial extraction, missing fields)**:
  - **Given** the user replies "Quiero vender mi piso en Chamberí de 3 habitaciones"
  - **When** the message is sent to `property-intake`
  - **Then** the assistant responds with a single message listing the still-missing required fields (e.g. precio, baños, m², dirección) and no row is written to Supabase.

- **Story 3 (Completion & confirmation)**:
  - **Given** all required fields have been collected
  - **When** the extraction reports `ready_to_confirm: true`
  - **Then** the assistant shows a draft summary and two chips: "Confirmar y publicar" / "Corregir algo"; tapping "Confirmar y publicar" calls `property-publish` and the new listing appears in the chat feed as a `PropertyCard`.

- **Story 4 (Correction loop)**:
  - **Given** the draft is complete and awaiting confirmation
  - **When** the user taps "Corregir algo" and types "en realidad son 4 habitaciones"
  - **Then** the draft is re-extracted with the correction merged in and the summary is re-shown for confirmation.

- **Story 5 (Cancel)**:
  - **Given** the user is mid-flow (collecting or confirming)
  - **When** the user sends "cancelar registro"
  - **Then** the draft is discarded and the chat returns to normal search mode.

---

## 4. Proposed Architecture & Public Contracts

### Data Model
```typescript
export type OperationType = 'sale' | 'rent';

export interface PropertyDraft {
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
`title` is never asked for — it is auto-generated server-side from the other fields at publish time (e.g. "Piso en venta en Chamberí, Madrid"). Required fields the user must supply: `property_type`, `operation_type`, `price`, `bedrooms`, `bathrooms`, `square_meters`, `city`, `address`.

### Schema Change
`operation_type` does not exist on `public.properties` today. Additive migration:
```sql
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS operation_type VARCHAR(10) NOT NULL DEFAULT 'sale'
  CHECK (operation_type IN ('sale', 'rent'));
```

### API Contracts

**`POST /functions/v1/property-intake`**
```json
// Request
{ "message": "Quiero vender mi piso en Chamberí de 3 habitaciones", "known": { } }

// Response
{
  "data": { "operation_type": "sale", "property_type": "Apartment", "city": "Madrid", "bedrooms": 3 },
  "missing_fields": ["price", "bathrooms", "square_meters", "address"],
  "assistant_message": "Me falta: precio, baños, metros cuadrados y dirección. Puede dármelos todos juntos o de a poco.",
  "ready_to_confirm": false
}
```

**`POST /functions/v1/property-publish`**
```json
// Request
{ "property": { "operation_type": "sale", "property_type": "Apartment", "city": "Madrid", "address": "Calle X", "price": 420000, "bedrooms": 3, "bathrooms": 2, "square_meters": 90 } }

// Response (200)
{ "property": { "id": "uuid", "title": "Piso en venta en Chamberí, Madrid", "status": "Available", ... } }

// Response (400) if server-side revalidation finds missing fields
{ "error": "Missing required fields", "missing_fields": ["price"] }
```

### Client Contracts
```typescript
// src/services/chatApi.ts
export function intakeProperty(message: string, known: PropertyDraft): Promise<PropertyIntakeResponse>;
export function publishProperty(draft: PropertyDraft): Promise<Property>;

// src/hooks/usePropertyRegistrationChat.ts
export function usePropertyRegistrationChat(): {
  state: { mode: 'idle' | 'collecting' | 'confirming'; draft: PropertyDraft; missingFields: string[] };
  start(): void;
  processMessage(text: string): Promise<{ assistantMessage: string; readyToConfirm: boolean }>;
  confirmPublish(): Promise<Property>;
  cancel(): void;
};
```

### Chat Integration
`src/app/index.tsx` recognizes `/agregar-propiedad` (and the sidebar "Registrar Vivienda" item, which now sends that same command) to call `start()`. While `mode !== 'idle'`, subsequent sends route through `processMessage`/`confirmPublish` instead of `sendChatQuery`. "cancelar registro" (case-insensitive) calls `cancel()` from any non-idle mode. `SuggestionChips` renders the confirm/correct actions while `mode === 'confirming'`.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- `property-intake` never writes to the database — Gemini output is only merged into a plain object client-controlled state, not executed as code or SQL.
- `property-publish` re-validates that all required fields are present and within basic bounds (positive numbers) server-side before inserting, even though the client already gates confirmation on completeness — the client is not trusted as the sole enforcement point.
- Both Edge Functions use the service-role key server-side only (same pattern as `chat-query`); the anon key on the client has no INSERT grant on `properties`.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Gemini unreachable/no key during intake | Fall back to regex heuristic extraction | 200 (degraded) |
| `property-intake` unreachable | Client falls back to local heuristic extraction (same function client-side) | n/a (client fallback) |
| `property-publish` missing required field | Reject, return which fields are missing | 400 Bad Request |
| `property-publish` unreachable | Client falls back to a direct `supabase.from('properties').insert()` using the anon key; if RLS rejects it, surface a clear error and keep the draft intact for retry | 200 fallback / surfaced error |
| Invalid numeric input (e.g. "precio: mucho") | Field left unset, re-asked as still-missing | 200 (degraded) |

---

## 6. Verification & Test Plan
- [ ] Unit Test: `property-intake` heuristic extraction merges partial fields correctly and computes `missing_fields`.
- [ ] Unit Test: `usePropertyRegistrationChat` state machine — start → collecting → confirming → publish → idle, plus cancel from any state.
- [ ] Unit Test: `chatApi.intakeProperty` / `publishProperty` — Edge Function success path and fallback path (mocking `supabase.functions.invoke`).
- [ ] Integration Test: `index.tsx` — typing `/agregar-propiedad` starts the flow; sidebar button sends the same command; full happy path ends with a `PropertyCard` rendered in the feed.
- [ ] Regression: `npm run typecheck`, `npm run lint`, `npm test` all green after removing the old wizard.
