# RFC 015: Listing preview and photo ordering (amends RFC 012)

- **Author**: Claude Code (from the owner's device test, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; exercised on the iOS simulator as an agent (drag, arrows, Listo, preview, back); not yet run on Android
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 012 (AI listing composer)

---

## 1. Problem Statement & Motivation
Testing the composer on a device (9 of 9 data, 3 photos, pin set, Publicar enabled) exposed two gaps:
1. **No preview.** RFC 012 removed the old preview card and replaced it with a panel that only lists fields, so the
   agent cannot see how the listing will look before publishing.
2. **Photo order is hard to change.** The only controls are two 28-point arrows inside the panel, which is collapsed
   by default and below the 44-point touch minimum. The first photo is the cover, so order matters.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] A **Vista previa** button opens the real property detail screen fed with the draft (photos in the chosen order,
      price, description, map pin). A banner says nothing has been published; back returns to the composer with the
      draft intact.
- [ ] An **Ordenar fotos** screen: large thumbnails, press-and-hold to drag into place, the first one marked
      **Portada**. Large up and down buttons as the non-drag alternative (screen readers, easier one-handed use).
      Applied only when the agent taps **Listo**; **Cancelar** discards.
- [ ] Both are easy to find: **Ordenar** appears in the composer bar once there are 2 or more photos; **Vista previa**
      appears in the panel when the draft is ready.

### Non-Goals (Out of Scope)
- Deleting or adding photos from the ordering screen (the existing grid and picker still do that).
- Editing text inside the preview (edit from the panel).
- Preview of an incomplete draft (needs the required fields).
- Any server, database or Edge Function change.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - preview**: **Given** a draft with all required fields, **When** the agent taps Vista previa, **Then** the
  detail screen opens showing their photos in order, price, description and pin, with a "Vista previa" banner, no
  description request to the server, and no "ask a question" bar; **When** they go back, **Then** the composer,
  draft and photos are exactly as they left them.
- **Story 2 - discoverability**: with fewer than 2 photos there is no Ordenar button; with 2 or more it appears next
  to Fotos. Vista previa is disabled with an explanation until the draft is ready.
- **Story 3 - drag**: **When** the agent presses and holds a photo and drags it, **Then** the list reorders live;
  the first row shows Portada.
- **Story 4 - buttons**: each row has large up and down buttons (disabled at the ends) with labels such as "Mover
  foto 2 hacia arriba", so the order can be changed without dragging.
- **Story 5 - confirm or discard**: Listo applies the new order to the draft (the cover changes, the preview and the
  published listing follow it); Cancelar leaves the draft unchanged.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Preview
- `DraftPanel` gains `onPreview` and a **Vista previa** button (in the ready hint line and at the top of the expanded
  body), enabled only when `isReadyToPublish(draft)`.
- `index.tsx` handles it with the existing helpers: `buildDraftPreviewProperty(draft)` then `buildPropertyRouteParams(...)`,
  plus a new `preview: '1'` route param, then `router.push('/property/[id]')`. Photos are local `file://` URIs passed
  through the existing `images` param (JSON, at most 10). The composer state lives in the home screen, which stays
  mounted under the pushed screen, so back restores everything.
- `src/app/property/[id].tsx` (preview mode only): shows a banner, never calls the description service, and hides the
  quick-question bar. Normal browsing is unchanged.

### 4.2 Photo order
- `src/lib/photoOrder.ts` (pure, tested first): `moveItem(list, from, to)` and `isSamePhotoSet(a, b)`.
- `usePropertyRegistrationChat` gains `setPhotos(uris)`, which applies a new order **only if it is a permutation of
  the current photos** (no additions or removals through this path).
- `src/components/PhotoOrderModal.tsx` (+ styles): full-screen `Modal` (like `ChatMapPicker`), working copy of the
  photos, rows with a drag handle, a 72-point thumbnail, "Portada" or "Foto N", and 48-point up and down buttons.
  Drag uses `react-native-reorderable-list` (JS only; it builds on the already installed Gesture Handler and
  Reanimated, so **no native rebuild**). Listo calls `setPhotos`; Cancelar discards.
