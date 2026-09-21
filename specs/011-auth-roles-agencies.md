# RFC 011: Sign-in, Roles & Agencies (Multi-Tenant Foundation)

- **Author**: AI Agent (Claude Code)
- **Status**: Approved (2026-09-19); implemented locally, not yet applied or deployed
- **Created**: 2026-09-19
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant
- **Related ADRs**: [ADR 0003](../docs/adr/0003-supabase-oauth-web-flow-sign-in.md), [ADR 0004](../docs/adr/0004-agency-tenancy-and-server-authoritative-roles.md)
- **Extends**: RFC 001 (Supabase client + SecureStore session), RFC 004/006/007/008/010 (registration and search)

---

## 1. Problem Statement & Motivation
The app is anonymous. Anyone can publish a property (RFC 004/007 explicitly put authentication and
per-user ownership out of scope), nothing records who published a listing or which business it
belongs to, and the AI-backed registration functions can be called by anyone, which already cost
quota (RFC 009). HUBIK is meant to be a multi-tenant platform: real-estate businesses
(agencies) publish through their agents, and clients search across all of them.

This RFC adds sign-in, three roles and the agency as the tenant. It is the first slice; owner
self-service for adding and removing agents is deferred (section 2).

---

## 2. Goals & Explicit Non-Goals

### Goals (approved scope brief)
- [ ] Sign in with Google or Apple (both offered on iOS); the session persists between app opens.
- [ ] Three roles, one role and at most one agency per person: `client` (no agency), `agent`, `owner`.
      A new sign-in with no role is a `client`.
- [ ] An owner self-registers: a signed-in client creates an agency by giving its name only, and
      becomes that agency's owner.
- [ ] Signed-out people and clients see properties read-only and can use the search bar across
      all agencies (shared marketplace). Each listing shows its agency and agent.
- [ ] Registering a property is available to agents only (UI and backend). Clients, signed-out
      users and owners do not get it.
- [ ] Every listing belongs to an agency and records the agent who published it.
- [ ] Existing properties are moved to a default agency.
- [ ] An owner can see their agency's listings (read-only).
- [ ] Agents are assigned to an agency manually by the human lead (procedure in section 4.6).

### Non-Goals (Out of Scope)
- Contacting an agent (deferred; decision 5 in section 7).
- Owner adds/removes agents in the app, agency invitations (slice 2).
- Owners publishing listings; any owner console beyond creating the agency and viewing its listings.
- Email/password, email code and phone sign-in.
- Several roles or several agencies per person.
- Agency profile beyond its name (logo, contacts, address); per-agency white-label apps.
- Editing or deleting listings; account deletion (decision 1 in section 7).

---

## 3. User Stories & Acceptance Criteria
- **Story 1 (anonymous browsing)**:
  - **Given** a signed-out user, **When** they open the app and search, **Then** they see
    properties read-only with agency and agent, and no register entry exists in the UI.
- **Story 2 (sign-in)**:
  - **Given** a signed-out user, **When** they sign in with Google or Apple, **Then** they land
    as a `client`, the session persists after restarting the app, and there is still no register entry.
- **Story 3 (owner creates agency)**:
  - **Given** a signed-in `client`, **When** they choose "I own an agency" and submit a name,
    **Then** an agency is created, they become its `owner`, and the register entry stays hidden.
- **Story 4 (agent publishes)**:
  - **Given** a signed-in `agent` assigned to an agency, **When** they register a property,
    **Then** it appears in search under that agency and agent.
- **Story 5 (backend enforcement)**:
  - **Given** a `client`, an `owner` or an anonymous caller, **When** they call `property-publish`
    or `property-intake` directly, **Then** the response is 401 or 403 and nothing is written or
    generated.
- **Story 6 (owner listings)**:
  - **Given** a signed-in `owner`, **When** they open "My agency", **Then** they see every
    property published by their agency's agents, read-only.
- **Story 7 (legacy data)**:
  - **Given** properties created before this RFC, **When** a user searches, **Then** they still
    appear, under the default agency and with no agent name.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Data model (migration `supabase/migrations/20260920_auth_roles_agencies.sql`)
