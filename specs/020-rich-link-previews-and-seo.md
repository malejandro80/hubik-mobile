# RFC 020: Rich link previews and SEO for shared listings

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; verified on a local server and on an EAS Hosting preview (crawler fetch); NOT yet checked in a real chat app; production deploy and app-side base URL still to do
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 019 (shared page); changes the web build from static to server

---

## 1. Problem Statement & Motivation
A pasted link shows no image, title or price in chat apps, and the page carries no per-listing search metadata because it is a single
static shell. Crawlers (WhatsApp, iMessage, Facebook, Google) do not run JavaScript, so the tags must be in the HTML the server returns.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] Share (and its Copy action) sends the link alone.
- [ ] The link is a readable URL `/p/<title-slug>-<first 8 id characters>`; old `/p?id=<uuid>` links keep working and name the new
      address as canonical.
- [ ] The HTML the server returns for each listing contains the page title, description, canonical URL, Open Graph and Twitter tags
      with the cover photo and "<title> · <price>", and `robots: index, follow`.
- [ ] `/sitemap.xml` lists the published listings and `/robots.txt` points to it.
- [ ] A missing or removed listing gets `noindex` metadata and is absent from the sitemap.
- [ ] People who open the link see the same page and install sheet as today.

### Non-Goals (Out of Scope)
- A generated share image with the price drawn on it; other languages or hreflang; analytics; agent or agency pages; a listings index
  page; Search Console setup; app deep links; a custom domain.
- **Deviation from the brief (see 4.5)**: schema.org JSON-LD structured data and a real HTTP 404 status for missing listings.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - copy**: **When** a user taps Compartir and Copy (or sends it anywhere), **Then** exactly the link is shared, for example
  `https://<host>/p/piso-en-venta-en-madrid-6ff52f65`. With no base URL configured the plain text of RFC 019 is shared, as today.
- **Story 2 - preview**: **When** the link is fetched by a crawler (no JavaScript), **Then** the HTML has `<title>`, description,
  `og:title` "Piso en venta en Madrid · $420,000", `og:description` with bedrooms, bathrooms, m², address and city, `og:image` (the
  cover, https only), `og:url` and canonical, `twitter:card` `summary_large_image` (or `summary` with no photo), `og:locale` `es_ES`.
- **Story 3 - indexing**: the page says `index, follow`; `/sitemap.xml` lists every `Available` listing with its slug URL; `/robots.txt`
  allows crawling and names the sitemap.
- **Story 4 - old links**: `/p?id=<uuid>` shows the page and its metadata name the slug URL as canonical.
- **Story 5 - slug rules**: the slug is lowercase ASCII letters, digits and hyphens (accents removed), at most 60 characters, followed by
  `-` and the first 8 id characters. A listing whose title changes keeps working: only the trailing 8 characters resolve it.
- **Story 6 - collisions and tampering**: two listings sharing an 8-character prefix are told apart by the full slug; a prefix that
  matches nothing, or a malformed slug, shows the not-available page with `noindex`.
- **Story 7 - safety**: title, description, address and names containing quotes, angle brackets or markup appear escaped in tags and
  the sitemap; a non-https image URL is not emitted.
- **Story 8 - humans**: opening the link in a browser shows the RFC 019 page and install sheet.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Web build (config)
`app.json`: `web.output` becomes `"server"` and the `expo-router` plugin gains `unstable_useServerRendering: true` (HTML is rendered per
request so route `generateMetadata` runs; confirmed by a spike: the tags appear in the served HTML). The result must be hosted where the
server runs (EAS Hosting: `npx expo export -p web` then `eas deploy`); a static-only host no longer works. `unstable_` means the API may
change with an Expo upgrade: pin and re-test on upgrades.

### 4.2 Pure helpers (tested first)
- `src/lib/listingSlug.ts`: `slugify(title)`, `buildListingSlug(title, id)`, `parseListingRef(value)` returning
  `{ kind: 'id'; id } | { kind: 'slug'; slug; shortId } | null` (a UUID, a `<slug>-<8 hex>` or a bare 8 hex).
