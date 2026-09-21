# RFC 012: AI Listing Composer (single composer, live draft, no steps)

- **Author**: Claude Code (from the approved scope brief, 2026-09-20)
- **Status**: Approved (2026-09-20) - implemented; `property-intake` deployed (v19); exercised on the iOS simulator as an agent (2026-09-21): draft panel, live fill and cadastral-last confirmed; publish, photos and map not yet run on a device
- **Created**: 2026-09-20
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant (extends RFC 004/007/008/010/011)

---

## 1. Problem Statement & Motivation
Agents create listings through a fixed sequence driven by the assistant: `collecting` (text) ->
`photos` -> `location` -> AI description -> `confirming`. Three problems, all rooted in the mode
state machine in `usePropertyRegistrationChat`:

1. **Re-walking**: on any text message the hook sets `mode = ready_to_confirm ? 'photos' : 'collecting'`
   unless the mode is already `confirming`. Correcting a field while in `photos` or `location` sends
   the agent back through steps already completed.
2. **Rigid order**: photos and the pin can only be given at their step; the cadastral reference is
   demanded first (`buildAssistantMessage` returns only the catastro question while it is missing).
3. **No visibility**: the draft is shown as repeated text. `LivingDraftCard` (RFC 008) was built and
   tested but is never rendered by `src/app/index.tsx`, so the agent cannot see what is filled, what is
   missing, or what to improve.

Goal: creating a listing feels like talking to an AI tool. The agent describes the property in one
message (or several), attaches photos and drops a pin from buttons beside the text box, in any order,
watches a live draft fill in, fixes anything with a tap or a sentence, and publishes.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] No step machine: the creation state is a draft plus derived status. A correction changes only
      the field it targets and never moves the agent anywhere (regression test for problem 1).
- [ ] One composer: `ChatInputBar` shows attach-photos and drop-pin buttons while composing; photos and
      the pin go straight into the draft, in any order, at any time. Mic stays.
- [ ] A live draft panel above the composer shows every required field as OK / missing / new,
      plus photos, pin, amenities, description and suggestions; collapsed by default to a one-line
      progress bar.
- [ ] Tap any field to fix it (local, validated, no AI call), or say the fix in a message (existing
      intake merge).
- [ ] Suggestions (max 3, rule-based, local): completeness hints and description tips.
- [ ] Cadastral reference is asked last (still required to publish, same duplicate guard).
- [ ] Photos (max 10) and pin optional to publish; nudged by suggestions.
- [ ] Publish from the panel with a confirmation; typing or saying "publicar" also works when ready.

### Non-Goals (Out of Scope)
- Persisting drafts across app restarts (draft stays in memory, as today).
- Editing or deleting published listings.
- Address -> pin suggestion, AI reading photos, price check against similar listings (slice 2, RFC 013).
- Any change to search, roles, RLS, migrations, or the `properties` schema.
- New Edge Functions. Only `property-intake` changes (question ordering, no contract change).
- Removing the chat log: assistant replies still appear as messages.

### Alternatives considered
- *Dedicated "Create with AI" screen*: rejected in scoping (same chat, one composer).
- *Keep the modes but let the agent skip/jump*: keeps the bug class (any transition can misfire).
- *Corrections only through messages*: rejected; a tap on the field is faster and cheaper (no AI call).

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - any order, one message**: **Given** a signed-in agent who started creation, **When** they
  attach 2 photos, drop a pin and send "Piso en venta en Valencia, 3 habitaciones, 2 baños, 90 m2,
  precio 180 mil, calle Colón 12", **Then** the panel shows those fields as OK/new, "2 fotos" and the
  pin set, and lists only the still-missing items (catastro) - without any step change.
- **Story 2 - correct without re-walking**: **Given** a complete draft with photos and pin, **When** the
  agent taps Precio and types 175000, or sends "el precio es 175 mil", **Then** only the price changes and
  photos, pin, description and every other field are untouched, with no step prompts.
- **Story 3 - see what is missing**: **Given** any draft, **Then** each required field shows an icon
  plus a word (Listo / Falta / Nuevo), never colour alone, and up to 3 suggestions appear.
- **Story 4 - cadastral last**: **Given** a message without a catastro, **Then** the assistant never
  asks for it while other required fields are missing; when only it is missing it asks once.
- **Story 5 - publish**: **Given** all required fields, **When** the agent taps Publicar and confirms,
  **Then** the listing is published with images and pin, and the composer resets. **Given** a missing
  required field, **Then** Publicar is disabled and says how many are missing.
- **Story 6 - description**: **Given** the required fields first become complete, **Then** the AI
  description is generated once automatically; it can be regenerated from the panel; if key fields
  change afterwards a tip suggests regenerating.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 State model (replaces `RegistrationMode`)
```typescript
export type ComposerPhase = 'idle' | 'composing';

export interface ComposerState {
  phase: ComposerPhase;
  draft: PropertyDraft;
  recentlyChanged: (keyof PropertyDraft)[];
  describing: boolean;
  describedFrom: string | null;
}
```
The modes `collecting | photos | location | generating_description | confirming` are removed.
`usePropertyRegistrationChat` is rewritten in place (same file and name, new API) to limit import churn:

