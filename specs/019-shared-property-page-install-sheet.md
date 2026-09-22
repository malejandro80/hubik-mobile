# RFC 019: Public shared-property page with an "install the app" bottom sheet

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented and verified in a real browser against the live listings; NOT deployed to any host yet; the app-side share link stays off until `EXPO_PUBLIC_SHARE_BASE_URL` is set
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends the property card share action; builds on RFC 011 (public listing views)

---

## 1. Problem Statement & Motivation
"Compartir" sends plain text only, so a recipient without the app sees a few lines and nothing else, and the app misses a
chance to be installed from a share. A TikTok-style page fixes both: the recipient sees the property in the browser, and a
bottom sheet invites them to get the app.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] The **Compartir** button on property cards sends its existing short text plus a public link to that listing.
- [ ] Opening the link in any browser shows a public page: cover photo and photo count, price, title, city and address,
      bedrooms, bathrooms, m², description, agency and agent name. Spanish, light and dark, no sign-in.
- [ ] A bottom sheet slides up over the visible property with a short invitation to get the app: **Descargar la app**
      (disabled and labelled "Próximamente" until store links are configured, then opens the right store) and **Seguir en
      el navegador** (dismisses). After dismissing, a slim bar keeps offering the app and reopens the sheet.
- [ ] A link to a missing or removed listing shows "Esta propiedad ya no está disponible", with the same sheet.

### Non-Goals (Out of Scope)
- Rich link previews (photo/title/price inside WhatsApp, iMessage); "Abrir en la app", universal or app links, opening a
  shared link inside the app; a share button on the property screen; sharing unpublished drafts.
- Contact form, sign-in, browse or search on the web; analytics; custom domain; SEO.
- Choosing or running the hosting deploy (documented, left to the owner).

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - share**: **When** a user taps Compartir on a card and `EXPO_PUBLIC_SHARE_BASE_URL` is set, **Then** the message
  ends with `https://<host>/p?id=<listing id>`; with no base URL configured the message is exactly today's text.
- **Story 2 - view**: **When** anyone opens the link, **Then** they see the listing (data below) without the app or an account.
- **Story 3 - sheet**: the sheet slides up right away over the visible property, with the app icon, a title, one line of what
  the app does (search by voice or chat) and the two buttons; buttons are at least 48 points high.
- **Story 4 - download**: with a store link configured the primary button opens the iOS link on iPhone/iPad, the Android link on
  Android, and the first configured link elsewhere; with none configured it reads "Próximamente" and is disabled.
- **Story 5 - dismiss**: **Seguir en el navegador** (or tapping the dimmed area) closes the sheet; a bottom bar "Hubik · Mejor en
  la app" with a **Descargar** button stays; pressing it reopens the sheet.
- **Story 6 - not found**: an unknown id, a malformed id, or a missing `id` shows the not-available page and the same sheet.
- **Story 7 - failure**: a network error shows a short message with **Reintentar**; the sheet still works.
- **Story 8 - privacy**: the page shows only data the app already shows publicly; it never shows coordinates, the creator id
  or embeddings.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Public link
- `src/constants/share.ts`: `SHARE_BASE_URL` from `process.env.EXPO_PUBLIC_SHARE_BASE_URL` (empty by default).
- `src/lib/shareLink.ts` (pure, tested first): `isPropertyId(value)` (UUID), `buildShareUrl(id, baseUrl = SHARE_BASE_URL)` returning
  `${base without trailing slashes}/p?id=${id}` or `null` when the base is empty, not https, or the id is not a UUID.
- `PropertyCard.handleShare` appends `\n${url}` to the existing `shareMessage` when the URL is not `null`.

### 4.2 Data
- `src/services/sharedProperty.ts`: `fetchSharedProperty(id): Promise<Property | null>` reads the anon-readable `property_listings`
  view selecting only display columns (`id, title, property_type, operation_type, price, bedrooms, bathrooms, square_meters,
  city, address, description, status, image_url, images, amenities, agency_name, agent_name`), `maybeSingle()`. Not-a-UUID
  returns `null` without a request; a database error throws. No migration.
