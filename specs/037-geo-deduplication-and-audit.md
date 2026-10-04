# RFC 037: Geo-Spatial Deduplication, Optional Catastro & Duplicate Audit Trail

- **Author**: AI Agent
- **Status**: Deployed (2026-10-04), redesigned after review (§7)
- **Created**: 2026-10-03
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Under RFC 006, `catastro` was established as a mandatory field and unique key on `properties` to prevent duplicate listings. In real-world Latin American markets, many legitimate properties lack an active cadastral certificate (`ficha catastral`) due to title regularization delays, inheritance processes, or unregistered historical construction.

Removing the mandatory requirement for `catastro` without an alternative deduplication mechanism creates a severe risk: multiple agents or agencies can publish the exact same property with slightly varying titles and prices, cluttering search results and causing lead disputes.

This RFC:
1. Makes `catastro` optional during property intake and database publication.
2. Implements a multi-attribute spatial deduplication algorithm using coordinates ($\le 40\text{ meters}$) and physical invariants (property type, room count, and surface area within $\pm 10\%$).
3. Publishes suspect duplicates in a `'Pending'` state (hidden from public organic search until approved by the agency or administrator).
4. Persists an audit record in `property_duplicate_logs` linking the suspect property, the matching original, and the responsible agent to track repeat behavior for future sanctions.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] Make `catastro` optional in `PropertyDraft`, `REQUIRED_PROPERTY_DRAFT_FIELDS`, and `properties` table (allowing `NULL` while preserving unique index on non-null values).
- [ ] During AI registration chat, recommend `catastro`, but if the agent omits it or indicates they do not have it, allow the intake flow to complete successfully without blocking.
- [ ] Implement database RPC `check_property_duplicate` evaluating geo-distance ($\le 40\text{m}$), property type match, and physical dimension tolerance.
- [ ] In `property-publish`, if `catastro` is missing:
  - Run the spatial deduplication check.
  - If a matching listing exists:
    - Set listing `status` to `'Pending'` (quarantined from public search).
    - Insert an audit entry in `property_duplicate_logs` with agent ID, agency ID, candidate match ID, and match details.
    - Return publication response indicating status `'Pending'` and duplicate review flag.
  - If no duplicate exists: publish with status `'Available'` normally.
- [ ] In client and Edge Functions, update intake prompts and helper routines to reflect optional cadastral handling.

### Non-Goals (Out of Scope)
- Automatic agent suspension or penalty enforcement (the tracking data is logged, but penalty workflows will be specified in a subsequent RFC).
- Photo-based perceptual hashing (`pHash`) — deferred to a subsequent phase.
- Cross-agency dispute arbitration interfaces.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Registration without catastro - Unique property)**:
  - **Given** an agent registering a property without a cadastral certificate.
  - **When** the agent provides physical location (GPS pin), price, type, rooms, and surface area, and states "no tengo catastro".
  - **Then** the intake chat does not block, marks the draft ready to confirm, and upon publication with no nearby matches, publishes the listing with status `'Available'`.

- **Story 2 (Registration without catastro - Duplicate detected)**:
  - **Given** an existing published property at coordinates `(10.21, -67.98)` with 3 bedrooms, 2 bathrooms, and 120 m².
  - **When** an agent submits a new listing without catastro at coordinates within 40 meters, matching `property_type`, 3 bedrooms, and 125 m² ($\approx 4\%$ difference).
  - **Then** the publication succeeds with `status: 'Pending'`, an audit record is created in `property_duplicate_logs`, and the agent is informed that the listing is undergoing verification.

- **Story 3 (Registration with valid unique catastro)**:
  - **Given** an agent provides a valid unique cadastral reference.
  - **When** the property is published.
  - **Then** the standard unique cadastral constraint passes, and it is published with status `'Available'`.

- **Story 4 (Registration with already-used catastro)**:
  - **Given** an agent provides a cadastral reference already assigned to an existing property.
  - **When** the intake or publish step runs.
  - **Then** the request is rejected with a `CONFLICT` error ("Ya existe una propiedad registrada con esa referencia catastral"), identical to RFC 006.

---

## 4. Proposed Architecture & Public Contracts

### Data Model Changes

```sql
-- 1. Relax NOT NULL constraint on properties.catastro while keeping partial UNIQUE index
ALTER TABLE properties ALTER COLUMN catastro DROP NOT NULL;

-- 2. Audit Table for duplicate attempts
CREATE TABLE IF NOT EXISTS property_duplicate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  suspected_duplicate_of uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id),
  agency_id uuid REFERENCES agencies(id),
  distance_meters numeric NOT NULL,
  match_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'flagged' CHECK (status IN ('flagged', 'confirmed_duplicate', 'cleared')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_duplicate_logs_agent ON property_duplicate_logs(agent_id);
CREATE INDEX idx_duplicate_logs_created_at ON property_duplicate_logs(created_at);
```