- `src/lib/shareLink.ts`: `buildShareUrl({ id, title }, baseUrl)` returns `${base}/p/${slug}` (https and a real listing id required, else `null`).
- `src/lib/listingMetadata.ts`: `buildListingMetadata(property, origin)` and `buildUnavailableMetadata()` returning the expo-server `Metadata` type:
  `title`, `description`, `robots`, `alternates.canonical`, `openGraph` (`type: 'website'`, `siteName: 'Hubik'`, `locale: 'es_ES'`, `url`,
  `images`), `twitter`. Price text comes from the existing `formatPrice`, so the card and the page agree. `origin` is
  `SHARE_BASE_URL` when configured (a stable production host), else the request origin.
- `src/lib/sitemap.ts`: `escapeXml`, `buildSitemapXml(entries)`, `buildRobotsTxt(origin)`.

### 4.3 Data
`src/services/sharedProperty.ts` gains `fetchSharedPropertyByRef(ref)`: an id uses the existing query; a slug queries the same view by the
id range `[<shortId>-0000-0000-0000-000000000000, <shortId>-ffff-ffff-ffff-ffffffffffff]` (uuid comparison, `limit 2`; only hex is
ever interpolated, and the shortId is validated first) and, on more than one row, picks the row whose `buildListingSlug` equals the requested
slug. `fetchSitemapListings()` reads `id, title, created_at` of `Available` listings, newest first, capped at 5000. No migration.
`useSharedProperty(value)` accepts an id or a slug through `parseListingRef`.

### 4.4 Routes
- `src/app/p/index.tsx` (legacy `/p?id=`) and `src/app/p/[slug].tsx` both render the RFC 019 screen (moved to `src/components/SharedPropertyPage.tsx`)
  and export `generateMetadata` (`ok` listing, or unavailable metadata with `noindex`; a lookup error emits neutral, non-indexed metadata).
- `src/app/sitemap.xml+api.ts` and `src/app/robots.txt+api.ts` (API routes; `Cache-Control: public, max-age=3600`).
- `PropertyCard` shares `link` alone; `labels.propertyCard.shareMessageWithLink` is removed.

### 4.5 Deviations from the approved brief
- **No JSON-LD**: `generateMetadata` cannot emit a `<script>`; it would need a second experimental flag (server data loaders), and Google
  has no real-estate rich result. Title, description, Open Graph and canonical already drive both link cards and search snippets.
- **No real 404**: metadata cannot set the HTTP status of a rendered page, so a missing listing returns 200 with `noindex` and the friendly
  not-available screen (a "soft 404" made safe by `noindex` and the sitemap exclusion).

---

## 5. Security & Error Handling
- Only public columns already used by RFC 019; the sitemap adds only `id`, `title`, `created_at`. No coordinates, creator id or embedding.
- Values reach HTML through expo-server's metadata renderer, which escapes attributes (verified with hostile input in the test plan);
  the sitemap escapes XML itself. Slugs are generated from the title and constrained to `[a-z0-9-]`.
- Only `https://` image URLs are emitted. The id-range query interpolates validated hex only.
- Indexing makes price, address and agency discoverable on the open web (chosen at scoping). Removing a listing removes it from the sitemap
  and its page turns `noindex`; search engines drop it on their next crawl.
