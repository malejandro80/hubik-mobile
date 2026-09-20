# ADR 0004: Agency as Tenant, Shared Marketplace and Server-Authoritative Roles

- **Status**: Proposed
- **Deciders**: Human Lead, Lead Mobile Architect, Mobile Security Architect, AI Agent
- **Date**: 2026-09-19
- **Technical Story / RFC**: [RFC 011 - Sign-in, Roles & Agencies](../../specs/011-auth-roles-agencies.md)

---

## Context and Problem Statement
HUBIK becomes multi-tenant: an agency (a real-estate business) is the tenant, agents publish
under it, and clients search across all agencies. We must decide how tenancy is modeled and where
role and agency authority lives, given that today every write goes through Edge Functions using
the service-role key with no caller identity.

---

## Decision Drivers
- Clients search all agencies together (shared marketplace), so reads must stay cross-tenant.
- A client must not be able to grant themselves a role or an agency.
- Fewest moving parts: keep the existing Edge Function write path and public read policy.
- One role and one agency per person in this slice.

---

## Considered Options
1. **Shared schema with an `agency_id` tenant key**, roles in a `profiles` table written only by
   a trigger, a `security definer` RPC and the service role; Edge Functions authorize from `profiles`.
2. **Roles and agency inside JWT custom claims** (auth hook), enforced with RLS on every table.
3. **Schema or database per tenant.**

---

## Decision Outcome
Chosen option: **1**, because the marketplace needs cross-tenant reads (option 3 fights that),
the existing service-role Edge Function path already centralizes writes so authorization can be one
shared check (`requireAgent`), and option 2 adds an auth hook and token-refresh subtleties (a role
change would not apply until the next refresh) that this slice does not need. Custom claims can be
adopted later if client-side RLS on writes is wanted.

### Positive Consequences
- One shared check gates publish, intake and describe; no per-table policy sprawl.
- Roles change instantly, since they are read from `profiles` at request time.
- Legacy data maps onto a default agency without structural change.

### Negative Consequences / Trade-offs
- One profile lookup per gated call (a primary-key read).
- Tenant isolation for writes relies on the Edge Functions being the only writers; any future
  direct client write path must add RLS with `agency_id`.
- Slice 2 (owner adds and removes agents) will need invitation storage.