- `src/hooks/useSharedProperty.ts`: `(id) => { status: 'loading' | 'ready' | 'not_found' | 'error'; property; retry }`.

### 4.3 Page and components (client only, static web export)
- `src/app/p.tsx` (route `/p`, the id is read from the query string, so the exported `p.html` works on any static host; no
  dynamic-route rewrites). Own minimal top bar (logo and name), no app menu or chat.
- `src/components/SharedPropertyView.tsx` (+styles): hero, price, title, address, facts, description, agency/agent line,
  centred with a maximum width on wide screens; reuses `formatPrice`, `parsePropertyImages`, `resolvePhotoCountLabel`,
  `PROPERTY_TYPE_LABEL_ES` and `labels.auth.listedBy`.
- `src/components/InstallSheet.tsx` (+styles): dimmed backdrop, slide-up panel (RN `Animated`), `accessibilityViewIsModal`,
  dismissible; `src/components/InstallBar.tsx` for the slim bar.
- `src/hooks/useInstallPrompt.ts`: `{ sheetVisible, dismiss, reopen }`, visible from the start.
- `src/lib/storeLinks.ts` (pure, tested first): `resolveStoreUrl(userAgent, iosUrl, androidUrl)`; only `https://` URLs are ever
  returned. `src/constants/appStore.ts` reads `EXPO_PUBLIC_IOS_STORE_URL` and `EXPO_PUBLIC_ANDROID_STORE_URL`.
- Copy in `labels.sharedProperty` (Spanish).

### 4.4 Build and deploy (documented, not executed by this RFC)
- `npm run export:web` (`expo export -p web`) produces `dist/` with `p.html`. Any static host that maps `/p` to `p.html` works.
- Set `EXPO_PUBLIC_SHARE_BASE_URL` (host URL, https) when building the app, and `EXPO_PUBLIC_IOS_STORE_URL` /
  `EXPO_PUBLIC_ANDROID_STORE_URL` when building the web export, once the store listings exist.
- Known limit: the export contains the whole app (about 2.9 MB of JavaScript), so first load on mobile data is not
  instant; a lighter, server-rendered page belongs with the rich-preview slice.

---

## 5. Security & Error Handling
- Only columns already public in the app are selected; the view is `security_invoker` and RLS still applies. Coordinates, the
  creator id and the embedding are never requested.
- The id is validated as a UUID before any request; the query is parameterised by the client library.
- Text (title, description, names) is rendered as plain text by React Native Web, never as HTML.
- Only `https://` store URLs, taken from build-time environment variables, are opened; nothing from the page URL is opened.
- The web bundle contains only `EXPO_PUBLIC_*` values (checked: the service-role key, Gemini, Groq, Google and GitHub secrets
  are not in the export). Do not put a non-public value in an `EXPO_PUBLIC_*` variable.
- Images load from the URLs stored on the listing (Supabase Storage in normal use); an arbitrary image URL could act as a
  tracking pixel for the viewer. Accepted: same exposure as the in-app screen; publishing already uploads to Storage.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Missing or malformed id | No request | Not-available page + sheet |
| Listing deleted or unknown | `null` from the service | Not-available page + sheet |
| Network or server error | Error state with Reintentar | Sheet still usable |
| No store link configured | Button disabled, "Próximamente" | Nothing opens |
| No base URL configured in the app | Share text without a link | Same as today |
| Very long title, description or name | Wraps, page scrolls | No overflow |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `shareLink.test.ts`: UUID check, trailing slashes, https only, empty base, encoding.
- [ ] `storeLinks.test.ts`: iPhone, iPad, Android, desktop, missing links, non-https rejected.
- [ ] `sharedProperty.test.ts`: only the display columns are selected; found, not found, error, invalid id makes no request.
- [ ] `useSharedProperty.test.ts`: loading, ready, not found, error, retry.
- [ ] `InstallSheet.test.tsx` and `InstallBar.test.tsx`: copy, buttons, "Próximamente" and disabled without a link, opens the link,
      dismiss, reopen, accessibility roles.
