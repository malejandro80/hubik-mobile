# RFC 030: Role-Scoped Search

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Every role sees listings from every agency when searching. The user wants agents and agency
owners to work only with their own agency's inventory, while clients and visitors keep seeing
everything. Scope approved on 2026-09-23 (slice 1 of 2; slice 2 is RFC 031, WhatsApp contact).

This is a product scope, not a security boundary: listings stay publicly readable (RLS unchanged),
shared links keep working, and a signed-out agent sees everything like any visitor.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Visitors and clients: search returns listings from all agencies (unchanged).
- [x] Agents and owners: search returns only listings of their own agency. The agency comes from
      the caller's session inside the database (`auth.uid()` → `profiles`), never from a client
      parameter.
- [x] Agents see a "Tuya" badge on the listings they published.

### Non-Goals (Out of Scope)
- RLS changes; shared web pages; the client-side fallback `querySupabaseDirectly`; the
  `chat-query` structured fallback used only when the RPC errors.
- A per-agent "only mine" view.

---

## 3. User Stories & Acceptance Criteria
- **Given** an agent of agency A, **when** they search "casas en Valencia", **then** only
  agency A's houses come back, and their own carry "Tuya".
- **Given** an owner of agency B, **then** only agency B's listings come back, without "Tuya".
- **Given** a client or a signed-out visitor, **then** listings of every agency come back.

---

## 4. Proposed Architecture & Public Contracts
Migration `20260923_role_scoped_search.sql` recreates `public.search_properties_hybrid` (same
parameters, `SECURITY INVOKER`, based on the live definition including the RFC 027 sorted-lexical
amendment) with:
```sql
viewer AS (
  SELECT pr.agency_id FROM profiles pr
  WHERE pr.user_id = auth.uid() AND pr.role IN ('agent', 'owner') AND pr.agency_id IS NOT NULL
)
-- filtered: AND (NOT EXISTS (SELECT 1 FROM viewer) OR l.agency_id IN (SELECT agency_id FROM viewer))
```
and one extra returned column, `created_by uuid`. `chat-query` already forwards the caller's
JWT to the RPC, so it needs no change.

App: `Property.created_by?: string`; `PropertyCard` shows "Tuya" when
`property.created_by === profile.userId` for a signed-in agent.

---

## 5. Security & Error Handling
- Scoping reads the caller's own profile (existing policy "Users can read their own profile");
  the app cannot widen or narrow it by sending parameters.
- No new data exposed: `created_by` is already in `property_listings`.

| Failure | Handling |
| :--- | :--- |
| Profile missing / no agency | Treated as unscoped (visitor behaviour) |
| RPC error | Existing structured fallback (unscoped; documented limitation) |

---

## 6. Verification & Test Plan
- [x] SQL, impersonating roles with `request.jwt.claims`: anon and client get all agencies;
      an agent and an owner get only their agency.
- [x] Component: `PropertyCard` shows "Tuya" only for the signed-in author.
- [x] Live: `npm run eval:search` still 16/16 (it runs signed out).
- [x] `npm run lint`, `npm test`, `npm run typecheck`.

---

## 7. Deployment Notes (2026-09-23)
- Migration `role_scoped_search` applied via MCP.
- Impersonated with `request.jwt.claims`: visitor 22 listings / 5 agencies; client 22 / 5; agent of
  Valencia Hogar 6 / 1 (3 of them their own); owner of Valencia Hogar 6 / 1; agent of HUBIK 2 / 1.
  Before: the agent saw 22 / 5.
- Simulator (agent "houseapp", Casa Norte): a question about a Guataparo Bienes Raíces listing
  found nothing; "Casas en Valencia" returned Casa Norte's single house.
- Search eval (signed out) 16/16; security advisors unchanged.

