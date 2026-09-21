# RFC 013: Owners add agents by email

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; migration applied to the live project; not yet exercised end to end with a second real account
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 011 (roles and agencies)

---

## 1. Problem Statement & Motivation
Only someone with database access can turn a client into an agent (RFC 011 section 4.6), so an
agency's owner cannot onboard their own team. RFC 011 deferred "owner adds agents, agency invitations".
This RFC lets an owner add agents by email from "Mi inmobiliaria", including people who have not signed
in to Hubik yet.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] An owner adds an email. If it belongs to an existing client, that person becomes an agent of the
      owner's agency immediately.
- [ ] If nobody has used the email yet, it is stored as a pending invite and applied automatically the
      first time that email signs in (no acceptance step, no email sent).
- [ ] The owner sees a list of the agency's agents and pending invites and can cancel a pending invite.
- [ ] Roles and membership stay server-authoritative: still no client write path to `profiles` or
      `agencies`; only the owner of an agency can read or change that agency's invites.
- [ ] Conflicts (email already an agent or owner elsewhere, or the owner's own) show one neutral message.

### Non-Goals (Out of Scope)
- Removing or demoting an agent who already joined (manual database task).
- Sending email, invite expiry, an audit log, or a limit on agents or invites (chosen in scoping).
- Owners publishing, editing the agency, or any other role change.
- Any change to publishing gates, listings, search, Edge Functions, or `property-*` functions.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - existing client**: **Given** an owner and a client who has signed in, **When** the owner adds
  the client's email, **Then** the client's profile becomes `agent` of that agency, the list shows them as an
  agent, and the client sees "Registrar Vivienda" after reopening the app.
- **Story 2 - not signed in yet**: **Given** an email with no account, **When** the owner adds it, **Then**
  it appears as "Pendiente"; **When** that person signs in for the first time with Google or Apple, **Then**
  their profile is created as `agent` of that agency and the pending row disappears.
- **Story 3 - typo**: **Given** a pending invite, **When** the owner cancels it, **Then** it disappears and a
  later sign-in with that email creates a normal client.
- **Story 4 - conflicts**: **Given** an email that belongs to an agent or owner (any agency) or to the owner
  themself, **Then** the owner sees "Este correo no se puede agregar." and nothing changes. **Given** an
  email already on the owner's list, **Then** "Este correo ya está en su lista."
- **Story 5 - bad input**: an empty or malformed email shows a format error and calls nothing.
- **Story 6 - privacy**: another agency's owner, a client, an agent and an anonymous visitor cannot read
  this agency's invites, and only an owner can call the add or cancel functions.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Data model (migration `supabase/migrations/20260921_agent_invites.sql`)
```sql
CREATE TABLE public.agent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agent_invites_one_per_email ON public.agent_invites (email);
```
The table holds **pending invites only**: a row is deleted when it is used or cancelled, so there is no
history to secure. One pending invite per email across all agencies (the person can only belong to one
agency); a second agency adding the same email gets the neutral conflict message.

RLS enabled; `REVOKE ALL FROM anon, authenticated`; `GRANT SELECT TO authenticated`; one SELECT policy:
`agency_id IN (SELECT agency_id FROM public.profiles WHERE user_id = (SELECT auth.uid()) AND role = 'owner')`.
The agents list needs no new policy: agent profiles are already publicly readable (RFC 011).

### 4.2 Server functions (all `SECURITY DEFINER`, `SET search_path = ''`, `EXECUTE` revoked from `PUBLIC, anon`, granted to `authenticated`)
- `add_agent(p_email text) RETURNS text`:
  1. requires `auth.uid()` (28000) and a caller profile with `role = 'owner'` (42501);
  2. normalises to `lower(btrim(...))` and validates length and shape (22023);
  3. looks up `auth.users` by that email with `email_confirmed_at IS NOT NULL`;
  4. existing account: `UPDATE profiles SET role='agent', agency_id=<owner agency> WHERE user_id=<target> AND role='client'`
     (conditional and atomic); updated -> `'agent_added'`; else already an agent of this agency -> `'already_listed'`;
     otherwise (owner, or agent elsewhere) -> `'unavailable'`;
  5. no account: `INSERT ... ON CONFLICT (email) DO NOTHING`; inserted -> `'invited'`; else same agency
     -> `'already_listed'`; other agency -> `'unavailable'`.
- `cancel_agent_invite(p_invite_id uuid) RETURNS void`: owner only; deletes the invite only if it belongs to
  the caller's agency, otherwise raises "not found" (P0002).

### 4.3 Applying an invite on sign-in
`handle_new_user()` (existing trigger, `AFTER INSERT ON auth.users`) is extended: when the new user's
`raw_app_meta_data ->> 'provider'` is `google` or `apple` and a pending invite matches
`lower(btrim(NEW.email))`, the profile is inserted as `agent` with that agency and the invite is deleted;
otherwise a `client` as today. **`raw_user_meta_data` is never trusted** (user-editable). Provider claims live
in `raw_app_meta_data`, which only the auth server writes.

Because GoTrue may set `email_confirmed_at` in a second step after inserting the user, a second trigger
`AFTER UPDATE OF email_confirmed_at ON auth.users` (when it goes from NULL to a value) runs the same
idempotent function `apply_pending_invite(user_id, email)` for a profile that is still a `client`. Both
triggers share one function; whichever fires first wins and the other finds nothing to do.

### 4.4 Client contracts
```typescript
type AddAgentOutcome = 'agent_added' | 'invited' | 'already_listed' | 'unavailable';
interface AgencyAgent { userId: string; displayName: string | null }
interface AgentInvite { id: string; email: string; createdAt: string }

addAgent(email: string): Promise<AddAgentOutcome>;
cancelAgentInvite(inviteId: string): Promise<void>;
fetchAgencyAgents(agencyId: string): Promise<AgencyAgent[]>;
fetchAgentInvites(agencyId: string): Promise<AgentInvite[]>;
```
in `src/services/authApi.ts` (RPC calls like `create_agency`; reads through RLS).

### 4.5 Client structure
- `src/lib/agentInvites.ts` + `src/constants/agentInvites.ts`: `normalizeInviteEmail`, `isValidInviteEmail`
  (same shape rule as the database), constants for limits and the pattern. Pure, tested first.
- `src/hooks/useAgencyAgents.ts`: loads agents and invites, exposes `addByEmail`, `cancelInvite`, an outcome
  message and loading and error states; reloads after each change.
- `src/components/AgentsSection.tsx` (+ styles): email field (`keyboardType="email-address"`, no autocapitalise or
  autocorrect), "Agregar" button, result message (live region), rows for agents ("Agente") and invites
  ("Pendiente" + "Cancelar"). Rendered as the header of `src/app/agency.tsx`, above the listings, for owners only.
- `labels.ts`: new `auth.agents` namespace (all copy in Spanish).
- No new route, no Edge Function, no change to `AuthProvider` (a new agent gets the new role when the app
  reads the profile on sign-in or reopen).

### 4.6 Deploy
Apply the migration through the Supabase MCP (`apply_migration`), then run the verification script in
section 6 inside a rolled-back transaction, then the advisors. Old app builds are unaffected (additive table
and functions; the trigger change is compatible). Ship the client afterwards.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- Everything privileged is server-side and checks `auth.uid()` and the owner role itself; the client only
  hides UI. No client write path is added to `profiles`, `agencies` or `agent_invites`.
- Emails are normalised and validated in the database as well as the client (never trust the client).
- Matching uses only confirmed emails (existing users) or the provider claim in `raw_app_meta_data` (new users).
- Invitee emails are personal data: readable only by that agency's owner, deleted on use or cancel, cascade
  with the agency. Nothing logs them.
- `SECURITY DEFINER` functions live in `public` and are callable by `authenticated` (the linter will warn, as
  for `create_agency`); each one guards itself with `auth.uid()` and the owner check.

### Known limits (accepted)
| Limit | Why it is accepted |
| :--- | :--- |
| No cap and no rate limit on invites | Chosen in scoping; Supabase platform rate limits still apply; a per-owner limit is a follow-up |
| Success versus "no se puede agregar" tells an owner an email belongs to an agent or owner | Chosen in scoping (neutral wording, no reason); returning identical output is impossible without hiding real success |
| Apple "Hide My Email" users never match a real-email invite | Apple gives a private relay address; the owner can invite that address if known |
| Invites never expire | Deferred |
| A person already in the app sees the new role only after reopening | Avoids a new refresh mechanism |

### Failure Modes
| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Caller not signed in | Function raises 28000 | Client shows a generic error |
| Caller not an owner | Function raises 42501 | Client shows a generic error |
| Malformed email | Client rejects first; server raises 22023 as backstop | Format message |
| Conflict | Function returns `unavailable` | Neutral message |
| Already listed | Function returns `already_listed` | "Ya está en su lista" |
| Network or server error | Hook keeps the list and shows a retry message | Nothing changes |
| Cancel of another agency's invite | Function raises P0002 | Generic error, nothing deleted |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `src/lib/__tests__/agentInvites.test.ts`: normalisation and validation cases.
- [ ] `src/services/__tests__/authApi.test.ts` additions: RPC names and arguments, outcome mapping, errors, reads.
- [ ] `src/hooks/__tests__/useAgencyAgents.test.ts`: load, add outcomes, cancel, reload, errors.
- [ ] `src/components/__tests__/AgentsSection.test.tsx`: list rendering, each outcome message, cancel, disabled
      state while adding, accessibility labels.
- [ ] `src/app/__tests__/agency.test.tsx` additions: section shown for the owner; listings still render.
- [ ] Database behaviour (run through `execute_sql` inside `BEGIN ... ROLLBACK`, impersonating roles): owner adds
      an existing client, an unknown email, a duplicate, the owner's own email, an agent of another agency;
      non-owner and anonymous calls are rejected; invalid emails rejected; cancel scoped to the caller's agency;
      sign-up trigger promotes only for provider `google` or `apple` and keeps an `email`-provider signup as a
      client with the invite intact; the `email_confirmed_at` trigger path; case-insensitive matching; RLS: owner A
      cannot read owner B's invites, and a client, agent or anon reads none.
- [ ] Advisors after applying: only the expected `SECURITY DEFINER` executable warnings.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees`, no comments in new code, files under ~300 lines.
- [ ] Manual, on a second real Google account that has never signed in: pending invite, first sign-in, agent menu.
- [ ] Update `.agents/rules/07-feature-graph.md`, RFC 011 (decision), and the session log.

---

## 7. Open Questions
- Rate limiting per owner (the scope allowed unlimited invites) is left as a follow-up.
- Removing or demoting an agent is the natural next slice; it needs a decision about what happens to their
  listings' agent name.

---

## 8. Implementation notes (2026-09-21)
- **Migration** `agent_invites` was applied through the Supabase MCP (file: `supabase/migrations/20260921_agent_invites.sql`). The advisors show only the expected `SECURITY DEFINER` executable warnings for `add_agent` and `cancel_agent_invite` (same intentional pattern as `create_agency`).
- **Database tests**: `supabase/tests/agent_invites.test.sql` (34 checks over 29 scenarios). It is one `DO` block that impersonates each role and always ends with `RAISE EXCEPTION` carrying the results, so nothing can persist. Run it with `execute_sql`; every line must start with `PASS`. It passed against the live project, and afterwards no test users, agencies or invites remained.
- **Test-harness bug found while running it**: `text[] || text || text` reads the label as an array literal; results are built as `v_res || (CASE ... || ' label')`.
- **Both sign-in paths are covered and proven**: the insert trigger (provider `google` or `apple` in `raw_app_meta_data`) and the `email_confirmed_at` trigger. An `email`-provider sign-up cannot claim an invite through `user_metadata` (check 22).
- **Client**: `agency.tsx` is now one `FlatList` whose header is `AgentsSection` and whose empty component carries the loading, error and empty states, so the team and the listings scroll together and the section stays usable when the listings fail. The agents list itself is a non-scrolling `FlatList` with a `keyExtractor`.
- **Observation**: the advisors also report `auth_leaked_password_protection` disabled, which means email and password sign-in is enabled on the project. The design is safe for that (an email sign-up only matches an invite after it confirms the address), but if password sign-in is not used it is worth disabling the Email provider.
- **Still open**: an end-to-end run with a second real Google account that has never signed in (the new-user path in production), and rate limiting per owner.

---

## 9. Amendment (2026-09-21, RFC 018)
Owners can now also find a registered client by name or email start and add them by picking them (masked email, rate limited, `add_agent_by_id`). Adding by full email is unchanged. See `specs/018-search-clients-to-add-as-agents.md`.