- `ChatInputBar` attachments gain an optional `onOrderPhotos`; an **Ordenar** button shows when `photoCount >= 2`.
- Root layout wraps the app in `GestureHandlerRootView` (required by the library).
- New dependency: `react-native-reorderable-list` (pinned; its peers, Gesture Handler >= 2.12 and Reanimated >= 3.12,
  are satisfied by the installed 2.32 and 4.5). **Fallback** if it misbehaves on device with Reanimated 4: ship the
  arrows-only ordering screen and report it.

### 4.3 Deploy
Client only. No migration, no Edge Function.

---

## 5. Security & Error Handling
- The preview uses only data the agent already typed, passed as local navigation params; no network, no new trust
  boundary. Nothing is published and no AI call is made.
- `setPhotos` refuses anything that is not a reordering of the current photos, so the ordering screen cannot inject
  URLs. Photos still upload only at publish (RFC 007).
- The dependency is pure JS from npm; it is pinned and the lockfile committed.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Preview tapped before ready | Button disabled with a reason | Nothing happens |
| Ordering result is not a permutation | `setPhotos` ignores it | Draft unchanged |
| Photos removed while the ordering screen is open | Working copy is discarded on close | Draft unchanged |
| Drag library fails on device | Arrows in the same screen still work | Order can still be changed |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `src/lib/__tests__/photoOrder.test.ts`: moves forward, backward, to the ends, out-of-range ignored, permutation check.
- [ ] Hook test: `setPhotos` accepts a reordering, ignores additions, removals and duplicates, keeps everything else.
- [ ] `PhotoOrderModal.test.tsx` (library mocked): rows and labels, Portada on the first, arrows reorder and disable at
      the ends, Listo returns the new order, Cancelar returns nothing.
- [ ] `DraftPanel.test.tsx`: Vista previa disabled until ready with a reason, calls `onPreview` when ready.
- [ ] `ChatInputBar.test.tsx`: Ordenar only with 2 or more photos and calls its handler.
- [ ] `index.test.tsx`: Vista previa pushes the detail route with the draft's photos in order and `preview: '1'`;
      Ordenar opens the screen; Listo changes the order shown in the panel.
- [ ] `propertyDetail.test.tsx`: in preview mode a banner shows, no description call is made, the question bar is hidden;
      normal mode unchanged.
- [ ] `scripts/verify.sh check-all`, full jest excluding `.kilo/worktrees` run three times, no comments in new code.
- [ ] Manual on the iOS simulator: drag on a real photo set (the dependency is the risk), then the same on Android.
- [ ] Update the feature graph, RFC 012 (preview restored) and the session log.

---

## 7. Open Questions
- If drag proves unreliable with Reanimated 4, decide whether to keep the arrows-only screen or replace the library.

---

## 8. Implementation notes & deviations (2026-09-21)
- Built as designed: `photoOrder` lib, `setPhotos` (permutation only), `PhotoOrderModal`, `ChatInputBar` **Ordenar** (2+ photos and a handler), `DraftPanel` **Vista previa** (always shown, disabled with the existing hint until ready), detail-screen preview mode (`preview=1`), and `useDraftReview` (new, keeps `index.tsx` from growing further).
- **No root `GestureHandlerRootView`**: the ordering screen is a native `Modal`, whose content lives outside the app's root view on Android, so it carries its own `GestureHandlerRootView` and a `SafeAreaProvider` seeded with `initialWindowMetrics`. Nothing else in the app needs gestures.
- **Found on the simulator (fixed)**: the header of the ordering screen sat under the status bar (a `Modal` needs its own `SafeAreaProvider`); with three attachment buttons ("Fotos", "Ordenar", "Ubicación") the last one was cut off at the right edge, so the row now wraps.
- **Drag risk retired on iOS**: press-and-hold drag works with Reanimated 4.5 / Gesture Handler 2.32 in the dev build; the arrow buttons work independently of it.
- **Test tooling**: Gesture Handler's official Jest setup is now in `jest.config.js`, and `__mocks__/react-native-reorderable-list.js` replaces the library (Reanimated's worklets cannot initialise under Jest); `PhotoOrderModal.test.tsx` overrides it to capture `onReorder`.
- **Known limits**: the existing property screen shows only the cover photo and a count, so the preview shows the cover and "1 de N fotos", not a gallery; the price still renders with `$` (existing formatter, unrelated). Android not yet run.

