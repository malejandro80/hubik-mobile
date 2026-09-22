# RFC 022: "Abrir en la app" from the shared web page

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; verified on the iOS simulator (deep link opens the listing; bad address returns to start) and in a browser (button, not-opened hint); universal links still deferred
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 019/020 (shared page); universal links stay deferred

---

## 1. Problem Statement & Motivation
People who already have the app still land on the web page and have no way into the app. A browser cannot tell whether an app is installed;
the reliable mechanism (universal links and Android app links) needs an Apple Team ID, the Android signing fingerprint, a native rebuild
and association files, so it waits for the store release. Meanwhile the app's own link scheme (`hubikmobile://`, already registered) can be tried by a button.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] The web install sheet gains a primary **Abrir en la app** button that opens `hubikmobile://p/<the listing's slug>`; **Descargar la app** and
      **Seguir en el navegador** stay.
- [ ] After the tap the page checks whether it is still in the foreground; if so it says the app did not open and keeps the download option visible.
- [ ] In the app, that link opens the listing's normal property screen (as "Ver detalle" does), loaded by its address; an unknown or removed
      listing goes back to the start screen.

### Non-Goals (Out of Scope)
- Universal links and Android app links, automatic detection, smart banners, deferred deep linking after install.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - button**: **Given** a loaded listing, **Then** the sheet shows **Abrir en la app** (primary), **Descargar la app** or "Próximamente", and
  **Seguir en el navegador**. With no listing (not found, error, loading) the open button is absent.
- **Story 2 - open**: **When** tapped, the browser navigates to `hubikmobile://p/<slug>` (slug of that listing).
- **Story 3 - opened**: if the page becomes hidden within 1.8 seconds (the app took over), nothing more is shown.
- **Story 4 - not opened**: if the page is still visible after 1.8 seconds, the sheet shows "¿No se abrió? Puede que todavía no tenga la app
  instalada." above the download button; tapping **Abrir en la app** again retries.
- **Story 5 - in the app**: opening `hubikmobile://p/<slug>` (or `?id=<uuid>`) shows a short loading state, then replaces it with the property
  screen for that listing, identical to opening it from a search result; back returns to where the user was.
- **Story 6 - bad link in the app**: an unknown, removed or malformed address, or a network error, replaces the screen with the start screen.
- **Story 7 - safety**: only the fixed scheme plus a slug built from the loaded listing is ever opened; nothing from the page URL is opened.

---

## 4. Proposed Architecture & Public Contracts
- `src/constants/appLink.ts`: `APP_LINK_SCHEME = 'hubikmobile'` (matches `app.json`), `OPEN_APP_CHECK_MS = 1800`.
- `src/lib/appLink.ts` (pure, tested first): `buildAppLink({ id, title })` returns `hubikmobile://p/<slug>` or `null` for a non-listing id.
- `src/hooks/useOpenApp.ts`: `(appLink) => { status: 'idle' | 'trying' | 'not_opened'; open }`. `open` navigates with `document.location.assign`,
  starts a 1.8 s timer and listens for `visibilitychange`; a hidden page cancels the check; still visible when it fires means `not_opened`.
  Web only, cleaned up on unmount.
- `InstallSheet` gains `appLink: string | null`, `openStatus` and `onOpenApp`; the layout becomes: open (primary), download (secondary outline), dismiss (text).
- `SharedPropertyPage` passes `appLink` when a listing is loaded.
- Routes `p/index.tsx` and `p/[slug].tsx` render `SharedListingRoute`: on the web the RFC 019 page, on native `SharedListingRedirect`, which loads the
  listing with `useSharedProperty` and calls `router.replace('/property/[id]', buildPropertyRouteParams(property))`, or `router.replace('/')` when not found or on error.
  (A single component branching on `Platform.OS` rather than `.native.tsx` files, so both paths are testable in jest.)
- Labels in `labels.sharedProperty.sheet`. Client only; no native rebuild; no server change.

---

## 5. Security & Error Handling
- The opened URL is the constant scheme plus a slug generated from the listing (`[a-z0-9-]` only); the page URL and query never flow into it.
- The in-app route validates the address with the same `parseListingRef` as the web page and reads only public listing columns.
- On iOS the system asks "¿Abrir en hubik-mobile?"; if the app is missing Safari may show its own error. The not-opened hint is deliberately neutral.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| App not installed | Page stays visible; hint after 1.8 s | Download option still there |
| iOS permission prompt left open | Hint may appear while the prompt is showing | Neutral wording, harmless |
| Listing removed after sharing | In-app route replaces to the start screen | No crash |
| Network error in the app | Same | Retry by opening the link again |
| Opened link inside an in-app browser that blocks schemes | Not opened hint | Download or continue in browser |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `appLink.test.ts`: slug link, non-listing id, constant scheme.
- [ ] `useOpenApp.test.ts` (fake timers and a fake document): navigates, not-opened after the delay, cancelled when hidden, retry, no-op without a link, cleanup.
- [ ] `InstallSheet.test.tsx`: open button, order, status hint, absent without a link.
- [ ] `p.test.tsx`: the button appears with a listing and navigates; absent when not found.
- [ ] `SharedListingRedirect.test.tsx`: replaces with the property screen, replaces to start on not found / error, spinner while loading.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] Simulator: open `hubikmobile://p/<slug>` and land on the property screen; browser check of the button and the not-opened hint; redeploy a preview.
- [ ] Update the feature graph, RFC 019 and the session log.

---

## 7. Open Questions
- Universal links and app links once the app is in the stores (needs the Apple Team ID, Android SHA-256 fingerprint, association files and a rebuild).

---

## 8. Implementation notes (2026-09-21)
- Built as designed: `appLink` (pure), `useOpenApp`, `InstallSheet` (open button, hint, layout: open / download outline / dismiss), `SharedPropertyPage`, `SharedListingRedirect`, `SharedListingRoute` (branches on `Platform.OS` rather than `.native.tsx` files, so both paths are testable; jest resolves `.native` files ahead of plain ones).
- **Checked on the simulator**: `hubikmobile://p/piso-en-venta-en-madrid-6ff52f65` shows the iOS prompt "¿Abrir en hubik-mobile?", then the normal property screen loaded from the database (agency, description, 3 photos, no install sheet); `hubikmobile://p/no-existe-deadbeef` returns to the start screen.
- **Checked in a browser**: the sheet shows **Abrir en la app** first, the download button as an outline ("Próximamente"), and "Seguir en el navegador"; after pressing the open button in a desktop browser (no app registered) the hint "¿No se abrió? Puede que todavía no tenga la app instalada." appears after about 2 seconds.
- **Not verified**: the full round trip on a phone (Safari or Chrome opening the installed app from the web button); it needs the deployed page opened on a device that has the dev build.
- **Known limits**: the iOS permission prompt can be showing when the 1.8 s check fires (neutral wording); browsers embedded in other apps may block the scheme; the button works only where the app is installed, and universal links remain the proper fix once the app is in the stores.