- [ ] `SharedPropertyView.test.tsx`: every field, absent description or agent, photo count.
- [ ] `p.test.tsx`: loading, property + sheet, dismiss then bar then reopen, not found (unknown, malformed, missing id), error + retry.
- [ ] `PropertyCard.test.tsx`: message includes the link when a base URL is set, unchanged when not (existing tests untouched).
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] `expo export -p web` builds; served locally, `/p.html?id=<real id>` shows the property and the sheet in the browser pane,
      also at phone width; a bogus id shows the not-available page.
- [ ] Update the feature graph and the session log.

---

## 7. Open Questions
- Which static host to use (EAS Hosting, Vercel, Netlify, GitHub Pages) and its URL: decided at deploy time.
- Follow-ups: rich link previews (server-rendered tags), universal links and "Abrir en la app", share from the property screen.

---

## 8. Implementation notes & deploy steps (2026-09-21)
- Built as designed: `shareLink` and `storeLinks` (pure), `sharedProperty` service (display columns only), `useSharedProperty`, `useInstallPrompt`, `InstallSheet`, `InstallBar`, `SharedPropertyView`, `src/app/p.tsx`, `PropertyCard` share link, labels and constants. No database change.
- **Checked in a real browser** (built with `npm run export:web`, served with clean URLs like a static host, against the live project): the listing "Piso en venta en Madrid" loads with price, photo count, address, facts, description and agency; the sheet slides up over it (dark mode, phone and desktop widths); "Seguir en el navegador" leaves the readable page and the bottom bar; a valid but unknown id shows "Esta propiedad ya no está disponible" with the sheet; with fake `https` store links built in, the primary button becomes "Descargar la app".
- **Build lesson (now in the script)**: Expo inlines `EXPO_PUBLIC_*` values at transform time and the Metro cache does not notice a changed value, so a first run without the variables kept "Próximamente" in a later build that had them. `export:web` is now `expo export -p web --clear`.
- **A11y note**: the sheet is `accessibilityViewIsModal`, so assistive technology ignores the backdrop; "Seguir en el navegador" is the dismiss path. Screen tests use `includeHiddenElements` for the content behind it.
- **Existing quirk noticed, not changed**: `*.styles.ts` files inside `src/app` are exported as pages too (`/index.styles`, `/p.styles`, ...). Harmless but untidy; moving the style files out of `src/app` would remove them.

### Deploy (owner action)
1. Choose a static host that maps `/p` to `p.html` (EAS Hosting, Vercel, Netlify and Cloudflare Pages do).
2. Build the web export, adding the store links only once the store listings exist: `EXPO_PUBLIC_IOS_STORE_URL=... EXPO_PUBLIC_ANDROID_STORE_URL=... npm run export:web`, then upload `dist/`.
3. Set `EXPO_PUBLIC_SHARE_BASE_URL=https://<that host>` for the next app build (dev build or store build); until then Compartir sends today's plain text.
4. Test: share a listing from the app, open the link in a phone browser without the app.

### Deployed preview (2026-09-21)
EAS Hosting preview at `https://hubik-mobile--j04kqea0p5.expo.app` (verified: `/p?id=<listing id>` works as a clean URL). Production (`eas deploy --prod`) and the app-side `EXPO_PUBLIC_SHARE_BASE_URL` are still to do.

### Amendment (RFC 020)
The web build is now a server build (see `specs/020-rich-link-previews-and-seo.md`): the share link is `/p/<slug>-<id8>`, static-only hosts no longer work, and the route moved to `src/app/p/`. Deploy with `npm run export:web` then `eas deploy`.

### Amendment (RFC 021 and 022)
The sheet now leads with **Abrir en la app** (`specs/022-open-in-app-button.md`), and the listing photo opens a full-screen gallery (`specs/021-full-photo-gallery.md`).

