# RFC 005: Voice Notes for Chat & Property Registration

- **Author**: AI Agent (Claude Code)
- **Status**: Approved (transcription vendor superseded, see note below)
- **Created**: 2026-09-16
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

> **Superseded (2026-09-18, RFC 009)**: every "Gemini transcribes the audio" statement below is
> now inaccurate - transcription moved to Groq's Whisper API (`_shared/groqAudio.ts`,
> `_shared/geminiAudio.ts` deleted) after hitting a real Gemini free-tier quota ceiling and a
> `gemini-2.5-flash-lite` audio-input 404 in production. The recording UI, 60s cap, mic-toggle
> UX, transient-audio handling, and error-message principles documented here are all still
> accurate and unchanged - only *which vendor* transcribes the audio changed. See RFC 009 for the
> current architecture.

---

## 1. Problem Statement & Motivation
The previous voice input attempt (`useVoiceWizardMachine`, `PushToTalkButton`) was a standalone, hardcoded 3-step wizard that never wrote to Supabase and was removed in RFC 004 in favor of a single free-text chat flow. That fixed the architecture but dropped voice entirely — today `ChatInputBar` is text-only. For the target user (e.g. Don Carlos), typing a full property description or a search query is more friction than speaking it. This RFC adds voice notes as an additional input modality on top of the existing text chat and property-registration flow from RFC 004, without reintroducing a disconnected voice subsystem and without building a real-time voice-agent (continuous call) architecture, which this project does not need yet.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] `ChatInputBar` gains a mic button (≥44×44pt) next to the text field; tapping starts a recording, tapping again stops and sends it — no press-and-hold, since sustained-hold is worse ergonomics for the target senior user than a simple toggle.
- [x] Recording is capped at 60s (`MAX_RECORDING_MS`); reaching the cap auto-stops and sends rather than rejecting the note.
- [x] Voice notes work in both existing text-driven flows unchanged: normal search chat (`sendChatQuery`) and property registration (`processMessage` / `property-intake`) — same downstream logic, new input path only.
- [x] The recorded audio is sent directly to Gemini (already integrated via `@google/genai` in `chat-query` and `property-intake`) for native transcription + understanding in one call — no separate STT service, no on-device speech-recognition library.
- [x] The response includes a `transcript` field; the client renders it as the user's chat bubble (same as if they had typed it), so the user can see what was understood and correct it by typing or re-recording — reusing RFC 004's existing correction loop.
- [x] `app.json` gains the microphone permission config (`NSMicrophoneUsageDescription` / `RECORD_AUDIO`) required by `expo-av`, requested at first mic tap, not at app startup.

### Non-Goals (Out of Scope)
- Real-time / full-duplex voice agents (OpenAI Realtime API, Gemini Live API, ElevenLabs Conversational AI, Vapi, etc.). Voice notes are async record-then-send, not a continuous call — that architecture is unjustified complexity for this use case.
- Text-to-speech playback of assistant replies (`expo-speech` or otherwise). Candidate for a follow-up RFC once voice *input* is validated with real usage.
- On-device speech recognition (`expo-speech-recognition`, `@react-native-voice/voice`). Gemini's native audio understanding already covers this server-side with better accuracy across accents/noise, and avoids a New-Architecture-compatibility risk in a project still on the old architecture (SDK 51 / RN 0.74).
- Persisting raw audio recordings (Supabase Storage or otherwise). The audio is transient: sent inline to the Edge Function, forwarded to Gemini, discarded after the response. Only the transcript (text) is kept, same as a typed message.
- Multi-language detection/handling logic of our own — Gemini already handles this natively; we don't build language switching.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Voice note in search chat)**:
  - **Given** the user is on the main chat in normal search mode
  - **When** they tap the mic, say "Quiero un piso en Chamberí de 3 habitaciones", and tap again to stop
  - **Then** a user bubble appears showing the transcript, followed by the same property-search response `sendChatQuery` would have produced for that text.

- **Story 2 (Voice note during property registration)**:
  - **Given** the user is mid-flow in `/agregar-propiedad` (`mode === 'collecting'`)
  - **When** they record "Vendo mi casa en Sevilla de 90 metros, 3 habitaciones y 2 baños"
  - **Then** `property-intake` extracts the same fields it would from typed text, the transcript is shown as the user's message, and any still-missing fields are asked for as usual.

- **Story 3 (Mic permission denied)**:
  - **Given** the user taps the mic for the first time and denies the OS permission prompt
  - **Then** an alert explains mic access is needed, the mic button stays available to retry, the text input keeps working normally, and no crash or silent failure occurs.

- **Story 4 (Max duration reached)**:
  - **Given** the user is recording and hits the 60s cap
  - **Then** recording auto-stops and the note is sent as-is (not discarded, not rejected).

- **Story 5 (Transcription/Edge Function failure)**:
  - **Given** the audio was recorded successfully but `chat-query` / `property-intake` fails or Gemini is unreachable
  - **Then** the assistant shows a clear error message ("No pude procesar la nota de voz, intenta grabar de nuevo o escribir tu mensaje") and no chat/draft state is mutated — unlike the text path, there is no local heuristic fallback for audio, since there is nothing to regex-match without a transcript.

---

## 4. Proposed Architecture & Public Contracts

### Client

```typescript
// src/hooks/useVoiceRecorder.ts
export interface VoiceRecorderState {
  status: 'idle' | 'recording' | 'processing';
  durationMs: number;
}

export function useVoiceRecorder(): {
  state: VoiceRecorderState;
  start(): Promise<void>;   // requests mic permission on first call
  stop(): Promise<{ uri: string; durationMs: number } | null>; // null if cancelled/errored
  cancel(): void;
};
```