```sql
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client','agent','owner')),
  agency_id uuid references public.agencies(id),
  display_name text,
  created_at timestamptz not null default now(),
  check ((role = 'client') = (agency_id is null))
);
create unique index profiles_one_owner_per_agency on public.profiles (agency_id) where role = 'owner';

alter table public.properties
  add column agency_id uuid references public.agencies(id),
  add column created_by uuid references auth.users(id) on delete set null;
-- backfill: insert default agency (fixed id), update properties set agency_id = <default>;
-- then: alter column agency_id set not null; create index on properties (agency_id).
```
- **Trigger** `on auth.users insert` creates the `client` profile (`display_name` from the
  provider's `full_name`/`name` metadata, nullable because Apple may omit it).
- **RLS**: `profiles` is readable by its own user, plus rows with `role = 'agent'` by everyone
  (no personal data: display name, role and agency only; anon gets column-level `SELECT`). There
  is no insert/update/delete policy, so roles cannot be self-assigned. `agencies` is readable by
  everyone, no write policy. `properties` keeps public read and gets no client write policy
  (writes stay in Edge Functions). Explicit `GRANT SELECT`s are included because the Data API
  does not always expose new tables.
- **`agents_public` view** (`user_id`, `display_name`, `agency_id`, agent rows only), created
  `WITH (security_invoker = true)` so it respects RLS (Supabase skill security checklist).
- **`property_listings` view** (also `security_invoker`): `properties` joined with `agencies` and `agents_public`, adding
  `agency_name` and `agent_name`. It is the single join point: the hybrid RPC, the `chat-query`
  fallback select and the owner's agency screen all read from it.
- **`create_agency(p_name text) returns uuid`**: `security definer`, empty `search_path`, uses
  `auth.uid()`, fails unless the caller is a `client`, creates the agency and promotes the caller
  to `owner` atomically. Executable by `authenticated` only.
- **Storage**: the public upload policy on `property-images` is replaced by an upload policy for
  `authenticated` users whose profile role is `agent`. Public read is unchanged.
- **`match_properties_hybrid`**: now selects from `property_listings`; return type gains
  `agency_id`, `agency_name`, `agent_name` (drop and recreate, since the return type changes);
  same relational and vector logic, including the amenities filter from RFC 010.

### 4.2 Edge Functions
- New `_shared/auth.ts`: `requireAgent(req, corsHeaders)` builds a service-role client, reads the bearer token, resolves the user
  with `auth.getUser(token)`, loads the profile with the service-role client, and returns
  `{ userId, agencyId }` or a ready 401 (no or invalid user token, including the anon key) or 403
  (role is not `agent`).
- `property-publish`: calls `requireAgent` first; inserts `agency_id` and `created_by` taken
  from the profile. Any `agency_id` or `created_by` in the request body is ignored.
- `property-intake`: gated with the same `requireAgent`; it is registration-only and consumes
  Gemini and Groq quota.
- `property-describe` is **not** gated: the property detail screen calls it for any viewer to
  fill in missing descriptions of legacy listings, and browsing stays open. See decision 4.
- `chat-query`: stays open (anon or signed-in); its fallback select reads `property_listings`
  and the hybrid RPC result includes agency and agent names.
- No transport change on the client: `supabase.functions.invoke` already sends the session's
  access token when signed in.

### 4.3 Client contracts
```typescript
export type Role = 'client' | 'agent' | 'owner';

export interface Profile {
  userId: string;
  role: Role;
  agencyId: string | null;
  displayName: string | null;
}

export interface RoleCapabilities {
  canRegisterProperty: boolean;
  canCreateAgency: boolean;
  canViewAgencyListings: boolean;
}

export type AuthProvider = 'google' | 'apple';

export interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  profile: Profile | null;
  capabilities: RoleCapabilities;
  signIn(provider: AuthProvider): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}
```
`Property` (snake_case, like the rest of the type) gains optional `agency_id`, `agency_name`, `agent_name`.

### 4.4 Client structure (no global state library)
- `src/lib/roles.ts`: `ROLE_CAPABILITIES: Record<Role, RoleCapabilities>` and
  `getCapabilities(role | null)` (dictionary lookup, signed-out maps to all `false`).
  Tests in `src/lib/__tests__/roles.test.ts`.
- `src/services/authApi.ts`: `signInWithProvider`, `signOut`, `fetchProfile`, `createAgency`,
  `fetchAgencyListings`; pure helpers in `src/lib/authCallback.ts` and `src/lib/authProviders.ts`.
- `src/hooks/AuthProvider.tsx` + `useAuth.ts`: React Context over `onAuthStateChange`.
  Added to `src/app/_layout.tsx`.
- Screens, each with an adjacent `.styles.ts`: `src/app/sign-in.tsx` (two large buttons),
  `src/app/create-agency.tsx` (one name field), `src/app/agency.tsx` (owner's read-only `FlatList`).
- `BurgerMenu.items.ts`: `getMenuItems(capabilities, status)`. `register` only when
  `canRegisterProperty`; adds sign in / sign out, "I own an agency" (clients) and "My agency" (owners).
- `src/app/index.tsx` is already 670 lines, above the 300-line rule. This RFC only adds the
  capability guard for the `startRegistration` param there, and puts everything else in hooks and lib.
- Copy in `src/constants/labels.ts`; screens handle loading, signed-out, empty and error states.
- Sign-in uses Supabase OAuth with PKCE (`flowType: 'pkce'` on the client) through
  `expo-web-browser` and the existing `hubikmobile://` scheme (ADR 0003). New dependency:
  `expo-web-browser`.
- `PropertyCard` and the detail screen show "agency · agent" when the data is present.

### 4.5 Migration and deploy order
1. Human applies the migration (backfill, then `NOT NULL`).
2. Human configures Google and Apple providers and the redirect URL in Supabase.
3. Deploy `property-publish`, `property-intake`, `chat-query`. Registration on
   older app builds stops working after this step (acceptable pre-release).
4. Ship the app build.

### 4.6 Manual agent assignment (operational procedure)
The agent signs in once (creating a `client` profile), then the human lead runs, in the SQL editor:
```sql
update public.profiles
   set role = 'agent', agency_id = '<agency uuid>'
 where user_id = (select id from auth.users where email = '<agent email>');
```
The person must be a `client` first; the check constraint rejects a half-assigned row.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- Role and agency are only ever read server-side from `profiles`; the client's copy is for UI
  only. There is no path for a client to write `profiles` or set `agency_id` on a property.
- OAuth uses PKCE; only the `hubikmobile://` redirect is allowed in Supabase; tokens live in
  `expo-secure-store` (RFC 001).
- Agency name is trimmed and length-checked in the database; agent and agency names render as text.
- `agents_public` exposes display name and agency only, never email or role details.
- Provider secrets stay in Supabase dashboard config, never in the app or repo.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Publish or intake without a user token | Reject before any work | 401 |
| Signed in but not an `agent` | Reject before any work | 403 |
| `create_agency` by a non-client, or blank name | Database exception, message shown | 400-class RPC error |
| User cancels the provider sheet | Return to sign-in, no error | none |
| Provider or network failure | Retry option, app stays usable signed-out | error state |
| Profile fetch fails after sign-in | Treat as `client`, offer retry | error state |
| Apple returns no name | `display_name` null, UI falls back to the email prefix or a generic label | none |

---

## 6. Verification & Test Plan (TDD, written first)
- [ ] Unit: `getCapabilities` for each role and for signed-out.
- [ ] Unit: `authApi` (mocked Supabase): sign-in URL and PKCE exchange, sign-out, profile mapping.
- [ ] Unit: `AuthProvider` and `useAuth`: loading, signed-in, signed-out transitions; session restore.
- [ ] Integration: `BurgerMenu` items per role and signed-out; `register` is absent for all but `agent`.
- [ ] Integration: home screen ignores `startRegistration` for non-agents.
- [ ] Integration: sign-in, create-agency and agency screens render states, accessibility roles,
      44pt touch targets, and labels come from `labels.ts`.
- [ ] Integration: property card and detail show agency and agent, and tolerate legacy rows.
- [ ] Edge Function: `requireAgent` returns 401 (no token, anon key), 403 (client, owner), pass (agent);
      `property-publish` ignores body-supplied `agency_id` and `created_by`.
- [ ] SQL (run by the human via the Supabase MCP after applying): trigger creates a client profile;
      a client cannot update `profiles` or insert a property directly; `create_agency` promotes a
      client once and fails a second time; one owner per agency; legacy rows have the default
      agency; storage upload denied for anon and clients.
- [ ] Gates: `scripts/verify.sh check-all` and secret scan pass; feature graph
      `.agents/rules/07-feature-graph.md` updated with RFC 011.

---

## 7. Decisions Recorded (2026-09-19)
The human lead approved this RFC with the recommended answers:
1. **Account deletion**: deferred to a follow-up RFC. It must be done before App Store submission
   (Apple generally requires in-app deletion for apps that offer account creation).
2. **Agent names** are shown publicly on listings.
3. **Default agency name**: placeholder "HUBIK". Rename with
   `update public.agencies set name = '<name>' where id = '00000000-0000-0000-0000-000000000001'`.
4. **Gating**: `property-publish` and `property-intake` are agent-only. `property-describe`
   stays open because the detail screen depends on it for anonymous browsing (found during
   implementation, correcting the original design). It remains an unauthenticated AI call; rate
   limiting it is a follow-up.
5. **Contact-an-agent** and **listing edit/delete** stay out of scope.
6. **Provider accounts** (Google Cloud OAuth client, Apple Developer membership with a Services
   ID and key) and enabling both providers in Supabase are human tasks still pending. Only
   `hubikmobile://auth/callback` should be allowed as a redirect URL.
7. **`expo-web-browser`** was added. Installing it needed `--legacy-peer-deps` because of an
   existing peer conflict (`@testing-library/react-native@12` vs `expo-router`'s optional
   `>=13.2` peer).
8. **Signed-in user card (2026-09-20)**: the drawer's profile card, previously hardcoded
   placeholder text ("Don Carlos"), now shows the real user. Signed in: display name, role label
   (Cliente / Agente / Propietario) and the Google photo, with initials as fallback when there is
   no photo or it fails to load. Signed out: a marketing message ("Encuentra la propiedad de tus
   sueños" / "Regístrate") that opens the sign-in screen. Hidden while the session loads. The photo
   comes from the session's `user_metadata` (`avatar_url` or `picture`) and is accepted only when
   it is an `https://` URL; it is display-only and never used for authorization. Email and agency
   name were considered and left out of this slice. Code: `DrawerProfileCard`,
   `src/lib/userDisplay.ts`; `Profile.avatarUrl` is filled in `AuthProvider`. The old `BurgerMenu`
   test asserted the placeholder name; its assertion changed to the guest message because the
   requirement changed.
