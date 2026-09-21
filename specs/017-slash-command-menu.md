# RFC 017: Slash command menu in the main chat

- **Author**: Claude Code (from the approved scope brief, 2026-09-21)
- **Status**: Approved (2026-09-21) - implemented; exercised on the iOS simulator as an agent ("/" shows the row, tapping it starts the composer); client and signed-out note covered by tests only
- **Created**: 2026-09-21
- **Target Release / Milestone**: MVP 1.0 - extends RFC 012 (composer) and RFC 016 (start screen)

---

## 1. Problem Statement & Motivation
The only chat command, `/agregar-propiedad`, is invisible: users must already know it exists. Typing "/" should show what can be done, the way editors and chat tools do.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] Typing "/" as the first character of the main chat input opens a list of commands above the input.
- [ ] The list narrows as the user types; tapping a row runs that command immediately, as if it had been sent.
- [ ] Rows follow the user's role: today `/agregar-propiedad` only for users who can register properties.
- [ ] Signed-out users and clients see one short note instead of a list, so "/" never looks broken.

### Non-Goals (Out of Scope)
- Any other command, commands with arguments, `/ayuda`, `/cancelar`.
- Slash menus on other screens (the agency chat keeps its plain-phrase commands).
- Changes to how typed commands are interpreted or to the composer.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - discover**: **Given** an agent, **When** they type "/", **Then** a row "/agregar-propiedad - Publicar una propiedad"
  appears above the input, at least 48 points high.
- **Story 2 - narrow**: typing "/agr" keeps the row; "/zzz" or "/agregar-propiedad extra" closes the list (plain text).
- **Story 3 - run**: tapping the row sends the command through the normal send path: the composer starts, the input clears
  and the list closes. If a listing is already being composed, the existing "ya estamos creando una propiedad" reply shows.
- **Story 4 - no commands**: a signed-out user or a client typing "/" sees "Los comandos están disponibles para agentes de
  una inmobiliaria" and no row; while the session is still loading nothing shows.
- **Story 5 - close**: the list disappears when the text no longer starts with "/", and after a command runs.
- **Story 6 - unchanged**: typing the whole command and pressing send behaves exactly as before.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Pure resolver (tested first)
`src/lib/slashCommands.ts`:
```typescript
type SlashMenuState =
  | { kind: 'hidden' }
  | { kind: 'note' }
  | { kind: 'commands'; commands: SlashCommand[] };

resolveSlashMenu(text: string, capabilities: RoleCapabilities, status: AuthStatus): SlashMenuState;
```
- `hidden` unless `text` starts with `/` and the session is not `loading`.
- For users with no available command: `note`.
- Otherwise the commands whose text starts with the typed text (case-insensitive); none matching = `hidden`.
- `src/constants/slashCommands.ts` holds the registry `[{ key: 'register', command: REGISTER_COMMAND, capability:
  'canRegisterProperty' }]`; adding a command later means one entry plus its label. Copy lives in `labels.slashMenu`.

### 4.2 Component and wiring
- `src/components/SlashCommandMenu.tsx` (+ styles): presentational; props `{ state, onSelect(command) }`; rows are
  buttons with `accessibilityRole="button"` and a label "command, hint".
- `src/app/index.tsx`: `useMemo(resolveSlashMenu(inputText, capabilities, authStatus))`, rendered between the draft panel and
  the input bar; `onSelect` calls the existing `handleSend(command)` (which already checks permissions and clears the input).

### 4.3 Deploy
Client only. No migration, no Edge Function.

---

## 5. Security & Error Handling
- Visibility is convenience only: `handleSend` keeps enforcing who can register (RFC 011), so a stale or forged row grants
  nothing. No new input reaches a server; commands are constants.

| Failure Condition | Handling Strategy | Result |
| :--- | :--- | :--- |
| Role changes while the list is open | Recomputed from `useAuth` | Correct rows or note |
| Client taps nothing but sends "/agregar-propiedad" | Existing "solo los agentes" reply | Nothing starts |
| Keyboard open on a small phone | List sits between the chat and the input | Chat area shrinks, list stays reachable |

---

## 6. Verification & Test Plan (TDD, tests first)
- [ ] `src/lib/__tests__/slashCommands.test.ts`: hidden without "/", loading, agent list, prefix narrowing, case, no match,
      note for client and signed-out.
- [ ] `src/components/__tests__/SlashCommandMenu.test.tsx`: rows, note, tap reports the command, labels.
- [ ] `src/app/__tests__/index.slash.test.tsx`: agent types "/" and taps the row (composer starts), narrows, closes on plain
      text, client sees the note, full typed command still works.
- [ ] `scripts/verify.sh check-all`, jest excluding `.kilo/worktrees` three times, no comments in new code.
- [ ] Manual on the iOS simulator as an agent.
- [ ] Update the feature graph and the session log.

---

## 7. Open Questions
- Whether the menu should also help when a user types a command with an argument once such commands exist.

---

## 8. Implementation notes (2026-09-21)
- Built as designed: `resolveSlashMenu` (pure), `constants/slashCommands.ts` registry, `SlashCommandMenu`, `labels.slashMenu`, and one `useMemo` plus one component in `index.tsx`. Adding a command later is one registry entry plus one hint label.
- No deviations. Tests: resolver (9), component (4), home integration (6).

