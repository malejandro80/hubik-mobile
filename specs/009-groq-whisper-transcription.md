# RFC 009: Groq/Whisper for Audio Transcription

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-18
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Voice-note transcription has been on Gemini since RFC 005, and stayed there through RFC 008's
cascade work. Sessions 040-041 surfaced two real problems specific to that choice: (1)
`gemini-2.5-flash-lite` 404s on audio `inlineData` requests despite Google's docs listing audio as
supported, forcing transcription back onto `gemini-2.5-flash`; (2) that model's free-tier quota is
only **20 requests/day per project**, shared with `property-describe`'s generation calls - trivial
to exhaust with any real usage, let alone testing. This RFC moves transcription specifically to
Groq's hosted Whisper API (`whisper-large-v3-turbo`), whose free tier (2,000 requests/day, 28,800
audio-seconds/day) is far better suited to this workload, and which is purpose-built for STT
rather than a general multimodal model pressed into service for it.

This explicitly **reverses** RFC 008's Non-Goal of introducing new AI vendors - a deliberate,
user-approved exception scoped to *only* audio transcription. Search/intake text extraction,
embeddings, and description generation all stay on Gemini; nothing else about the architecture
changes.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Voice notes (search and property-registration) transcribe via Groq's
      `whisper-large-v3-turbo` instead of Gemini.
- [x] The transcript then flows through the exact same downstream cascade already built (local
      heuristic → Gemini-lite text extraction → hybrid search / field merge) - no changes there.
- [x] Missing `GROQ_API_KEY` degrades the same way missing `GEMINI_API_KEY` already does: a clear
      503 telling the user voice notes aren't configured, text/typed input unaffected.
- [x] No client-side (`src/`) changes - the app already sends base64 audio + mimeType the same way
      regardless of which vendor transcribes it server-side.

### Non-Goals (Out of Scope)
- Replacing Gemini anywhere else (text extraction, embeddings, description generation). Those are
  working correctly as of RFC 008/session 042 and aren't the problem this RFC addresses.
- A Gemini fallback if Groq fails. Deliberately not added - the whole point is to get off a vendor
  whose free-tier quota was already hit during ordinary testing; chaining back to it on failure
  would silently reintroduce the same ceiling. A Groq failure surfaces as a clear error instead
  (same UX as the existing "no pude procesar la nota de voz" precedent).
- Streaming/real-time transcription. Still async record-then-send, per RFC 005's original scope.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 (Voice search)**: Given the user records a search voice note, when `chat-query`
  processes it, then Groq transcribes it and the existing heuristic/Gemini-lite/hybrid-search
  cascade runs on the transcript exactly as it does for typed text.
- **Story 2 (Voice registration)**: Given the user records a property-description voice note, when
  `property-intake` processes it, then the same happens for field extraction.
- **Story 3 (Groq not configured)**: Given `GROQ_API_KEY` isn't set, when a voice note is sent,
  then the user gets a clear message that voice notes aren't available, typed input still works.

---

## 4. Proposed Architecture & Public Contracts

### Edge Functions
- `_shared/audioPayload.ts` (new, vendor-neutral): `AudioPayload` interface + `isAudioPayload()` -
  split out of the old `_shared/geminiAudio.ts` (deleted), since payload-shape validation isn't
  tied to whichever vendor ends up transcribing it.
- `_shared/groqAudio.ts` (new): `transcribeAudio(audio: AudioPayload, groqKey: string):
  Promise<string>` - `multipart/form-data` POST to
  `https://api.groq.com/openai/v1/audio/transcriptions` (`model: whisper-large-v3-turbo`,
  `response_format: json`), returns the transcript string directly. No system instruction/prompt
  concept here - Whisper only transcribes, it doesn't participate in the extraction cascade the
  way Gemini's combined call briefly did in RFC 005-008; that decoupling (session 040's Phase 1
  cascade work) is exactly what makes this vendor swap a clean, isolated change.
- `chat-query/index.ts`, `property-intake/index.ts`: audio branch calls `transcribeAudio` instead
  of the old `transcribeAndExtractFromAudio`; everything after (`effectiveMessage = transcript`,
  the heuristic/Gemini-lite cascade) is unchanged.
- `_shared/prompts.ts`: `audioTranscribeInstruction()` and `GEMINI_AUDIO_MODEL` removed (no longer
  called by anything - Whisper takes no instruction). `GEMINI_EXTRACTION_MODEL` (text) untouched.

### Config
New Supabase secret `GROQ_API_KEY`, set the same way `GEMINI_API_KEY` already is. The user
provides this (an external account/API key Claude Code cannot create).

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- The audio payload is still transient (sent inline, forwarded to Groq, discarded after the
  response) - same handling as the Gemini path it replaces, per RFC 005's original principle.
- Groq's transcript output is untrusted input, identical treatment to a typed message - it flows
  through the same extraction/validation logic downstream, `property-publish` remains the sole
  authoritative write path.

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| `GROQ_API_KEY` not configured | Clear message, text input unaffected | 503 |
| Groq API error (any status) | Response body logged for diagnosis (lesson from session 041's silent-404 debugging), user sees "no pude procesar la nota de voz" | 502 |
| Groq returns an empty transcript | Same "no pude entender" message as before | 502 |

---

## 6. Verification & Test Plan
- [x] Regression: `npm run typecheck`, `npm run lint`, `npm test` (no client changes expected, but
      run anyway per this repo's convention).
- [ ] Deno unit tests - **not done**, same documented repo-wide gap as every RFC since 005.
      `esbuild` syntax-checked instead.
- [ ] Manual `curl` smoke test with a real synthesized voice note (same technique as session 041)
      - **blocked until the user provides `GROQ_API_KEY`**.
- [ ] On-device voice note round-trip - blocked on the same key, and same "no simulator here" gap
      as every prior audio session.
