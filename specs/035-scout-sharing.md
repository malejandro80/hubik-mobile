# RFC 035: Scout Sharing (own listings first, opaque links for colleagues' listings)

- **Author**: AI Agent (Claude Code)
- **Status**: Deployed (database, 2026-10-03); app changes ship with the next web deploy and app build
- **Created**: 2026-10-03
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Agents work as scouts: they search their agency's inventory and send listings to their clients.
Today search ranks only by relevance, and the share link (`/p/<slug>`, RFC 019) shows the listing
agent's name, and in the app the listing agent's WhatsApp (RFC 031). A client who receives a
colleague's listing can contact that colleague directly and skip the agent who sent it.

Scope brief approved by the user on 2026-10-03.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Agency members (agents and owners): search returns their own listings first, then their
      colleagues'. Each group keeps the current order (relevance, price sort, or distance).
- [x] When an agency member shares a listing of their agency that they did not publish, the link is
      opaque (`/s/<token>`): it does not reveal the listing id and cannot be edited into `/p/<slug>`.
- [x] Whoever opens an opaque link (web page or app) sees the listing and the agency name, never the
      listing agent's name or WhatsApp. Contact uses the agency WhatsApp; without one, no button.
- [x] Unchanged: sharing one's own listing, clients and visitors sharing, and a client finding the
      listing by searching (they see the listing agent, RFC 031).

### Non-Goals (Out of Scope)
- Recording who shared a link, notifications, link expiry, sharing across agencies.
- Preventing a client from finding the listing through their own search.
- Changes to the "Tuya" badge or to client search.

---

## 3. User Stories & Acceptance Criteria
- **Given** agent Luis and colleague Ana in agency A, **when** Luis searches "casas en Valencia",
  **then** Luis's houses come first, then Ana's.
- **Given** Luis shares Ana's house, **then** he gets `https://…/s/<token>`; the page and the app
  show the house and agency A with agency A's WhatsApp, never Ana.
- **Given** that link, **when** the client edits it, **then** nothing leads to `/p/<slug>`.
- **Given** Luis shares his own house, **then** he gets the usual `/p/<slug>` link.

---

## 4. Proposed Architecture & Public Contracts

### Database (`20261003_scout_share_links.sql`, `20261003_scout_search_own_first.sql`, no `DROP`)
- `listing_share_links(property_id uuid PK → properties ON DELETE CASCADE, token text UNIQUE,
  created_at)`: one random 32-hex token per listing, no sharer column. RLS on, no policies, no
  grants to `anon`/`authenticated`.
- `create_listing_share_link(p_property_id uuid) RETURNS text`, `SECURITY DEFINER`,
  `search_path = ''`: returns the token only when the caller is an agent/owner of the listing's
  agency and did not publish it; `NULL` otherwise. Idempotent per listing. EXECUTE to
  `authenticated` only.
- `get_shared_listing(p_token text)`, `SECURITY DEFINER`: returns the public listing fields,
  `sector`, the coordinates the caller can see (through `property_listings`, so jittered for
  clients), `agency_name` and `agency_whatsapp`. Never the id, address, agent name or agent
  WhatsApp. EXECUTE to `anon`, `authenticated`.
- `search_listings` and `search_properties_nearby` (`CREATE OR REPLACE`, same signatures): the
  first `ORDER BY` key is "published by `auth.uid()`".

### App
```typescript
// src/lib/sharePolicy.ts
export function needsOpaqueShareLink(profile: Profile | null, listing: Pick<Property, 'agency_id' | 'created_by'>): boolean;
// src/lib/shareLink.ts / appLink.ts
export function buildOpaqueShareUrl(token: string, baseUrl?: string): string | null;
export function buildOpaqueAppLink(token: string): string | null;
export function isShareToken(value: unknown): value is string;
// src/services/listingShareLinks.ts
export function createListingShareLink(propertyId: string): Promise<string | null>;
export function fetchSharedListingByToken(token: string): Promise<Property | null>; // id = token
```
- `PropertyCard` share: opaque link when `needsOpaqueShareLink`; if the token can't be created it
  shows an error and shares nothing (never the regular link).
- Routes `src/app/s/[token].tsx`: web page (noindex metadata, canonical `/s/<token>`, no address)
  and native redirect to the detail screen with `shared=1`, agency WhatsApp, no agent fields.
- The shared listing uses the token as `id`, so `buildShareUrl`/`buildAppLink` (which require a
  UUID) can never turn it into a `/p/` link.

---

## 5. Security & Error Handling
- Tokens are random (122 bits) and map to a listing only on the server.
- Both functions are `SECURITY DEFINER` with `search_path = ''`, an `auth.uid()` check where it
  matters, and minimal grants; the token table is unreachable through the API.
- Residual, accepted: image URLs and the listing title can let a determined client find the listing
  by searching, which the business rule allows.

| Failure Condition | Handling Strategy |
| :--- | :--- |
| Token creation fails or returns null | Error message, nothing shared |
| Unknown token | "not found" page / app goes home |
| Agency without WhatsApp | No contact button |

---

## 6. Verification & Test Plan
- [x] Unit: `needsOpaqueShareLink`, opaque URL/app-link builders, token mapping (no agent data),
      opaque metadata, `useSharedProperty` with a token resolver, `PropertyCard` share paths.
- [x] DB: impersonate agent/colleague/client: ordering, token only for colleagues' listings,
      `get_shared_listing` returns no agent fields; advisors.
- [x] `npm run lint`, `npm test`, `npm run typecheck`; `chat-query` unchanged (SQL only).

---

## 7. Deployment Notes (2026-10-03)
- Migrations `scout_share_links` and `scout_search_own_first` applied via MCP (no `DROP`). No Edge
  Function change: `chat-query` already calls `search_listings` with the caller's JWT.
- Verified by impersonation inside a rolled-back block (agency `Casa Norte`): the owner's search
  returns her 2 listings, then her colleague's 5; sharing a colleague's listing returns a valid,
  stable token; her own listing and a member of another agency get `NULL`; anonymous
  `get_shared_listing` returns only public fields plus `agency_name`/`agency_whatsapp` (no id,
  address or agent); anonymous `create_listing_share_link` and direct table reads are denied.
- Advisors: the expected new entries only (`listing_share_links` RLS without policies by design;
  `get_shared_listing` executable by `anon`; `create_listing_share_link` by `authenticated`).
- Local: typecheck clean, lint 0 errors (4 pre-existing warnings), Jest 149 suites / 1346 tests.
- Pending human release: the web deploy (route `/s/<token>` and its preview) and a new app build
  (share button, `hubikmobile://s/<token>` deep link). Until then the database side is live but
  agents still share the usual link.
- `src/app/property/[id].tsx` is at 305 lines (was already over 300).

