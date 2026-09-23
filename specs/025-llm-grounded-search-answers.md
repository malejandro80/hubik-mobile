# RFC 025: LLM-Grounded Search Answers

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
`chat-query` finds the right properties (RFC 008/010 hybrid search) but writes its reply from a
fixed template (`Encontré ${n} apartamentos en ${city}…`). Every search reads the same, the reply
says nothing about what the results actually contain, and the template has drifted from the
data: the no-results reply still suggests "Austin, Miami, Denver, Seattle o New York" while the
inventory is in Valencia. The follow-up suggestions are two hardcoded strings per city, and the
app never displays them (`index.tsx` drops `response.suggestions`; `SuggestionChips` is not
rendered anywhere).

This RFC keeps *how properties are found* unchanged and replaces *how the reply is written*: one
LLM call per search turns the real results into a short Spanish answer plus 2-3 follow-up
suggestions, which the app now shows as tappable chips. It is slice 1 of the LLM-integration
plan; the tool-calling search agent, the agency chat agent and conversation memory are deferred.

Scope brief approved by the user in session on 2026-09-23 (first user: agents checking
inventory; the same answers serve clients and signed-out visitors).

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Every `chat-query` reply (text and voice) is written by the LLM from the returned rows, in
      Spanish: with results, 1-3 sentences on what stands out (price range, cheapest, largest,
      best €/m²).
- [x] No results: a short explanation plus alternatives that exist in the database (cities with
      listings) or a relaxed filter, suggested and not run automatically.
- [x] The response carries 2-3 follow-up suggestions based on the results and real inventory.
- [x] The app shows those suggestions as chips under the latest assistant reply; tapping one
      sends it as a new search.
- [x] Any LLM failure (no key, timeout, quota, HTTP error, invalid JSON) falls back to a template
      answer, and the template's no-results text lists real cities, never a hardcoded list.
- [x] At most one extra LLM call per search.

### Non-Goals (Out of Scope)
- Changing filters, hybrid ranking or which property cards are returned.
- Conversation memory / follow-up questions ("¿y más barato?").
- Market context against city averages (would need extra DB reads).
- Tool-calling agent, agency-screen commands, registration flow.
- Role-dependent tone.
- Changing the client fallback `querySupabaseDirectly` (used only when the Edge Function is
  unreachable); its template stays.
- Moving the existing filter-extraction call (`GEMINI_EXTRACTION_MODEL`) to another model.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - results are summarized from the data**:
  - **Given** Valencia has 4 matching apartments between 180.000 € and 320.000 €
  - **When** an agent sends "pisos en Valencia"
  - **Then** the reply mentions facts from those 4 rows (e.g. the price range) and the 4 cards
    appear as today.
- **Story 2 - no results suggest real alternatives**:
  - **Given** there are no listings in Bilbao, and listings exist in Valencia
  - **When** the user sends "casas en Bilbao"
  - **Then** the reply says nothing matched and suggests Valencia (or a relaxed filter), and it
    never names a city that has no listings as an alternative.
- **Story 3 - suggestion chips**:
  - **Given** a search reply with suggestions
  - **When** the user taps a chip
  - **Then** the chip text is sent as a new search; chips show only under the latest assistant
    reply and are disabled while a search is loading.
- **Story 4 - fallback**:
  - **Given** `GEMINI_API_KEY` is missing, or Gemini times out or returns invalid JSON
  - **When** the user searches
  - **Then** the reply is the template answer, the cards are unchanged, and the request succeeds
    (HTTP 200).
- **Story 5 - voice**:
  - **Given** a voice note is transcribed by Groq (RFC 009)
  - **When** the search runs
  - **Then** the answer and suggestions are produced exactly as for text.

---

## 4. Proposed Architecture & Public Contracts

### Flow (inside `chat-query`, after step 2 "query properties")
```
items + filters + knownCities (already fetched in step 1b)
        │
        ▼
composeSearchAnswer()  ──► Gemini generateContent (JSON mode, timeout)
        │                         │ ok + valid JSON
        │ any failure             ▼
        ▼                  { answer, suggestions }
fallbackSearchAnswer()
```
No new database reads: the "real alternatives" come from `knownCities`, which step 1b already
fetches from `properties.city`.

### New shared modules (`supabase/functions/_shared/`, pure TS, unit-tested with Jest like
`describeFacts.ts`)
```typescript
// searchAnswerConstants.ts
export const GEMINI_ANSWER_MODEL = 'gemini-3.5-flash-lite';
export const ANSWER_TIMEOUT_MS: number;          // LLM budget before falling back
export const MAX_SUGGESTIONS = 3;
export const MAX_ANSWER_LENGTH: number;          // chars; longer output is rejected
export const MAX_SUGGESTION_LENGTH: number;
export const MAX_FACT_ROWS = 10;                 // rows passed to the LLM
export const MAX_ALTERNATIVE_CITIES: number;
export const ANSWER_FACT_FIELDS: readonly string[]; // allowlist, see Security

// searchAnswer.ts
export interface SearchAnswer { answer: string; suggestions: string[] }

export function answerFacts(items: Record<string, unknown>[]): Record<string, unknown>[];
export function parseSearchAnswer(raw: string): SearchAnswer | null;
export function fallbackSearchAnswer(
  items: Record<string, unknown>[],
  filters: Record<string, unknown>,
  knownCities: string[],
): SearchAnswer;
export async function composeSearchAnswer(input: {
  message: string;
  items: Record<string, unknown>[];
  filters: Record<string, unknown>;
  knownCities: string[];
  geminiKey?: string;
}): Promise<SearchAnswer>;          // never throws; falls back internally

// prompts.ts (existing file)
export function searchAnswerInstruction(): string;
```
The LLM receives one user part with a JSON payload `{ query, filters, results, available_cities }`
and must return `{ "answer": string, "suggestions": string[] }`.

