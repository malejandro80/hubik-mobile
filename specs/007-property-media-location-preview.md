# RFC 007: Photos, Location & AI-Enriched Preview for Property Registration

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-16
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
RFC 004/005/006 built a chat-only registration flow ending in a plain-text draft summary with
"Confirmar y publicar" / "Corregir algo" chips. It never asks for photos, never captures a real
map location, has no AI-written description, and never populates `properties.embedding` — the
`match_properties` semantic-search RPC has existed since the first migration but has zero real
callers. This RFC extends the same chat flow (no new wizard screen) to collect photos, a pinned
location, an AI-generated description, and a fully editable rich preview before publish, with a
real semantic embedding stored at publish time.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] After the existing text fields are complete, the assistant asks for up to 10 photos; picked
      images upload to the existing `property-images` Supabase Storage bucket.
- [x] The assistant then asks for a precise location via an interactive map (tap/drag a pin),
      storing `latitude`/`longitude` on the draft.
- [x] Gemini generates a grounded Spanish description (no invented facts) from the known draft.
- [x] A rich, fully editable preview (styled like `property/[id].tsx`) is shown before publish,
      with chips to publish, correct text fields, change photos, or change location.
- [x] `property-publish` stores `images`, `latitude`/`longitude`, `description`, and computes a
      real `embedding` (Gemini `text-embedding-004`, 768 dims — matches the existing column)
      server-side from the description before inserting.

### Non-Goals (Out of Scope)
- Replacing `react-native-maps`/AWS S3 was considered and explicitly rejected — see Architecture.
- Making `property/[id].tsx` fully data-driven for *existing* seeded properties (only new
  registration-flow previews get real description/photos; legacy hardcoded sections stay for the
  demo data path).
- Auto-regenerating the AI description when a later text correction changes a field (available on
  request via a chip, not automatic).
- Any form of user auth / per-user photo or listing ownership (still out of scope project-wide).

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Photos)**: Given the draft's text fields are complete, when the assistant asks for
  photos, the user picks up to 10 (or skips), and thumbnails appear in the chat.
- **Story 2 (Location)**: Given photos are done, when the user taps "Fijar ubicación", an
  interactive OSM map opens pre-centered on the collected city/address; placing a pin and
  confirming stores coordinates and shows a reverse-geocoded confirmation in chat.
- **Story 3 (AI description + preview)**: Given location is set, the assistant generates a
  description and shows an editable preview card; "Ver vista previa completa" opens the full
  `property/[id]`-styled view with real data.
- **Story 4 (Edit loop)**: From the preview, "Corregir algo" re-enters the existing text-correction
  loop; "Cambiar fotos"/"Cambiar ubicación" return to those respective steps without losing other
  collected data.
- **Story 5 (Publish)**: Confirming publish inserts the row with images/coordinates/description
  and a real embedding; if embedding generation fails, the property still publishes.

---

## 4. Proposed Architecture & Public Contracts

### Why WebView+Leaflet over `react-native-maps`, and Supabase Storage over AWS S3
Both were explicitly decided with the user. `react-native-maps` requires a native module (a custom
EAS dev client instead of the current Expo Go workflow) and a billed Google Maps API key; a
`WebView` running Leaflet against free OpenStreetMap tiles gets the same interactivity
(pan/zoom/tap-to-place-pin) with zero native rebuild and zero new API keys. AWS S3 would introduce
an entirely new cloud provider, IAM credentials, and SDK into a project that is 100% Supabase
today, when the `property-images` Storage bucket already exists with a public-read policy.

### State Machine
`RegistrationMode`: `'idle' | 'collecting' | 'photos' | 'location' | 'generating_description' |
'confirming'`. `processMessage`'s `ready_to_confirm` branch now transitions to `'photos'` instead
of `'confirming'`. New `usePropertyRegistrationChat` methods: `addPhotos`, `skipPhotos`,
`setLocation`, `generateDescription`, mirroring the existing `processMessage`/`confirmPublish`
style.