```typescript
start(): void;
cancel(): void;
processMessage(text): Promise<IntakeOutcome>;
processAudioMessage(audio): Promise<IntakeOutcome & { transcript: string }>;
updateField(field, value): FieldEditResult;
addPhotos(uris): { images: string[] };
removePhoto(index): void;
movePhoto(index, direction): void;
setLocation(latitude, longitude): void;
clearLocation(): void;
updateAmenities(amenities): void;
requestDescription(): Promise<{ description: string }>;
confirmPublish(): Promise<Property>;
```
`setLocation` only stores coordinates (today it also flips the mode and triggers description generation).
`processMessage` merges the intake response and computes `recentlyChanged` by diffing the draft before and
after; it never changes `phase`. `requestDescription` runs automatically once when
`isReadyToPublish(draft)` first becomes true and `description` is empty (same single AI call as today, moved
from "after the pin" to "when complete").

### 4.2 Pure logic (new, unit-tested first)
- `src/lib/draftStatus.ts`: `getFieldStatuses(draft, recentlyChanged)` -> `{ field, status: 'ok' | 'missing' | 'changed' }[]`;
  `getSuggestions(draft, describedFrom)` -> ordered, capped at `MAX_SUGGESTIONS`;
  `isReadyToPublish(draft)`; `getMissingCount(draft)`.
- `src/lib/draftValidation.ts`: `validateDraftField(field, raw)` -> `{ ok: true, value } | { ok: false, error }`,
  mirroring `property-publish` rules (price > 0, square_meters > 0, bedrooms >= 0 integer, bathrooms >= 0,
  text trimmed and length-capped, enums from the existing type lists, catastro uppercased).
- `src/constants/draftSuggestions.ts`: thresholds and message keys (`MIN_RECOMMENDED_PHOTOS = 3`,
  `MIN_DESCRIPTION_LENGTH`, `MAX_SUGGESTIONS = 3`, priority order). Copy lives in `labels.ts`.

Suggestion rules (all local, no network): few photos; no pin; no amenities; no description (offer AI
draft); short description; description stale (fields changed since `describedFrom`).

### 4.3 UI modules
- `ChatInputBar` gains an optional `attachments` prop (`onAddPhotos`, `onPickLocation`, `photoCount`, `hasPin`),
  rendered only while composing; buttons >= 48dp with accessibility labels; photo button shows a count badge.
- `LivingDraftCard` (kept; existing tests must still pass) is extended with optional props for statuses, inline
  editing (`onEditField`) and the new/changed marker. Existing props stay compatible.
- New `DraftPanel` (sticky above the composer, collapsible, max 60% height, scrollable): composes
  `LivingDraftCard`, `PropertyPhotoGrid` (reorder/cover/delete, RFC 007), a pin row that opens
  `ChatMapPicker` (RFC 007), `AmenitiesConfirmation` (RFC 010), the description block (generate/regenerate),
  the suggestions list and the Publicar button. It replaces the `renderListFooter` usage in `index.tsx`.
- New `useRegistrationConversation` hook: the registration text/audio handling now embedded in
  `src/app/index.tsx` (`handleSend`, `handleSendAudio`, `handleLocationConfirmed`) moves here. `index.tsx`
  must end smaller than it is now (705 lines; the ~300-line guideline is already exceeded and this RFC must
  not grow it). Target for the new hook: under 300 lines.
- `src/lib/chatRegistration.ts`: `isContinueIntent` and the step-only stage logic in
  `formatOutcomeMessage` are removed; `isConfirmIntent`, `isPhotosIntent`, `isLocationIntent`,
  `CANCEL_PHRASES` stay (they now trigger actions, not steps).

### 4.4 Server: `property-intake` (no contract change)
`buildAssistantMessage` moves to `supabase/functions/_shared/intakeMessage.ts` as a pure function (testable
by Jest like `agentAccess.ts`). New rules: (a) if any field other than `catastro` is missing, ask only about
those; (b) ask for `catastro` only when it is the sole missing required field; (c) the opening prompt
(nothing known yet) invites a free description and mentions photos and the map instead of asking for the
catastro. `missing_fields`, `ready_to_confirm`, the duplicate guard and 401/403 gating are unchanged. The
client fallback `parsePropertyDraft` in `chatApi.ts` mirrors the same ordering (existing twin precedent).

### 4.5 Data model
None. No migration. Draft state stays in memory; photos upload at publish as today (RFC 007).

### 4.6 Deploy
Redeploy `property-intake` via the Supabase MCP after the client change is verified. Old app builds keep
working (same response shape); they just keep the old question order.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- Publishing stays agent-only, enforced server-side (RFC 011 `requireAgent`); the client gate is UX only.
- Inline edits are validated on the client with the same rules the server applies in `property-publish`,
  which remains the enforcement point. No new endpoint, no new trust boundary.
- A catastro typed in a field is sent through the intake path so the duplicate guard runs; all other
  inline edits are local.
