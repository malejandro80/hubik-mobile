# RFC 018: Search clients to add them as agents

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; migration applied to the live project and its SQL suite passes (36 of 36); client covered by tests; NOT yet exercised on a device (needs an owner session and at least one client account)
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 013 (owners add agents), RFC 011 (roles and privacy), RFC 014 (shared team list)

---

## 1. Problem Statement & Motivation
An owner can only add an agent by typing the exact email (RFC 013). Owners rarely remember exact emails, but they know
names. They should be able to type part of a name or email, see matching registered clients, pick one and add them.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] In the Agentes email field, after 3 or more characters, up to 5 matching registered clients appear under it.
- [ ] Each result shows the display name and a **masked** email (`a***@gmail.com`); only role `client` users with a confirmed
      email; never agents, owners or anyone already in an agency.
- [ ] Picking a result shows that person as selected (name + masked email, with **Cambiar**); **Agregar** adds them through
      the existing flow and messages.
- [ ] Typing a full email and pressing Agregar still works exactly as before (including pending invites).
- [ ] A per-owner search rate limit, with a clear "try again in a moment" line.
- [ ] Only owners can search; nobody else can call it.

### Non-Goals (Out of Scope)
- Suggestions in the chat bar; searching agents or owners; showing full emails; a client opt-out from being found;
  notifying the client; pagination; removing agents; changes to publishing or to `add_agent` itself.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - search**: **Given** an owner, **When** they type "ana", **Then** after a short pause they see "Ana García ·
  a***@gmail.com" (up to 5), and nothing is searched for 1 or 2 characters.
- **Story 2 - pick and add**: tapping a result shows the selection; **Agregar** adds them; the list shows them as an agent and
  the feedback reads "agent added". **Cambiar** returns to the search field with the text kept.
- **Story 3 - matching**: the typed text matches the start of the display name, the start of any word of the display name, or
  the start of the email. Case and surrounding spaces are ignored; `%` and `_` are literal characters.
- **Story 4 - who appears**: agents, owners, clients without a confirmed email, and the owner themselves never appear.
- **Story 5 - full email**: typing `luis@correo.com` and pressing Agregar behaves as in RFC 013 (added, invited, already listed,
  or the neutral "no se puede agregar").
- **Story 6 - no match**: "Sin coincidencias. Puede invitar con el correo completo."
- **Story 7 - rate limit**: after 20 searches in a minute the list says to wait; searches work again a minute later.
- **Story 8 - access**: a client, an agent and an anonymous caller get an error from the search and from `add_agent_by_id`.
- **Story 9 - stale add**: if the picked person stopped being an available client (someone else added them first), Agregar
  reports the neutral unavailable message and changes nothing.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Data model (migration `supabase/migrations/20260922_client_search.sql`)
- `public.client_search_log (owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, searched_at timestamptz NOT NULL
  DEFAULT now())` with an index on `(owner_id, searched_at)`. RLS enabled, **no policies**, all privileges revoked from
  `anon` and `authenticated`; only the search function writes it. Rows older than 10 minutes are deleted on each call.

### 4.2 Server functions (`SECURITY DEFINER`, `SET search_path = ''`, `EXECUTE` revoked from `PUBLIC, anon`, granted to `authenticated`)
- `search_agent_candidates(p_query text) RETURNS TABLE (user_id uuid, display_name text, masked_email text)`:
  1. `auth.uid()` required (28000); caller must be an owner (42501).
  2. Normalises the query (`lower(btrim())`); more than 100 characters raises 22023; fewer than 3 returns no rows and does
     not count against the limit.
  3. Rate limit: more than 20 rows in `client_search_log` for this owner in the last 60 seconds raises `rate_limited`
     (P0001); otherwise one row is inserted.
  4. Escapes `\`, `%`, `_`, then matches with `LIKE ... ESCAPE '\'` on the name prefix, any word prefix of the name, or the
     email prefix. Only `profiles.role = 'client'` and `auth.users.email_confirmed_at IS NOT NULL`. Ordered by name then
     email, `LIMIT 5`.
  5. `masked_email = left(email, 1) || '***' || substr(email, position('@' in email))`. The full email never leaves the server.
- `add_agent_by_id(p_user_id uuid) RETURNS text`: same guards as `add_agent`; promotes that user to `agent` of the owner's
  agency only if they are a `client` with a confirmed email (and removes a pending invite of the same agency for their
  email); returns `agent_added`, `already_listed` (already an agent of this agency) or `unavailable` (anything else). It
  reuses the existing outcome set, so no new client wording is needed.

### 4.3 Client contracts
- `src/services/authApi.ts`: `searchAgentCandidates(query): Promise<ClientCandidate[]>` (throws a `rate_limited` error for
  that condition) and `addAgentById(userId): Promise<AddAgentOutcome>`.
- `src/types/auth.ts`: `ClientCandidate { userId; displayName: string | null; maskedEmail }`.
- `src/lib/clientSearch.ts`: `shouldSearchClients(text)` (trimmed length >= 3).
- `src/hooks/useClientSearch.ts`: `(query) => { status: 'idle' | 'loading' | 'ready' | 'rate_limited' | 'error'; results }`,
  debounced (300 ms), ignores stale responses, does nothing below 3 characters.
