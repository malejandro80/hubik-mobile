# RFC 014: Chat on every screen, starting with "Mi inmobiliaria"

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; not yet exercised on a device as an owner
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 011, 012 and 013

---

## 1. Problem Statement & Motivation
The chat only exists on the home screen. On "Mi inmobiliaria" the owner uses buttons and the menu, so the chat
is not the main way to use the app. The owner asked for the chat to be the main feature in every view. This
first slice puts a chat bar on "Mi inmobiliaria" that can operate that screen, on top of one conversation shared
with the home chat. Other screens, voice and free-form AI understanding follow in later slices.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] A typed chat bar pinned at the bottom of "Mi inmobiliaria" (no microphone yet).
- [ ] One shared conversation: messages sent on any screen appear in the same history and follow the user
      between screens (visible on the home chat).
- [ ] The owner can, by typing: add an agent by email, cancel a pending invite by email, ask how many agents and
      who they are (read only), and return to the main chat. Same rules and messages as the buttons.
- [ ] After a change the screen updates immediately and the reply appears in the conversation.
- [ ] An unrecognised message gets a short help reply and changes nothing.
- [ ] The existing email field, Agregar and Cancelar buttons keep working.

### Non-Goals (Out of Scope)
- Chat on property detail, sign-in, create agency; voice on the screen bars; removing agents; changes to home
  search or the listing composer; saving the conversation across app restarts; understanding free-form wording
  with AI; new server functions or migrations.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - add**: **Given** an owner on Mi inmobiliaria, **When** they type "agrega a ana@correo.com como agente",
  **Then** the same call as the Agregar button runs, the list updates, and the reply matches the button's message
  (added, invited, already listed, or the neutral "no se puede agregar").
- **Story 2 - cancel**: **When** they type "cancela la invitación de luis@correo.com" and that pending invite exists,
  **Then** it disappears from the list and the reply confirms it; if it does not exist the reply says so.
- **Story 3 - ask**: "¿cuántos agentes tengo?" or "¿quiénes son mis agentes?" is answered from the loaded list
  (agents and pending invites), read only; while the list is still loading the reply says so.
- **Story 4 - go home**: "vuelve al inicio" opens the home chat.
- **Story 5 - shared history**: what was typed and answered here is visible in the home chat, and vice versa.
- **Story 6 - not understood**: a message with no known command gets a help reply listing what can be said; no
  call is made.
- **Story 7 - privacy**: signing out clears the shared conversation; nothing is persisted.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Shared conversation
`src/hooks/ConversationProvider.tsx` (mounted in `_layout.tsx` inside `AuthProvider`) holds the chat messages and
`src/hooks/useConversation.ts` exposes:
```typescript
interface ConversationState {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  appendMessages: (...messages: ChatMessage[]) => void;
  reset: () => void;
}
```
- The home screen replaces its local `messages` state with this hook (its handlers keep working unchanged;
  `appendMessages` uses a functional update so two screens never overwrite each other).
- `useConversation` **works without a provider** (falls back to local state), like `useAuth` does, so existing screen
  tests and isolated renders keep working.
- The provider calls `reset()` when the auth status becomes `signedOut`, and "Reiniciar Chat" calls it too.
- Messages live in memory only.

### 4.2 Recognising commands (no AI, no cost)
`src/lib/agencyCommands.ts` (+ `src/constants/agencyCommands.ts` for phrase lists and patterns):
```typescript
type AgencyCommand =
  | { type: 'add_agent'; email: string }
  | { type: 'add_agent_missing_email' }
  | { type: 'cancel_invite'; email: string }
  | { type: 'count_team' }
  | { type: 'list_team' }
  | { type: 'go_home' };

parseAgencyCommand(text: string): AgencyCommand | null;
```
Pure and tolerant: lower-cases, strips accents and punctuation, extracts the first email with a strict pattern
(trailing punctuation removed), and matches Spanish verb and phrase families (agrega, añade, invita ... / cancela,
quita, elimina, borra ... / cuántos, quiénes ... / inicio, chat principal ...). Cancel phrases win over add phrases.
The email is then validated by the same `isValidInviteEmail` rule and again by the server.

### 4.3 Executing commands and replying
- `src/hooks/useScreenChat.ts`: generic hook `useScreenChat({ parse, execute, helpText })` owning the input text,
  a loading flag and the last reply; on send it appends the user message to the shared conversation, runs `parse`
  then `execute`, and appends the assistant reply. Each screen supplies its own `parse` and `execute`, which is the
  pattern later screens reuse.
- `src/hooks/useAgencyChat.ts`: wires the agency commands to `useAgencyAgents` (state lifted to the screen) and the
  router:
  - `add_agent` -> the same add call as the button; the reply text is the existing `auth.agents.feedback` or
    `errors` copy for the outcome (no new wording for outcomes);
  - `cancel_invite` -> finds the pending invite by email in the loaded list, then the same cancel call;
  - `count_team` and `list_team` -> read the loaded list; `go_home` -> `router.push('/')`.
- `src/hooks/useAgencyAgents.ts` is extended without breaking RFC 013's tests: `addByEmail` still returns the boolean
  and a new `addAgentByEmail` returns the feedback key; `cancelInvite` now returns whether it succeeded.
- `AgentsSection` receives the hook result as a prop (the screen owns it) so the buttons and the chat share one list.

