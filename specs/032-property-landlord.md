# RFC 032: Property Landlord

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
When an agent registers a listing there is no record of who owns the property. The user asked to
add the property's owner ("propietario") during registration, picked by autocomplete among
registered users' emails, visible only to the listing agent and the agency owner. Scope approved
on 2026-09-23. In code the property's owner is the **landlord**, because "owner" already means the
agency owner role.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Optional "Propietario" in the registration draft panel; it does not count toward the 9
      required fields.
- [x] After 3 characters, up to 5 registered **clients** with a confirmed email whose name (or a
      word of it) or email starts with the text; shown as name + masked email
      (`a***@gmail.com`). The agent picks one, and can change or remove it before publishing.
- [x] Publishing links the listing to that user.
- [x] The detail screen shows "Propietario: <name> · <full email>" only to the listing's agent
      and the owner of its agency; nobody else can read the link or the email, including by
      querying the database directly.

### Non-Goals (Out of Scope)
- Inviting unregistered landlords; editing the landlord after publishing; landlords seeing their
  listings; landlord in chat/voice extraction; the client-side `publishPropertyDirect` fallback
  (it cannot write the link; documented).

---

## 3. User Stories & Acceptance Criteria
- **Given** an agent composing a listing, **when** they type "ana" in Propietario, **then** they
  see "Ana García · a***@gmail.com" and can pick it; "Cambiar"/"Quitar" undo the choice.
- **Given** the listing was published with that landlord, **then** the agent and the owner of
  the agency see "Ana García · ana@gmail.com" on the detail; a client, a visitor or an agent of
  another agency see no section.
- **Given** a crafted publish request with a landlord who is not a confirmed client, **then**
  it is rejected with 400 and nothing is published.

---

## 4. Proposed Architecture & Public Contracts

### Database (`20260923_property_landlords.sql`)
- `public.property_landlords(property_id uuid PK → properties ON DELETE CASCADE,
  landlord_id uuid → auth.users ON DELETE CASCADE, created_at)`, RLS on; `SELECT` granted to
  `authenticated` only, policy = listing agent (`properties.created_by`) or owner of its agency.
  No write grants: rows are written by `property-publish` with the service role.
- `public.search_landlord_candidates(p_query text)` → `(user_id, display_name, masked_email)`:
  `SECURITY DEFINER`, `search_path = ''`, callable by agents only, same matching, masking,
  3-character minimum and per-user rate limit (`client_search_log`) as RFC 018's
  `search_agent_candidates`.
- `public.get_property_landlord(p_property_id uuid)` → `(display_name, email)`:
  `SECURITY DEFINER`, returns a row only to the listing agent or the agency owner.
- `EXECUTE` revoked from `PUBLIC`/`anon` on both functions.

### Edge Function `property-publish`
Accepts an optional `landlord_id`; rejects it (400) unless it is a UUID of a `client` profile
with a confirmed email; inserts the listing, then the link; if the link fails, deletes the
listing and returns 500.

### App
```typescript
// authApi
export function searchLandlordCandidates(query: string): Promise<ClientCandidate[]>;
export function fetchPropertyLandlord(propertyId: string): Promise<{ displayName: string | null; email: string } | null>;
// chatApi
export function publishProperty(draft: PropertyDraft, landlordId?: string | null): Promise<Property>;
// usePropertyRegistrationChat: state.landlord: ClientCandidate | null; setLandlord()
// useClientSearch(query, search = searchAgentCandidates)
// components: LandlordPicker (DraftPanel), PropertyLandlordSection (detail)
```
The landlord lives in the composer state, not in `PropertyDraft`, so it is never sent to the
intake LLM and never counts as a draft field.

---

## 5. Security & Error Handling
- Reads go only through RLS (link) or the guarded definer function (name + email); the email of
  a candidate is masked until publication.
- Known risk (accepted in scope): an agent could link any client to see their full email; the
  search is rate limited and the link is permanently tied to the agent's own listing.

| Failure | Handling |
| :--- | :--- |
| Search rate limited | "Try again in a moment" line (RFC 018 copy) |
| Invalid landlord in publish | 400, nothing published |
| Link insert fails | Listing deleted, 500 |
| Not authorized to read | No section rendered |

---

## 6. Verification & Test Plan
- [x] SQL (impersonation, rolled back): candidates only for agents, only confirmed clients,
      masked; `get_property_landlord` returns the row to the listing agent and the agency owner,
      nothing to a client, anon or another agency's agent; direct `SELECT` on the table follows
      the same rule; anon cannot execute either function.
- [ ] Edge, end to end: publish with a valid landlord creates the link; with an agent's id → 400.
      Not run: needs an agent session. Covered by unit tests of `parseLandlordId` /
      `isEligibleLandlord` and the v10 boot check; to be exercised on a device.
- [x] App: service calls; `LandlordPicker` search/pick/change/remove; composer keeps the
      landlord out of the draft and passes it to publish; detail section by role.
- [x] `npm run lint`, `npm test`, `npm run typecheck`.

---

## 7. Deployment Notes (2026-09-23)
- Migration `property_landlords` applied via MCP; `property-publish` v10 deployed
  (`verify_jwt: true`, boots: 401 without a session).
- Production has **no client accounts yet**, so the autocomplete finds nobody until clients
  register. Verified with a temporary client created inside rolled-back transactions:
  - search as an agent: "Ana Propietaria · a***@example.com" (masked);
  - `get_property_landlord` and direct table reads: listing agent and agency owner get
    "Ana Propietaria · ana.propietaria@example.com" / 1 row; another agency's agent and owner and
    the client themselves get nothing / 0 rows;
  - anon: `permission denied` on both functions; a client calling the search gets
    "Only agents can search landlords";
  - the same client sees all 22 listings in search, which closes RFC 030's client check (the
    earlier "client" check ran without a user because no client existed).
- Advisors: two expected entries for the new definer functions executable by `authenticated`
  (same as RFC 018's `search_agent_candidates`); none executable by `anon`.

