# RFC 021: Full photo gallery

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; verified on the iOS simulator (open, swipe, thumbnail jump, close); web view checked together with RFC 022
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends the property screen and the shared page (RFC 019/020)

---

## 1. Problem Statement & Motivation
The in-app property screen and the shared web page show only the cover photo and a "1 de N fotos" badge. Nobody can see the other pictures.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] Tapping the main photo (or the count badge) opens a full-screen viewer with all the listing's photos.
- [ ] Swipe between photos; a "2 de 5" counter; a strip of thumbnails along the bottom (current highlighted, tap to jump); a close button
      and the system back gesture / Escape.
- [ ] On the web: visible previous and next buttons and keyboard arrows (a mouse cannot swipe).
- [ ] Used by the in-app property screen (including the listing preview) and by the shared web page.

### Non-Goals (Out of Scope)
- Pinch or double-tap zoom, sharing or saving a photo, captions, video, reordering or editing; galleries in chat cards; upload changes.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - open**: **Given** a listing with photos, **When** the visitor taps the main photo or the badge, **Then** a full-screen viewer opens
  on the first photo (badge text unchanged, "1 de N fotos"; accessibility label "Ver todas las fotos (N)").
- **Story 2 - browse**: swiping horizontally, or tapping a thumbnail, shows that photo; the counter reads "3 de 5"; the thumbnail strip highlights it.
- **Story 3 - web**: previous and next buttons (48 points) and the Left/Right arrow keys move between photos; previous is disabled on the
  first photo and next on the last. They do not appear on phones.
- **Story 4 - close**: the close button, the Android back button and Escape on the web close the viewer and return to the listing.
- **Story 5 - one photo**: the viewer opens with no counter, strip or arrows.
- **Story 6 - none**: a listing with no photos shows "Sin fotos" and nothing opens.
- **Story 7 - sources**: works with https photos and with local `file://` photos (listing preview).
- **Story 8 - accessibility**: every photo is labelled "Foto 2 de 5"; all controls are buttons with labels and at least 48 points.

---

## 4. Proposed Architecture & Public Contracts
- `src/components/PhotoGallery.tsx` (+ `PhotoGallery.styles.ts`): `{ visible, images, initialIndex?, onClose }`. A React Native `Modal` (works on native
  and web) that mounts its content only while visible, so each opening starts fresh. Content: black background, top bar (close button,
  counter), a horizontal paging `FlatList` of `Image resizeMode="contain"` (`getItemLayout`, `initialScrollIndex`, index kept from
  `onMomentumScrollEnd`), a horizontal thumbnail `FlatList` that scrolls to keep the current one in view, and, on the web only, the two arrow buttons.
- `src/hooks/useGalleryKeys.ts`: Left/Right key listener, active only on the web while the viewer is open.
- `src/hooks/usePhotoGallery.ts`: `{ galleryVisible, openGallery, closeGallery }` shared by both screens.
- `SharedPropertyView`: the hero becomes a button (label "Ver todas las fotos (N)") when there are photos; it opens the viewer. Photos are
  `images`, or `[image_url]` when the list is empty.
- `property/[id].tsx`: same, using the photos parsed from the `images` route parameter; screens showing stock or mock content (no `images`)
  are not tappable.
- Labels in `labels.gallery`; constants (colours, sizes) in `src/constants/gallery.ts`. Client only: no native rebuild, no server change.

---

## 5. Security & Error Handling
- Photos are shown by URL only; nothing from the URL is executed. Local URIs come from the picker.
- An image that fails to load leaves its dark area empty; navigation still works.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| No photos | Hero not tappable | "Sin fotos" as before |
| Index out of range (list changes) | Clamped | Nearest valid photo |
| Web without a keyboard | Buttons still work | Navigation possible |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `useGalleryKeys.test.ts`: arrows call the handlers on the web only, only while enabled, cleanup on unmount.
- [ ] `PhotoGallery.test.tsx`: hidden, opens at `initialIndex`, counter, swipe updates it, thumbnails jump, close, single photo, web buttons and
      their disabled ends, labels.
- [ ] `SharedPropertyView.test.tsx` and `propertyDetail.test.tsx`: tapping the hero opens the viewer; no photos or mock content not tappable.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] Browser check of the shared page (desktop and phone width) and the iOS simulator on a listing with several photos.
- [ ] Update the feature graph and the session log.

---

## 7. Open Questions
- Pinch-zoom (Gesture Handler and Reanimated are already installed), sharing a single photo.

---

## 8. Implementation notes (2026-09-21)
- Built as designed (`PhotoGallery`, `useGalleryKeys`, `usePhotoGallery`, `labels.gallery`, `constants/gallery.ts`); wired into `SharedPropertyView` and `property/[id].tsx`.
- **Layout bugs found on the simulator and fixed** (jest cannot see layout): (1) inside a React Native `Modal` a `flex: 1` container collapses, so the container gets an explicit window width and height; (2) a horizontal `FlatList` defaults to `flexGrow: 1`, so the thumbnail strip stole half the spare height until it got `flexGrow: 0`; (3) the pages take their height from the measured pager area; (4) the status bar was black on black, so the viewer sets a light status bar while open.
- Legacy demo listings (stock content, no `images`) keep their fake "1 de 8 fotos" label and are not tappable, as scoped.
- `property/[id].tsx` is now about 415 lines (it was 396, already over the ~300 guideline); extracting its hero into a component is a follow-up.
- **Close button unreachable on iOS (bug reported by the owner, fixed 2026-09-21)**: inside the `Modal` the safe-area padding was not applied on some mounts, so the cross was drawn over the status bar clock where taps do not arrive. I had missed that this is the same problem already fixed in the photo-ordering screen. Both modals now use `ModalSafeArea` (a `SafeAreaProvider` seeded with `initialWindowMetrics`), and the gallery has a regression test that it brings its own provider. Lesson: I had "closed" the viewer in an earlier check by tapping where the cross should have been and never looked at the result; a close must be confirmed with a screenshot.