- Server rendering runs the anon key already public in the client bundle; no private key is added to the server bundle.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Unknown or malformed slug/id | Unavailable metadata, `noindex` | Friendly page, not indexed |
| Database error while building metadata | Neutral `noindex` metadata | Page still loads; retry on the client |
| Listing has no photo or a non-https photo | No `og:image`, `twitter:card` `summary` | Text-only card |
| 8-character collision | Full slug decides | Correct listing or unavailable |
| Very long title | Slug capped at 60 characters, title text as is | No overflow |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `listingSlug.test.ts`: accents, symbols, emoji, empty title, length cap, parse of uuid / slug / bare short id, rejects junk.
- [ ] `shareLink.test.ts` (updated for the new signature: a requirement change).
- [ ] `listingMetadata.test.ts`: every tag for a full listing, no photo, http photo, hostile text, unavailable, origin choice.
- [ ] `sitemap.test.ts`: XML structure, escaping, limits; robots.txt.
- [ ] `sharedProperty.test.ts`: range query for slugs, collision choice, `fetchSitemapListings` columns and status filter.
- [ ] `useSharedProperty.test.ts` extended for slugs; `p.test.tsx` for the slug route.
- [ ] `PropertyCard.test.tsx`: shares the link alone; plain text when no base URL.
- [ ] Server run (`npx expo export -p web`, `npx expo serve`): fetch a real listing as a crawler; tags present; hostile-input check; sitemap and robots;
      unknown slug is `noindex`; browser check of the human page and sheet.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] Deploy a preview with `eas deploy` and repeat the crawler fetch against the real host.
- [ ] Update the feature graph, RFC 019 deploy notes and the session log.

---

## 7. Open Questions
- JSON-LD and a true 404 status: revisit if Expo exposes them in metadata or if data loaders stabilise.
- Whether to add a generated share image with the price on it.

---

## 8. Implementation notes (2026-09-21)
- **Spike first**: `web.output: "server"` alone did not run `generateMetadata` (a static page was served). The Expo Router plugin option `unstable_useServerRendering: true` makes it render per request, and the tags then appear in the HTML. Both are in `app.json`.
- **Built as designed** (with the two declared deviations, no JSON-LD and no real 404): `listingSlug`, `shareLink`, `listingMetadata`, `sitemap` (pure); `sharedProperty` (by ref, sitemap listings), `sharedMetadata` (`resolveSharedMetadata`, `resolveOrigin`); routes `p/index.tsx` (legacy `?id=`), `p/[slug].tsx`, `sitemap.xml+api.ts`, `robots.txt+api.ts`; `SharedPropertyPage` (the RFC 019 screen moved out of `src/app`, so its styles file is no longer a web page); `PropertyCard` shares the link alone (`shareMessageWithLink` label removed).
- **Verified on a real server** (`expo export` + `expo serve`, and on the EAS preview with a WhatsApp user agent): full tag set for a real listing; `/p?id=<uuid>` and a slug with an outdated title both name the current slug as canonical; unknown or junk slugs are `noindex, nofollow`; `/sitemap.xml` lists the live listings; `/robots.txt` names the sitemap; hostile text in metadata comes out escaped (`&quot;`, `&lt;`, `&gt;`), tested with a temporary route that was then deleted.
- **Hydration bug found and fixed (with a test)**: the server cannot know the visitor's colour scheme, so it rendered light while a dark-mode browser hydrated dark; React does not repair attribute mismatches, so the sheet lost its background. `useColorScheme` now uses `useSyncExternalStore` with a server snapshot (light on the server and on the first client render, real scheme right after). Native behaviour is unchanged.
- **Bug found in existing code (fixed, unit-tested only)**: every photo in Storage is stored and served as `text/plain` because the picked blob has an empty type and the storage client ignores the `contentType` option for multipart uploads. Chat crawlers (WhatsApp, Facebook) often ignore images that are not `image/*`, so previews would have no picture. `uploadPropertyImages` now re-types the blob as `image/jpeg`. Photos already uploaded stay `text/plain`; publish a new listing to test. Needs a real upload from the app (agent session) to confirm end to end.
- **Known limits**: photos are uploaded at about 1 MB (picker quality 0.6, no resize), and some chat apps drop very large preview images (WhatsApp is often quoted near 300 KB); shrinking on upload needs `expo-image-manipulator` (a native module, so a rebuild) or paid Storage image transformations. The page is served as 200 with `noindex` for missing listings, not a 404. `unstable_useServerRendering` may change with an Expo upgrade.
- **Deploy notes**: the web build is now a server build, so static hosts no longer work. `npm run export:web` then `eas deploy` (preview) or `eas deploy --prod`. Set `EXPO_PUBLIC_SHARE_BASE_URL` to the stable production URL before building the app and the web export, so canonical URLs and the sitemap use it.