### PostgreSQL Deduplication RPC
```sql
CREATE OR REPLACE FUNCTION check_property_duplicate(
  p_latitude double precision,
  p_longitude double precision,
  p_property_type text,
  p_bedrooms integer,
  p_bathrooms double precision,
  p_square_meters numeric,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  duplicate_id uuid,
  distance_meters numeric,
  title text,
  agency_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    ROUND((6371000 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(p.latitude))
      ))
    ))::numeric, 1) AS distance_meters,
    p.title,
    p.agency_id
  FROM properties p
  WHERE (p_exclude_id IS NULL OR p.id <> p_exclude_id)
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.property_type = p_property_type
    AND p.bedrooms = p_bedrooms
    AND abs(p.bathrooms - p_bathrooms) <= 1
    AND abs(p.square_meters - p_square_meters) <= (p_square_meters * 0.10)
    AND (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(p.latitude))
        ))
      )
    ) <= 40
  ORDER BY distance_meters ASC
  LIMIT 1;
END;
$$;
```

---

## 5. Security & Error Handling

- **Security & Authorization**:
  - `property_duplicate_logs` has RLS enabled:
    - Agency owners can view audit logs for their agency's agents.
    - Regular agents cannot read or manipulate the audit logs directly.
    - Inserts occur via Edge Function with service role or dedicated security definer RPC.
- **Privacy**:
  - When notifying the agent of a duplicate flag, only generic confirmation is shown; sensitive details of the competing listing agent are never exposed.

---

## 6. Verification & Test Plan

1. **Unit Tests (`offlinePropertyExtractor.test.ts`)**:
   - Verify `parsePropertyDraft` marks `ready_to_confirm = true` when all required fields except `catastro` are present and user skipped catastro.
2. **Edge Function Tests (`property-publish`)**:
   - Publishing without catastro and without duplicate sets status `'Available'`.
   - Publishing without catastro with spatial match sets status `'Pending'` and inserts audit row.
   - Publishing with duplicate non-null `catastro` throws `CONFLICT` (409).
3. **Database Migration Checks**:
   - Verification of `properties.catastro` nullable constraint.
   - Verification of `check_property_duplicate` RPC precision.

---

## 7. Review & Redesign (2026-10-04)
The first implementation (commit `2556476`) was reviewed before deploy and changed:
- **Quarantine did not work**: `property_listings` (and every search RPC built on it) does not
  filter by `status`, and `properties` had a public read policy, so `'Pending'` listings stayed
  visible. `'Pending'` also already means "Pendiente" (a business status shown on the card).
  → New column `properties.under_review boolean`; `status` is untouched. The read policy became
  `NOT under_review OR viewer_has_agency_access(agency_id)` (`ALTER POLICY`, no `DROP`); the view is
  `security_invoker`, so search, nearby search and agency lists all inherit it.
- **Location oracle**: `check_property_duplicate` was `SECURITY DEFINER`, executable by
  `authenticated`, and returned the match id, agency and distance to 0.1 m — enough to triangulate
  exact coordinates that RFC 033 hides. → Replaced by `find_property_duplicate` (EXECUTE revoked
  from `PUBLIC`, `anon`, `authenticated`) used only by triggers.
- **Client-side dedup**: `publishPropertyDirect` ran the check and wrote the audit log from the app
  (no insert policy exists, so it never worked, and it trusted the client). → Removed; the app only
  sends `catastro: null`.
- **Enforcement in the database**: `BEFORE INSERT` trigger `properties_flag_duplicate` sets
  `under_review` when `catastro IS NULL` and a listing matches (≤ 40 m, same type and bedrooms,
  bathrooms ± 1, area ± 10 %); `AFTER INSERT` trigger `properties_log_duplicate` writes
  `property_duplicate_logs` (no coordinates stored). Works for every insert path.
- `property-publish` no longer checks duplicates; it returns `duplicate_flagged` from
  `under_review`. The card shows "En revisión" (own agency only can see it).
- The intake now tells the agent they can answer «no tengo catastro»; the skip regex moved to
  `_shared/catastroSkip.ts` (+ constants), used by the Edge Function and the app fallback.
- `toolchain.env` lint/test overrides reverted (they bypassed the project ESLint config).

Decisions (user, 2026-10-04): a flagged listing is visible only to its own agency; approval is
manual in the database for now — duplicates also happen across agencies, so resolution needs its
own future feature.

## 8. Deployment (2026-10-04)
- Migration `geo_deduplication_and_audit` applied via MCP. Validated before applying in a
  rolled-back block and after with impersonation: duplicate 22 m away flagged and logged against
  the original, a listing 1 km away not flagged; `anon` and another agency cannot see it, its own
  agency sees it with `under_review`; `anon` cannot read logs nor execute `find_property_duplicate`
  (HTTP 401 / 42501).
- Edge Functions: `property-publish` v14, `property-intake` v25 (`verify_jwt: true`), built with
  `main`'s newer `auth.ts`, `prompts.ts`, `hybridSearchConstants.ts` (branch is behind `main`).
- `chat-query` search unchanged ("casas en alquiler" 3 rent). Advisors: no new findings.
- Manual approval SQL: see session log.
- Numbering: `main` also has `specs/037-strict-search-filters.md`; rename that one to 038 when
  merging this branch.
