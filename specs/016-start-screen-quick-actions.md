# RFC 016: Start screen with quick actions (replaces the welcome bubble)

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; exercised on the iOS simulator as an agent (cards, live search, composer start, reset); signed-out and owner variants covered by tests only
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 011 (roles), RFC 012 (composer) and RFC 014 (shared conversation)

---

## 1. Problem Statement & Motivation
The home chat opens with a hardcoded bubble ("Buenos días, Don Carlos.", fixed "10:30") that gives the user nothing to tap. New users do not know what the app can do. The owner asked for a VS Code style start page: quick actions and example phrases instead of a welcome message.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] When the conversation has no messages, the home chat shows a **start screen** instead of the welcome bubble:
      a short greeting with the user's display name, an **Empezar** group of large role-aware cards, a **Pruebe a decir…**
      group of fixed example searches, and one line about the microphone.
- [ ] Tapping a card or an example runs it immediately, exactly as if the user had sent it.
- [ ] The start screen disappears with the first message and comes back on **Reiniciar Chat** and on sign-out.

### Non-Goals (Out of Scope)
- Examples drawn from live listings (the unused `fetchDynamicSuggestions` stays untouched).
- Recent searches, favorites, tips carousel, "do not show again".
- Start screens on other screens; changes to the menu, composer or search behavior.
- Persisting anything across app restarts; any network call or AI cost.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - roles**: **Given** the app opens, **Then** the cards follow the menu's rules: signed out = Buscar propiedades +
  Iniciar sesión; client = Buscar propiedades; agent = Buscar propiedades + Publicar una propiedad; owner = the agent set +
  Mi inmobiliaria. A signed-out user never sees Publicar or Mi inmobiliaria.
- **Story 2 - greeting**: signed in with a display name = "Hola, {name}"; signed out or no name = "Bienvenido a Hubik".
- **Story 3 - search**: tapping **Buscar propiedades** or an example sends that text as a normal search; the cards give way
  to the chat with the user's bubble and the answer.
- **Story 4 - publish**: an agent tapping **Publicar una propiedad** starts the listing composer (same as the menu item).
- **Story 5 - navigation cards**: **Mi inmobiliaria** opens `/agency`; **Iniciar sesión** opens `/sign-in`.
- **Story 6 - return**: **Reiniciar Chat** and signing out show the start screen again.
- **Story 7 - voice hint**: the line "Toque el micrófono para hablar" is visible under the cards.
- **Story 8 - accessibility**: every card is at least 56 points high, has `accessibilityRole="button"` and a label, and is
  readable in light and dark mode.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 The empty conversation is the start screen
The conversation now starts as `[]` (was one welcome message). `ConversationProvider`, `useConversation` (fallback) and
`reset()` all use `[]`; the sign-out clearing is unchanged. `buildInitialMessages`, `INITIAL_MESSAGES` and the
`welcomeTitle`/`welcomeMessage`/`welcomeTimestamp` labels are deleted (no dead code). The home `FlatList` renders
`<StartScreen />` as `ListEmptyComponent`, and the fake "Hoy, 10:30" date capsule only shows once there are messages.
Because RFC 014 shares the conversation, a message sent from another screen also ends the start screen.

### 4.2 Which cards (pure, tested first)
`src/lib/startActions.ts`:
```typescript
type StartActionKey = 'search' | 'sign_in' | 'register' | 'my_agency';
getStartActions(capabilities: RoleCapabilities, status: AuthStatus): StartActionKey[];
```
Ordered as `search`, `sign_in` (signed out), `register` (`canRegisterProperty`), `my_agency` (`canViewAgencyListings`),
mirroring `getMenuItems`. Copy (title and one-line subtitle per key, greeting, group titles, mic line) lives in
`labels.startScreen`; `src/constants/startScreen.ts` holds the fixed example list and the query sent by "Buscar propiedades".