`useVoiceRecorder` wraps `expo-av`'s `Audio.Recording`, auto-stops at `MAX_RECORDING_MS = 60_000`, and is the only place that talks to the recording API.

```typescript
// src/components/ChatInputBar.tsx (extended)
export interface ChatInputBarProps {
  // ...existing props unchanged
  onSendAudio: (uri: string, durationMs: number) => void;
}
```

```typescript
// src/services/chatApi.ts (additions)
export async function sendChatQueryAudio(base64Audio: string, mimeType: string): Promise<ChatResponse & { transcript: string }>;
export async function intakePropertyAudio(base64Audio: string, mimeType: string, known: PropertyDraft): Promise<PropertyIntakeResponse & { transcript: string }>;
```

Both encode the local recording via `expo-file-system`'s `readAsStringAsync(uri, { encoding: 'base64' })` and invoke the *same* Edge Functions as their text counterparts (`chat-query`, `property-intake`) with `{ audio: { data, mimeType } }` instead of `{ message }`.

`src/app/index.tsx`: `handleSend`'s existing branch (`mode !== 'idle'` → registration, else → search) is mirrored by a new `handleSendAudio(uri)` that calls `registration.processAudioMessage` (a new method on `usePropertyRegistrationChat`, mirroring `processMessage` so the hook's draft/mode state stays the single source of truth) or `sendChatQueryAudio` on the same condition, then renders `transcript` as the user bubble before rendering the assistant's reply — reusing every downstream code path RFC 004 already built.

### Edge Functions (`chat-query`, `property-intake`)

Both gain an alternate request shape:
```json
// Text (existing)
{ "message": "..." }
// Audio (new)
{ "audio": { "data": "<base64>", "mimeType": "audio/m4a" }, "known": { } }
```
When `audio` is present, the function builds a Gemini request with an inline audio part (`inlineData: { data, mimeType }`) plus the same system prompt used for text, asking the model to (a) transcribe the note and (b) produce the same structured output (`answer`/`data` for `chat-query`, extracted `PropertyDraft` fields for `property-intake`). The response gains one field: `transcript: string`, used by the client to render the user's bubble. No new Gemini model or API surface — same `@google/genai` client already used for text.

### Data Model
No changes to `PropertyDraft`, `Property`, or the database schema. This RFC is purely an additional input path into the existing pipelines from RFC 004.

### Config
`app.json` needs the `expo-av` permissions plugin block (iOS `NSMicrophoneUsageDescription`, Android `RECORD_AUDIO`), which is currently absent from the project.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- Gemini's `transcript` output is treated as untrusted user input, identically to a typed message — it flows through the exact same extraction/validation logic in `property-intake` (server-side revalidation in `property-publish` is unchanged and still the enforcement point, per RFC 004).
- Recording duration is capped client-side (`MAX_RECORDING_MS`) to bound the base64 payload size sent to the Edge Function, comfortably under Supabase's Edge Function request-size limit.
- No secrets or PII are logged from the audio path; only the resulting transcript (already user-supplied text-equivalent) may appear in logs, same as today's text messages.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Mic permission denied | Show an alert explaining mic access is needed, mic button stays enabled for retry, text input unaffected | n/a (client-side) |
| Recording interrupted/errored | Discard silently, no message sent, no state mutation | n/a (client-side) |
| Recording hits `MAX_RECORDING_MS` | Auto-stop and send as-is | n/a (client-side) |
| Gemini/Edge Function unreachable for audio | Surface clear error message, keep chat/draft state intact for retry (no heuristic fallback exists for audio) | 200 degraded / surfaced error |
| Gemini returns empty/unintelligible transcript | Show "No entendí la nota de voz, ¿puedes intentar de nuevo?" and do not treat as a valid message | 200 (degraded) |

---

## 6. Verification & Test Plan
- [x] Unit Test: `useVoiceRecorder` state machine — idle → recording → stopped, cancel from recording, auto-stop at `MAX_RECORDING_MS`.
- [x] Unit Test: `chatApi.sendChatQueryAudio` / `intakePropertyAudio` — correct request shape, error propagation (mocking `supabase.functions.invoke`), no client-side fallback attempted for audio.
- [x] Unit Test: `usePropertyRegistrationChat.processAudioMessage` — merges the transcribed draft into state and returns the transcript, mirroring `processMessage`.
- [ ] Unit Test (Deno): `chat-query` / `property-intake` branch correctly on `audio` vs `message` in the request body and construct the expected Gemini payload. **Not done** — this repo has no Deno test runner and none of the three existing Edge Functions (`chat-query`, `property-intake`, `property-publish`) have tests; adding a Deno test harness was out of scope for this RFC. The shared helper (`supabase/functions/_shared/geminiAudio.ts`) keeps the untested surface small and identical between both functions.
- [x] Integration Test: `ChatInputBar` renders the mic/stop button with `accessibilityRole`/`accessibilityLabel`/`accessibilityState`, meets the 44×44pt touch target, disables typing while recording, and toggles on tap.
- [x] Integration Test: `index.tsx` — recording and sending a voice note in search mode renders the transcript bubble then the search response; permission-denied surfaces an alert and sends nothing.
- [x] Regression: `npm run typecheck`, `npm run lint`, `npm test` all green (159/159 passing); existing text-only chat and registration flows (RFC 004) unaffected, since the mic is additive to `ChatInputBar`, not a replacement.
