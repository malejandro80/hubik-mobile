# RFC 028: One Input Bar Across the App

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
The user requires the input bar to be identical across the whole project. Today the same
`ChatInputBar` component is configured three different ways:

| | Home chat | Property detail | Agency (`ScreenChatBar`) |
|---|---|---|---|
| Layout | standard | wrapped in a padded dock → narrower, inset | standard + top border |
| Placeholder | "Escriba su consulta aquí..." | same | "Escriba aquí lo que necesita..." |
| Microphone | records a voice note | fake alert | none |
| Send | answered by the assistant | fake "Consulta enviada" alert; goes nowhere | agency commands |

Decisions by the user (2026-09-23): same look **and** working voice on every screen; the
property-detail question goes to the main chat.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] `ChatInputBar` owns its whole look: no per-screen placeholder, accessibility label, border
      or container style props; one placeholder everywhere.
- [x] The microphone is mandatory (`onMicPress` required) and records a real voice note on every
      screen.
- [x] Property detail: the bar sits full-width like in the chat (the dock no longer pads it);
      sending (typed or spoken) opens the main chat and asks the question there, with the
      property title as context.
- [x] Agency screen: a spoken note is transcribed and handled like typed text (agency commands).
- [x] New transcribe-only mode in `chat-query` (`transcribe_only: true`) for screens that need
      the text of a voice note, not a search.

### Non-Goals (Out of Scope)
- Changing how the home chat processes voice (search/registration audio paths stay).
- An answer about the property inside the detail screen itself.
- Visual redesign of the bar.

---

## 3. User Stories & Acceptance Criteria
- **Given** any screen with a bar, **then** it has the same width, spacing, placeholder and mic.
- **Given** a property detail, **when** the user types or says "¿Tiene garaje?", **then** the
  main chat opens and sends "¿Tiene garaje? (sobre «<title>»)" once.
- **Given** the agency screen, **when** the user says "agrega a ana@correo.com", **then** it is
  handled exactly like the typed command.
- **Given** a transcription failure, **then** an alert explains it and nothing is sent.

---

## 4. Proposed Architecture & Public Contracts
```typescript
// src/components/ChatInputBar.tsx
export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
  onMicPress: () => void;          // now required
  isRecording?: boolean;
  loading?: boolean;
}

// src/services/chatApi.ts
export function transcribeVoiceNote(audio: AudioPayload): Promise<string>;

// src/hooks/useVoiceNote.ts
export function useVoiceNote(onTranscript: (text: string) => void): {
  onMicPress: () => Promise<void>; isRecording: boolean; busy: boolean;
};

// src/hooks/useChatRouteParams.ts (home)
export function useChatRouteParams(
  params: { startRegistration?: string; ask?: string; askAt?: string },
  send: (text: string) => void
): void;
```
- Detail → `router.navigate({ pathname: '/', params: { ask, askAt } })`; `askAt` is a timestamp
  so the same question can be asked twice; the home screen sends each `askAt` once. `ask` is
  trimmed and capped (`MAX_ASK_LENGTH`).
- `chat-query`: when `transcribe_only === true` and the body has audio, return `{ transcript }`
  right after Groq transcription (no search, no LLM).

---

## 5. Security & Error Handling
- `ask` arrives as a route param (also reachable by deep link): it is only ever sent as the
  user's own chat message; it is trimmed, length-capped, and ignored when not a string.
- Transcription uses the existing audio transport (timeout + one retry).

| Failure | Handling |
| :--- | :--- |
| Mic permission denied | Existing "Micrófono no disponible" alert |
| Transcription fails / empty | Alert "No pudimos entender la nota de voz"; nothing sent |

---

## 6. Verification & Test Plan
- [x] `ChatInputBar`: standard placeholder without props; mic always present.
- [x] `useVoiceNote`: start/stop, transcribes and calls back; error alert; permission alert.
- [x] `transcribeVoiceNote`: calls `chat-query` with `transcribe_only`.
- [x] `useChatRouteParams`: sends `ask` once per `askAt`; ignores empty/oversized; keeps
      `startRegistration`.
- [x] Detail: typed and spoken questions navigate to the chat; no fake alerts.
- [x] Agency/`ScreenChatBar`: standard placeholder, mic sends the transcript as a command.
- [x] Simulator: bar pixel-aligned on home and detail.
- [x] `chat-query` transcribe-only verified live with a synthesized voice note.
- [x] `npm run lint`, `npm test`, `npm run typecheck`.

---

## 7. Deployment Notes (2026-09-23)
- `chat-query` v22 deployed via MCP (`verify_jwt: true`) with `transcribe_only`; verified live
  with a synthesized voice note (returns only `{ transcript }`); search eval still 15/15.
- Simulator: the bar on home and property detail is pixel-aligned (capsule x 38-743, button
  763-886 in both; detail was 76-848 before). A question typed in the detail opened the chat and
  was sent as "<question> (sobre «<title>»)".
- Tests rewritten because the requirement changed: the detail's fake mic/"Consulta enviada"
  alerts, `ChatInputBar` "without a microphone", `ScreenChatBar`/agency "without a microphone"
  and the agency-only placeholder.

