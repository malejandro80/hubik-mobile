# RFC 031: Contact the Agent by WhatsApp

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Clients should be able to contact the agent of a listing directly. Today the detail screen's
"Contactar asesor" only shows a fake alert, and no phone number is stored anywhere. Scope
approved on 2026-09-23 (slice 2 of 2 after RFC 030): the number belongs to the agent who
published, with the agency's number as fallback; visitors behave like clients.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] An agent can save, change or clear their WhatsApp number from their profile card in the
      menu; an owner can do the same for their agency in "Mi inmobiliaria".
- [x] Numbers are stored in international format (`+` and 8-15 digits), validated in the app and
      by a database CHECK.
- [x] Visitors and clients see "Contactar por WhatsApp" on a listing's detail when a number is
      available; it opens WhatsApp with "Hola, me interesa «<title>» que vi en Hubik.".
- [x] The number used is the publishing agent's, else the agency's; without either the button is
      hidden. Agents and owners do not see the button.

### Non-Goals (Out of Scope)
- In-app chat, calls, the client's own number, the shared web page.

---

## 3. User Stories & Acceptance Criteria
- **Given** agent Luis saved +584141234567, **when** a client taps "Contactar por WhatsApp" on
  Luis's listing, **then** `https://wa.me/584141234567?text=…` opens.
- **Given** Luis has no number but his agency has one, **then** the agency's number is used.
- **Given** neither, **then** no contact button is shown.
- **Given** an agent types "0414 123", **then** saving is refused with an explanation.

---

## 4. Proposed Architecture & Public Contracts

### Database (`20260923_whatsapp_contact.sql`)
- `profiles.whatsapp`, `agencies.whatsapp`: `text NULL CHECK (whatsapp ~ '^\+[1-9][0-9]{7,14}$')`.
- `GRANT UPDATE (whatsapp)` on both tables to `authenticated` (no table-level UPDATE exists).
- RLS: an agent updates their own profile row; an owner updates their own agency row.
- `agents_public` and `property_listings` append the new columns
  (`agent_whatsapp`, `agency_whatsapp`); `search_properties_hybrid` returns
  `contact_whatsapp = coalesce(agent_whatsapp, agency_whatsapp)`.

### App
```typescript
// src/lib/whatsapp.ts
export function normalizeWhatsApp(input: string): string | null;   // "+58 414-123 4567" → "+584141234567"
export function whatsAppUrl(phone: string, text: string): string;
export function canContactAgents(profile: Profile | null): boolean; // visitor, client

// src/services/authApi.ts
export function updateMyWhatsApp(userId: string, phone: string | null): Promise<void>;
export function updateAgencyWhatsApp(agencyId: string, phone: string | null): Promise<void>;
export function fetchAgencyWhatsApp(agencyId: string): Promise<string | null>;

// src/components/WhatsAppField.tsx: inline editable row (view / edit / save / clear)
```
`Property.contact_whatsapp` travels in the detail route params (`whatsapp`) and is re-validated
with `normalizeWhatsApp` before use.

---

## 5. Security & Error Handling
- Only the row owner can write, and only the `whatsapp` column; the CHECK rejects malformed
  values even if the app is bypassed.
- The number is public by design (a contact number the agent chooses to publish); the field
  says so.
- Route params are untrusted: an invalid `whatsapp` param hides the button.

| Failure | Handling |
| :--- | :--- |
| Invalid number typed | Inline error, nothing saved |
| Save fails | Inline error, previous value kept |
| WhatsApp cannot be opened | Alert explaining it |

---

## 6. Verification & Test Plan
- [x] Unit: `normalizeWhatsApp`, `whatsAppUrl`, `canContactAgents`.
- [x] Services: update/fetch calls.
- [x] Components: `WhatsAppField` edit/save/clear/error; drawer (agent only); agency screen
      (owner); detail contact button by role and number.
- [x] SQL: agent updates own number, cannot update another's; owner updates own agency; CHECK
      rejects bad input; anon sees `contact_whatsapp` in search.
- [x] `npm run lint`, `npm test`, `npm run typecheck`.

---

## 7. Deployment Notes (2026-09-23)
- Migration `whatsapp_contact` applied via MCP.
- Impersonation checks (rolled back): an agent updates only their own number (1 row), not another
  agent's nor the agency's (0); an owner updates only their own agency (1), not another agency or
  an agent (0); an agent trying to change their `role` gets `permission denied` (column grant);
  "0414 123" is rejected by the CHECK; an anon search returns the agent's number on the agent's
  listings and the agency's number on the rest.
- Live `chat-query` returns `contact_whatsapp` (null until numbers are saved). Advisors unchanged.