### Data Model
```sql
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS description TEXT;
```
`images TEXT[]` and `embedding vector(768)` already exist; this RFC is the first real producer for
both. A Storage `INSERT` policy on `property-images` is added for direct client uploads (same
public trust boundary as the bucket's existing read policy — the app has no auth to scope by).

### Edge Functions
- **New `property-describe`**: `{ known: PropertyDraft } → { description: string }`, Gemini-backed,
  explicitly instructed not to invent facts, no fallback (same precedent as RFC 005's audio path).
- **`property-publish`**: gains `images`/`latitude`/`longitude`/`description` in its request body,
  validates them (image count ≤ 10, coordinate ranges), and computes `embedding` server-side via
  Gemini's embedding endpoint from `description` before inserting (fails open — publishes without
  an embedding if that call fails).

### Client
New files: `src/services/propertyImages.ts` (Storage upload, kept separate from the already
~600-line `chatApi.ts`), `src/components/ChatMapPicker.tsx` (modal WebView/Leaflet picker),
`src/components/PropertyPreviewCard.tsx` (compact chat-embedded preview, styled like
`PropertyCard.tsx`). Modified: `src/types/property.ts`, `src/hooks/usePropertyRegistrationChat.ts`,
`src/services/chatApi.ts`, `src/app/index.tsx`, `src/app/property/[id].tsx` (accepts real
description/images/coordinates when present; unchanged for today's seeded-property path).

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- Storage uploads are direct client-to-bucket (anon key), matching the bucket's existing
  public-read trust boundary; there is no per-user ownership to enforce since the app has no auth.
- `property-publish` remains the sole DB-write authority and re-validates image count and
  coordinate ranges server-side, consistent with RFC 004's existing "client is not the sole
  enforcement point" principle.
- The AI-generated description is grounded only in already-validated draft fields; the system
  instruction explicitly forbids fabricating amenities/facts not present in the draft.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Image upload fails | Show error, let user retry that photo or skip | n/a (client-side) |
| `property-describe` unreachable | Surface error; user can type a description manually via "Corregir algo" | 502 |
| Embedding generation fails at publish | Publish anyway with `embedding: null` | 200 (degraded) |
| >10 images submitted | Reject | 400 |
| Coordinates out of range | Reject | 400 |

---

## 6. Verification & Test Plan
- [x] Unit Test: `propertyImages.uploadPropertyImages` — success path, per-file error handling.
- [x] Unit Test: `usePropertyRegistrationChat` — `addPhotos`/`skipPhotos`/`editPhotos`/
      `editLocation`/`setLocation`/`generateDescription` state transitions.
- [x] Unit Test: `chatApi` extensions — request/insert shape for the new fields.
- [ ] Unit Test (Deno): `property-describe`/`property-publish` new branches. **Not done** — same
      documented, repo-wide gap as RFC 005/006 (no Deno test harness for any Edge Function).
- [x] Regression: `npm run typecheck`, `npm run lint`, `npm test` all green (34 suites, 177 tests).
- [ ] Manual on-device: photo picking/upload, map pin placement/round-trip, description grounding,
      full publish verified via `mcp__supabase__execute_sql`. **Not done in this session** — needs
      a real device/simulator; also blocked until the pending migration and Edge Function
      redeploys below are applied.

### Amendment (PR review, 2026-09-17): local photo staging + grid management
The original flow uploaded each picked photo to `property-images` immediately on pick, and gave
no way to delete, reorder, or change the cover photo from the chat. Changed to:
- **Deferred upload**: `usePropertyRegistrationChat.addPhotos` now only stages picked `file://`
  URIs into `draft.images` — no network call. `confirmPublish` uploads every staged local URI as
  a single batch (`uploadPropertyImages`, order-preserving) immediately before calling
  `publishProperty`, so photos the user later removes are never uploaded at all.
- **Grid management**: new `src/components/PropertyPhotoGrid.tsx` (+ isolated
  `.styles.ts`), rendered in `index.tsx` while `registration.state.mode === 'photos'`. Each
  thumbnail gets a delete button and ⬆️/⬇️ reorder buttons (no new dependency — plain array
  swap/splice via new hook methods `removePhoto(index)` / `movePhoto(index, direction)`); index 0
  is visually badged "Portada" and is what `image_url: draft.images?.[0]` already used at publish.
- **"Edit position" (line 27 comment)**: already covered by the existing "Cambiar ubicación" chip
  (`index.tsx`, wired to `registration.editLocation()`) on the confirming screen, plus the
  draggable pin inside `ChatMapPicker` itself — verified on-device, no new control added.

### Notable fix made along the way
While wiring the richer preview flow, the chat's message `id`s (`` `assistant-${Date.now()}` ``)
could collide when two messages were appended within the same millisecond — this flow now chains
several appends in quick succession (photos → location → description → preview), which is exactly
when it started surfacing (as duplicate `FlatList` keys silently dropping a message). Fixed by
adding a random suffix to every generated message id (`generateMessageId` in `index.tsx`). Also
found and fixed a related `FlatList` virtualization gap: with no `initialNumToRender`, react's test
renderer never grows the render window past the default 10 items once the list exceeds it (no real
layout/scroll events to trigger growth) — the same "stuck at 10 items" cap in the underlying
`VirtualizedList` could show as delayed/missing recent messages before the user scrolls. Fixed by
setting `initialNumToRender={50}` on the chat `FlatList`.