- `src/hooks/useAgencyAgents.ts`: gains `addAgentById(userId)` returning the same feedback values (and reloading on success).
- UI: `src/components/ClientSearchResults.tsx` (+ styles) shows the states and rows (each >= 48 points, role button, label
  "Elegir a {name}, {masked email}"); `AgentsSection` owns `selected` and shows the chosen person with **Cambiar** in place of
  the field. Constants in `src/constants/clientSearch.ts`; copy in `labels.auth.agents.search`.

### 4.4 Deploy
Migration applied through the Supabase MCP (`apply_migration`) to project `wbzfeqzvwfglirwlpzpy`, then verified with the SQL test
suite (always-aborting `DO` block, same pattern as `supabase/tests/agent_invites.test.sql`) and `get_advisors`. Client change
ships with the app. No Edge Function.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- All privileged work is server-side; each function checks `auth.uid()` and the owner role itself. The client only hides UI.
- The search is a deliberate, narrow exception to RFC 011's rule that client profile rows are private: only owners, only
  clients, only 5 rows, only a masked email, only after 3 characters, and rate limited.
- The user id returned for a candidate is only usable by `add_agent_by_id`, which re-validates role and email server side.
- LIKE wildcards are escaped so `%` cannot list the directory.
- No email or name is logged; `client_search_log` stores no query text.

### Accepted trade-offs
| Trade-off | Why it is accepted |
| :--- | :--- |
| Any owner can find any client by name or email prefix; clients cannot opt out | Chosen in scoping; mitigated by masking, 3-character minimum, 5 results and the rate limit; opt-out is deferred |
| Result and "no results" reveal that a matching client exists | Inherent to search; only a masked email is shown |
| An owner can still probe slowly within the limit | Rate limit bounds the speed; audit or stricter limits are follow-ups |
| Names are shown in full | Needed to recognise the person |

### Failure Modes
| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Fewer than 3 characters | No call, no results | Nothing shown |
| Rate limit exceeded | Server `rate_limited`; list line "espere un momento" | No results until it clears |
| Network or server error | List line "no pude buscar" | Owner can still type a full email |
| Older response arrives late | Ignored (only the latest query is shown) | Correct results |
| Picked person no longer available | Neutral unavailable feedback | Nothing changes |
| Signed-out or non-owner caller | Errors 28000 / 42501 | No data |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `supabase/tests/client_search.test.sql` (run via `execute_sql`, always aborts): matching (name prefix, word prefix, email
      prefix, case, spaces), masking, only confirmed clients, never agents/owners/self, cap of 5, under 3 characters,
      wildcard escaping, rate limit and reset, each other owner counted separately, caller checks for client, agent and
      anonymous, log table unreadable/unwritable by clients, `add_agent_by_id` outcomes, invite cleanup, concurrent-safe
      promotion.
- [ ] `authApi` tests: `searchAgentCandidates` mapping and `rate_limited`, `addAgentById`.
- [ ] `useClientSearch` tests: minimum characters, debounce, results, stale response ignored, rate limited, error.
- [ ] `useAgencyAgents` tests: `addAgentById` feedback and reload; RFC 013 tests unchanged.
- [ ] `ClientSearchResults` and `AgentsSection` tests: rows, states, pick then Agregar, Cambiar, full email path unchanged.
- [ ] Migration applied with `apply_migration`, SQL suite all PASS, `get_advisors` reviewed, no test data left behind.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] Manual on the iOS simulator as the owner (needs the owner session), then Android.
- [ ] Update the feature graph, RFC 013 and the session log.

---

## 7. Open Questions
- Client opt-out from search, or an owner-visible audit of searches (deferred).
- Chat-bar suggestions on "Mi inmobiliaria" (deferred).

---

## 8. Implementation notes (2026-09-21)
- **Deployed**: `client_search` applied through the Supabase MCP to `wbzfeqzvwfglirwlpzpy` (local file `supabase/migrations/20260922_client_search.sql`; the remote history uses its own timestamp). `get_advisors`: two new `authenticated_security_definer_function_executable` warnings (`search_agent_candidates`, `add_agent_by_id`, same accepted pattern as `add_agent`) and one INFO for `client_search_log` (RLS on, no policies, on purpose). No test data left behind.
- **SQL suite** `supabase/tests/client_search.test.sql`: 36 checks. The first full run showed 35 PASS and a silently missing check 15: a test bug (after a `FOR` loop PL/pgSQL restores the outer loop variable, which was `NULL`). The test now copies the counter into `v_n`; check 15 was re-run on its own fixtures and passes.
- Built as designed: `search_agent_candidates`, `add_agent_by_id`, `client_search_log`; client `searchAgentCandidates`, `addAgentById`, `useClientSearch` (300 ms debounce, stale answers ignored), `useAgencyAgents.addAgentById`, `ClientSearchResults`, and `AgentsSection` (selected person with **Cambiar**).
- **Decision beyond the RFC text**: after Agregar with a picked person, the pick is cleared for every outcome except a network error (so a stale `unavailable` cannot be retried by mistake); the typed text is cleared only on `agent_added`.
- **Data note**: at the time of deployment the project has no `client` accounts, so the search returns nothing in production until one exists; a device test needs an owner session plus a second (client) Google account.
- Tests: `authApi` (+12), `clientSearch` lib (4), `useClientSearch` (7), `useAgencyAgents` (+5), `ClientSearchResults` (7), `AgentsSection` (+8); RFC 013 tests unchanged apart from additive mock members.