### 4.3 Component and wiring
- `src/components/StartScreen.tsx` (+ `StartScreen.styles.ts`): props `{ name: string | null; actions: StartActionKey[];
  examples: string[]; onAction(key); onExample(text) }`. Presentational only.
- `src/hooks/useStartScreen.ts` (keeps `index.tsx` from growing): given `handleSend`, returns the props above, mapping
  `search`, `register` and every example to `handleSend(...)` (`register` sends `REGISTER_COMMAND`, so the existing
  permission checks and composer start apply unchanged) and `sign_in` / `my_agency` to `router.push`.
- **Search card**: a search needs words, so it sends a fixed friendly query (`Muéstrame las propiedades disponibles`),
  documented in `constants/startScreen.ts`.

### 4.4 Deploy
Client only. No migration, no Edge Function.

---

## 5. Security & Error Handling
- No new input: cards send constant strings through the same path as typed text; navigation cards use fixed routes.
- Role visibility is convenience, not access control: `handleSend` and the server keep enforcing who can register or
  view an agency (RFC 011), so a stale card cannot grant anything.
- The display name is rendered as plain text.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Role changes while the start screen is open | Cards recompute from `useAuth` | Correct cards |
| Agent capability lost, then taps Publicar | `handleSend` replies with the existing permission message | Nothing starts |
| Search service fails | Existing chat error reply | User sees the chat with the error |
| Long display name | Greeting wraps up to two lines | No overflow |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `src/lib/__tests__/startActions.test.ts`: every role and signed-out combination, order.
- [ ] `src/components/__tests__/StartScreen.test.tsx`: greeting with and without a name, cards and examples render,
      each calls its handler, labels and roles, mic line.
- [ ] `src/hooks/__tests__/useStartScreen.test.tsx`: each action's effect (send, composer command, route).
- [ ] `ConversationProvider` tests: starts empty, `reset` and sign-out return to empty (rewritten from `welcome-1`).
- [ ] `index.test.tsx`: start screen shows on open (rewritten from the welcome tests), tapping a card or example sends
      it and hides the cards, reset brings them back, agents see Publicar, signed-out users do not.
- [ ] `chatRegistration.test.ts`: `buildInitialMessages` tests removed with the function.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] Manual on the iOS simulator as an agent and signed out.
- [ ] Update the feature graph, RFC 014 (initial state) and the session log.

**Requirement change**: the tests that pin the welcome text ("Buenos días, Don Carlos.", "botón verde del micrófono",
`welcome-1`) describe a requirement this RFC replaces; they are rewritten, and the commit message must say so.

---

## 7. Open Questions
- Whether "Buscar propiedades" should later ask a follow-up ("¿En qué ciudad?") instead of listing everything.
- Live or personalised examples (deferred).

---

## 8. Implementation notes & deviations (2026-09-21)
- Built as designed: `getStartActions`, `StartScreen`, `useStartScreen`, `labels.startScreen`, `constants/startScreen.ts`; the conversation starts as `[]` and the home `FlatList` renders the start screen as `ListEmptyComponent`. `buildInitialMessages`, `INITIAL_MESSAGES` and the three welcome labels were deleted.
- **Card accessibility labels** are "title. hint" (better for screen readers) so they do not collide with the menu items, whose label is the bare title; the old menu tests now query the menu by label.
- **Found on the simulator (fixed, with a test)**: after "Reiniciar Chat" the start screen came back scrolled down with the greeting cut off, because the "scroll to newest message" effect also ran when the list became empty. It now runs only when there are messages.
- **Requirement change (say so in the commit message)**: tests that pinned the welcome ("Buenos días, Don Carlos.", "botón verde del micrófono", the `welcome-1` message, `buildInitialMessages`) were rewritten or removed, and `useScreenChat` / shared-conversation counts lost the initial message. No assertion was weakened.
- **Known limit**: on a small phone (iPhone 16e) the microphone line sits just below the fold; the list scrolls.

