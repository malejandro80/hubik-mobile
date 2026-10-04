# RFC 036: Ask the AI About the Current View (slice 1: property detail)

- **Author**: AI Agent (Claude Code)
- **Status**: Deployed (Edge Function + table, 2026-10-03); app changes ship with the next app build
- **Created**: 2026-10-03
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
On a property detail the chat bar sends the question to the home search (`chat-query`), so "¿qué tal
el tráfico por la zona?" or "¿qué ventajas tiene frente a otras?" returns a search instead of an
answer about that listing. Users want to ask about what they are looking at, including things the
listing does not state but an AI can reasonably infer, without exposing private data.

Scope brief approved by the user on 2026-10-03: slice 1 of 3 (property detail; then Mi inmobiliaria;
then the shared web page).

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] Signed-in users ask on the detail (typed or voice) and the answer appears on the detail. Turns
      live only while the screen is open; nothing is stored on the server.
- [ ] Answers use the listing's public facts, real Hubik comparables from the same city (only their
      public facts, scoped like the user's own search, RFC 030), and the model's general knowledge of
      the sector/city, always flagged as an approximate estimate.
- [ ] Always refused, pointing to the listing's contact: owner data, exact address or coordinates,
      cadastral reference, agent contact or personal data not on the listing (and the listing agent of
      an opaque link, RFC 035), other clients' data, unpublished price or terms.
- [ ] Signed-out visitors see a sign-in prompt instead of the bar.

### Non-Goals (Out of Scope)
- Other views (slices 2 and 3), external data providers, persistent history, launching searches from
  the detail, per-user rate limits.

---

## 3. User Stories & Acceptance Criteria
- **Given** a client on "Casa en alquiler en El Bosque", **when** they ask "¿qué tal el tráfico por la
  zona?", **then** an answer about El Bosque / Valencia, marked as an estimate, appears on the detail.
- **When** they ask "¿qué ventajas tiene frente a otras casas?", **then** the answer compares with real
  Hubik houses in Valencia (price, price per m², size, amenities).
- **When** they ask "dame el teléfono del dueño" or "¿cuál es la dirección exacta?", **then** the reply
  refuses and points to the contact button, without calling the model.
- **Given** a signed-out visitor, **then** the detail shows "Inicia sesión para preguntar".

---

## 4. Proposed Architecture & Public Contracts

### Edge Function `property-ask` (`verify_jwt: true`, signed-in users only)
```typescript
// request
{ question: string; target: { kind: 'listing'; id: string } | { kind: 'shared'; token: string };
  history?: { question: string; answer: string }[] }
// response
{ answer: string; refused: boolean }
```
1. `requireUser`: a real user session (the anon key alone is rejected with 401).
2. Validate input: question 1-300 chars, at most 4 history turns, each field capped.
3. `sensitiveTopic(question)`: deterministic Spanish/English patterns → canned refusal, no model call.
4. Context built on the server with the caller's JWT: `property_listings` by id (public columns only)
   or `get_shared_listing(token)`; comparables from `search_listings(p_city, p_property_type)` — role
   scoped — minus the listing itself, reduced to an allowlist of facts.
5. `geminiGenerateText` (`gemini-3.5-flash-lite`) with `propertyAskInstruction()`; the payload is
   JSON data, never instructions.
6. `screenAnswer`: an answer containing a phone number, e-mail or URL is replaced by the refusal.

### Shared modules (`supabase/functions/_shared/`, Jest-tested)
`propertyAsk.ts` (+ `propertyAskConstants.ts`): `parseAskRequest`, `sensitiveTopic`, `listingFacts`,
`comparableFacts`, `buildAskPayload`, `screenAnswer`.

### App
- `src/services/propertyAskService.ts`: `askAboutProperty(request)`.
- `src/hooks/usePropertyAsk.ts`: turns, pending state, last 4 turns sent as history.
- `src/lib/askTarget.ts`: `resolveAskTarget(params)` → listing id, opaque token, or null (preview).
- `PropertyAskThread`: a `FlatList` of turns above the bar with a bounded height.
- Detail: the bar asks in place (voice reuses `useVoiceNote`); signed-out users get a sign-in prompt.

---

## 5. Security & Error Handling
- Data minimisation is the primary control: the model never receives address, coordinates, catastro,
  owner, agent fields, ids or other clients. Pattern refusals and answer screening are extra layers.
- Context is resolved on the server from the id or token; the client never sends listing facts.
- The question and history are untrusted and capped; the prompt marks the payload as data.

| Failure Condition | Handling Strategy |
| :--- | :--- |
| No session / anon key | 401 |
| Invalid input | 400 |
| Listing or token not found | 404 |
| Gemini fails, times out or 429 | 502 with a friendly message; the turn shows a retry hint |

---

## 6. Verification & Test Plan
- [ ] Unit (shared): request parsing, sensitive topics, fact allowlists, payload, answer screening.
- [ ] Unit (app): target resolution, service, hook, thread, detail (signed in / out, voice).
- [ ] Live: the done signals above against the deployed function, as a signed-in client.
- [ ] `npm run lint`, `npm test`, `npm run typecheck`; advisors unchanged (no migration).

---

## 7. Amendment (2026-10-03): roles, security layer and spec-driven clarifications
Requested by the user after the first draft:
- **Roles**: the question may ask for a perspective (architect, investor, family), tone or format. The
  question travels apart from the DATA block (`buildAskPrompt`), so a role is honoured while listing data
  stays data. A role never changes the privacy or security rules. Answers up to ~8 sentences.
- **Security layer**: `threatCategory` blocks, before any model call, attempts to extract secrets or
  environment variables, extract the system prompt, override instructions (jailbreaks), inject SQL or
  inject code — on the question, the history and the clarifications (all client-controlled). The user
  gets a neutral reply and the attempt is recorded in `ai_security_events` (user, surface, category,
  time; never the text). RLS on, no grants: only the Edge Function (service role) writes it.
  `screenAnswer` also blocks secret-looking output. Note: the model never receives credentials and the
  question never becomes SQL, so this is defence in depth plus abuse visibility.
- **Spec-driven clarifications**: one structured call returns either `{type:'answer'}` or
  `{type:'clarify', question, options[2..4]}`, validated on the server. The app shows the options as
  buttons (or a typed reply). At most 2 rounds; then `must_answer` forces an answer with stated
  assumptions.

## 8. Deployment Notes (2026-10-03)
- Migration `ai_security_events` applied via MCP; Edge Function `property-ask` v1 (`verify_jwt: true`).
- Anonymous call → 401. The signed-in path was exercised by running the same modules, prompt, real data
  (Casa en alquiler en El Bosque, 7 comparables) and real Gemini locally: architect role honoured with
  listing-only facts; traffic answered as an estimate; "¿Me conviene?" → clarification with options, and
  after 2 clarifications a mandatory answer comparing real listings; owner phone → refused locally;
  instruction override and SQL injection → blocked locally.
- Not verified live: the HTTP path with a real user session and the security event insert (needs a
  signed-in user in the app).
- Tuning to do: comparison questions sometimes ask for a clarification although comparables suffice;
  one area remark was not labelled as an estimate.
- Local: typecheck clean, lint 0 errors, Jest 158 suites / 1444 tests.
- Requirement change: the detail's "send to the main chat" tests were rewritten to the approved behaviour
  (answered on the detail).