- Photos are local `file://` URIs until publish; pin coordinates are range-checked (existing).
- No new personal data; no secrets; no `user_metadata`-based authorization.

### Failure Modes
| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Photo permission denied | Show a plain message with how to enable it | Draft unchanged |
| Picker cancelled | Nothing happens | Draft unchanged |
| More than 10 photos | Add up to the limit, tell the agent | Draft keeps first 10 |
| `property-describe` fails | Keep draft; show retry on the description block | Publishing still allowed without a description |
| Intake unreachable | Existing local-heuristic fallback | Draft updated locally |
| Invalid inline value | Field shows a short reason, value not applied | Draft unchanged |
| Upload or publish fails | Existing error message; draft and photos preserved | Agent can retry |
| Caller not an agent (401/403) | Existing gate | Creation refused with the existing copy |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `src/lib/__tests__/draftStatus.test.ts`: statuses, suggestion rules and priority, cap of 3, readiness, missing count.
- [ ] `src/lib/__tests__/draftValidation.test.ts`: every field's accept/reject cases, catastro normalisation.
- [ ] Hook tests: **re-walk regression** (correcting a field in any state changes only that field and no phase);
      `updateField`; `setLocation` has no side effects; single automatic description; `recentlyChanged` diff.
- [ ] `_shared/__tests__/intakeMessage.test.ts`: catastro never asked while others are missing; asked alone last;
      free-description opening prompt.
- [ ] Components: `LivingDraftCard` statuses and inline edit (existing tests untouched); `DraftPanel` collapsed and
      expanded, publish disabled reason; `ChatInputBar` attach buttons only while composing.
- [ ] `src/app/__tests__/index.test.tsx`: the 8 registration tests cover the step-by-step flow, which this RFC
      replaces; they are rewritten for the composer flow because the requirement changed, never weakened. The
      commit message must say so.
- [ ] Security check: pre-commit secret scan; confirm server publish rules still reject invalid values.
- [ ] `scripts/verify.sh check-all` green; jest run excluding `.kilo/worktrees`.
- [ ] Manual (iOS simulator and Android dev build): Stories 1 to 6, including small-phone layout with the keyboard open.
- [ ] Update `.agents/rules/07-feature-graph.md` (RFC 012 node) and the session log.

---

## 7. Open Questions / Slice 2 input
- Slice 2 (RFC 013): `expo-location` is already a dependency (reverse geocoding), so address -> pin may use its
  forward `geocodeAsync` (the device's OS geocoder) with no new vendor; to be confirmed. Photo reading would use
  the existing Gemini stack (vision), which adds cost per listing.
- `intakeProperty` falls back to the local heuristic on any Edge Function error, which since RFC 011 also hides
  401/403 from a non-agent. Not changed here; worth its own fix.
- Panel height on very small phones with the keyboard open must be checked on-device; the 60% cap is a
  starting point.

---

## 8. Implementation notes & deviations (2026-09-20)
- **New `DraftFieldRow`** holds the row and its inline editor; `LivingDraftCard` only gained an optional editable mode (its 4 existing tests are untouched). `DraftDescriptionBlock` was split out of `DraftPanel` to keep both small.
- **Auto description** is triggered from the moments readiness can change (an AI answer or an inline edit), not from an effect, plus an in-flight ref so it never runs twice. Stale AI answers after `cancel()` are ignored, and photos or the pin added while the AI is answering are kept.
- **Publish always confirms.** Tapping Publicar, or typing/saying a short "publicar", opens the same confirmation alert; a stray "ok" can never publish by itself. Commands like "fotos" or "mapa" (and the publish phrases) only count when the message is at most 4 words, so a description that mentions "ubicación" is never swallowed as a command.
- **Already composing:** sending `/agregar-propiedad` again no longer resets the draft; "Reiniciar Chat" now also cancels an open composer.
- **Removed:** `formatOutcomeMessage` and its stage tests (step logic), the chat-side photo grid/amenities footer and the description-after-pin flow. `isContinueIntent` stays because `isPhotosIntent` uses it ("no tengo fotos" must not open the picker).
- **Preview card:** the draft-preview property card that used to appear in the chat before publishing is gone; the panel (fields, photos, pin, amenities, description) is the review surface.
- **Catastro edits** made in the panel go through the normal message path so the server duplicate check runs; other inline edits are local.
- **Tests changed because the requirement changed (not weakened):** `chatApi.test.ts` (catastro-first test replaced by never-first / alone-last / free-description invite), `index.test.tsx` (the 8 step-by-step registration tests rewritten as 14 composer-flow tests), `index.auth.test.tsx` (opening-prompt text), and `usePropertyRegistrationChat.test.ts` (mode-transition cases replaced by the composer contract, including the no-re-walk regression).

---

## 9. Amendment (2026-09-21, RFC 015)
The panel only listed fields, so a finished draft could not be seen as it will look. RFC 015 restores the preview as a **Vista previa** button that opens the real property screen in preview mode, and adds photo ordering (**Ordenar** in the composer bar). See `specs/015-listing-preview-and-photo-order.md`.