### 4.4 UI
- `src/components/ScreenChatBar.tsx`: `ChatInputBar` plus a compact reply strip above it showing the last reply
  (up to 3 lines) and a "Ver conversación" action that opens the home chat. The strip is local to the screen visit;
  the full history is the shared conversation.
- `ChatInputBar`: when `onMicPress` is not provided, an empty field shows a disabled send arrow instead of a
  microphone (a mic that does nothing would be misleading).
- `agency.tsx`: wraps its list and the bar in `KeyboardAvoidingView` like the home screen.
- New `agencyChat` label namespace (help text, replies for the read-only questions, not-found, go home).

### 4.5 Deploy
Client only. No server change, no migration, no Edge Function.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- The chat is another client of the same server functions (`add_agent`, `cancel_agent_invite`), which check
  `auth.uid()` and the owner role themselves. The parser cannot grant anything the buttons could not.
- Typed text is parsed locally; the only extracted value is an email, validated client-side and again in the
  database. Nothing is sent to an AI vendor.
- Emails typed in the chat stay in this user's in-memory conversation and are cleared on sign-out.
- Reply text is fixed templates plus counts and display names rendered as plain text by the existing message
  renderer (which only understands simple emphasis markers).

### Accepted trade-offs
| Trade-off | Why it is accepted |
| :--- | :--- |
| A typed command runs immediately, like the button | Scope asked for the same rules as the buttons; adding an agent is a low-risk change the owner can see |
| Only fixed Spanish phrasing is recognised | Free-form understanding with AI is deferred; the help reply lists what works |
| Conversation is lost on app restart | Persistence is deferred |
| The shared list is unbounded | Fine for a session; a cap can be added if it grows |

### Failure Modes
| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Unrecognised text | Help reply, no call | Nothing changes |
| "Agrega un agente" with no email | Reply asking for the email with an example | Nothing changes |
| Malformed email | Same format message as the button | Nothing changes |
| Pending invite not found for that email | Reply says so | Nothing changes |
| Server or network error | Generic error reply, list untouched | Retry possible |
| List still loading | Reply says the team is loading | Nothing changes |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `src/lib/__tests__/agencyCommands.test.ts`: every command family, accents and punctuation, emails at the start,
      middle and end, cancel-versus-add precedence, missing email, unrelated text returns null.
- [ ] `src/hooks/__tests__/ConversationProvider.test.tsx`: shared between two consumers, `appendMessages` does not lose
      messages, `reset`, clears on sign-out, works without a provider.
- [ ] `src/hooks/__tests__/useScreenChat.test.ts`: user and assistant messages appended, help on null, loading state,
      execute errors become a reply.
- [ ] `src/hooks/__tests__/useAgencyChat.test.ts` and `useAgencyAgents.test.ts` additions: each command and outcome, the
      new return values, RFC 013 tests unchanged.
- [ ] `src/components/__tests__/ChatInputBar.test.tsx` additions (disabled send when no mic) and
      `ScreenChatBar.test.tsx`.
- [ ] `src/app/__tests__/agency.test.tsx` additions: add, cancel, ask, go home, help, buttons still work; a message sent
      here is visible on the home screen through the shared provider.
- [ ] Home tests stay green unchanged (fallback); one added test that "Reiniciar Chat" resets the shared conversation.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees`, no comments in new code, files under ~300 lines.
- [ ] Manual on the iOS simulator and an Android dev build, including the keyboard with the agents section, listings and bar.
- [ ] Update the feature graph, RFC 013 (chat as a second client of the same functions) and the session log.

---

## 7. Open Questions / Later Slices
- Recognising free-form wording with the existing Gemini extraction (cost and quota) instead of fixed phrases.
- Chat on property detail (it already has a quick-question bar), sign-in and create agency; voice; persistence.
- Commands to remove agents once RFC 013's removal slice exists.

---

## 8. Implementation notes (2026-09-21)
- Built as designed: `ConversationProvider` + `useConversation` (works without a provider, clears on sign-out), the pure `parseAgencyCommand`, the generic `useScreenChat`, `useAgencyChat`, `ScreenChatBar`, and `agency.tsx` rewired so the buttons and the chat share one team list (`AgentsSection` now receives it as a prop; its 13 tests only gained a small wrapper).
- `useAgencyAgents` returns `addAgentByEmail` (the feedback key) alongside `addByEmail` (boolean), `cancelInvite` returns success, and it accepts a `null` agency id (no query until the profile is known). RFC 013's tests are unchanged.
- `ChatInputBar` shows a disabled send arrow when no microphone handler is given.
- **Found while checking on the simulator (fixed, with tests)**: the home chat did not scroll to new messages during the listing composer, so an agent saw their own bubble and no reply; and message times were the English "Just now" (now "Ahora"). The home screen now scrolls to the newest message whenever the conversation grows.
- **Separate bug fixed the same day**: the menu button did nothing on "Mi inmobiliaria" and the property screen had a stale copy of the menu; all three screens now use `useAppMenu`.
- **Tooling note**: Metro started with `CI=1` does not watch files, so it serves stale code; run it without `CI=1`.
- **Verified live**: RFC 012's composer on the iOS simulator as the `houseapp` agent (panel, live fill, cadastral not asked while other fields are missing, on the deployed `property-intake` v19). The owner-only chat on "Mi inmobiliaria" is covered by tests but still needs a device run signed in as the owner.

---

## 9. Amendment (2026-09-21, RFC 016)
The shared conversation now starts empty instead of with a welcome message; an empty conversation renders the home start screen. See `specs/016-start-screen-quick-actions.md`.