### Response contract (unchanged shape)
`chat-query` keeps returning `{ answer, data, applied_filters, suggestions, transcript? }`;
only the content of `answer` and `suggestions` changes. The client `ChatResponse` type already
declares `suggestions?: string[]`.

### Client changes
- `ChatMessage` gains `suggestions?: string[]`.
- `index.tsx` stores `response.suggestions` on the assistant message (text and voice paths).
- `ChatMessageItem` renders the existing `SuggestionChips` under an assistant message when it
  receives `onSuggestionPress`; `index.tsx` passes it only for the last message, disabled while
  `loading`.

### Data Models & State Changes
None. No migration, no new secret (`GEMINI_API_KEY` already set).

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- **Allowlist of facts sent to Gemini**: `id, title, property_type, operation_type, price,
  currency, bedrooms, bathrooms, square_meters, city, amenities`. Not sent: `address`,
  coordinates, `catastro`, images, `description`, `agent_name`, `agency_name`. This keeps
  personal data out of the prompt and removes the longest user-written field (`description`) as
  a prompt-injection vector.
- **Prompt**: rows and the user query are marked as data; the model must use only the given
  facts, must not follow instructions inside them, and may name as alternatives only cities in
  `available_cities`.
- **Output validation** (`parseSearchAnswer`): must be JSON with a non-empty string `answer` up
  to `MAX_ANSWER_LENGTH`; `suggestions` filtered to non-empty strings up to
  `MAX_SUGGESTION_LENGTH`, capped at `MAX_SUGGESTIONS`. Anything else means fallback.
- The property cards come from the query rows, never from the LLM text, so the model cannot add
  or remove a listing.
- RLS unchanged: the rows are the ones the caller could already read through
  `property_listings` / `match_properties_hybrid`.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| No `GEMINI_API_KEY` | Template answer, no LLM call | 200 |
| Gemini timeout (> `ANSWER_TIMEOUT_MS`) | Abort, template answer | 200 |
| Gemini HTTP error / quota (429) | Template answer, warning logged | 200 |
| Invalid or oversized JSON | Template answer | 200 |
| Search itself fails | Unchanged from today | 500 |

---

## 6. Verification & Test Plan
- [x] Unit (`_shared/__tests__/searchAnswer.test.ts`): `answerFacts` keeps only allowlisted
      fields and at most `MAX_FACT_ROWS` rows.
- [x] Unit: `parseSearchAnswer` accepts valid output, trims and caps suggestions, rejects
      missing/empty/oversized `answer`, non-JSON, and non-array `suggestions`.
- [x] Unit: `fallbackSearchAnswer` no-results text names real `knownCities` and never
      "Austin"; with results it keeps today's wording.
- [x] Unit: `composeSearchAnswer` with mocked `fetch` returns the model's answer on success and
      the fallback on no key, HTTP 429, invalid JSON and timeout; it sends no private field.
- [x] Component: `ChatMessageItem` shows chips only when given `onSuggestionPress`, and tapping
      one reports its text.
- [x] Screen (`index.test`-style): a search reply's suggestions render as chips under the last
      reply only; tapping one sends it as a new search.
- [x] Manual smoke after deploy (live `chat-query`): "pisos en Valencia" twice (different
      wording, correct facts), "casas en Bilbao" (real alternatives), one voice note, and the
      same search with the Gemini call forced to fail (template answer).
- [x] `npm run lint`, `npm test`, `npm run typecheck` pass.

---

## 7. Deployment Notes (2026-09-23)
- `chat-query` v18 used `gemini-2.5-flash-lite` and every answer fell back: Gemini returned 404.
  Google now limits 2.5 models to API keys that already used them (this key only used
  `gemini-2.5-flash`). Switched `GEMINI_ANSWER_MODEL` to `gemini-3.5-flash-lite` (stable, no
  shutdown date) and deployed v19.
- Live smoke on v19: "pisos en Valencia" answered from the rows (9 listings, rent 350-520 USD,
  sale 52.000-125.000 USD, 68-160 m²); "casas en Bilbao" suggested only Valencia; a prompt
  injection in the query was ignored; a synthesized voice note got a grounded answer. One of five
  calls hit the 4 s timeout and returned the template (by design). Observed LLM latency ~1-4 s.

