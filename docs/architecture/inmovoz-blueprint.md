# Comprehensive Technical Blueprint: InmoVoz (Voice-First Real Estate AI)

Master document for architecture, user experience (UX/UI), data models, AI orchestration, and implementation guidelines for the voice-assisted real estate platform, aimed at agents and property owners over 50 years old.

---

## 1. Product Vision & Guiding Principles

* **Simplicity over Feature Richness:** Drastic reduction of cognitive load. The core is not a dense form or a technical interface, but a multimodal voice interaction guided by an empathetic assistant.
* **Senior Ergonomics (+50/60 years):** Minimum touch targets of **52×52 dp**, enlarged base fonts (minimum 18 sp), contrast ratios above 7:1 (WCAG AAA), and elimination of complex touch gestures.
* **Assisted Step-by-Step Progression (Stepped Wizard Machine):**
  1. **Step 1 (Extraction & Intake):** Voice dictation, reactive visual summary, and doubt clarification via binary decisions (`[YES]` / `[NO]`).
  2. **Step 2 (Location & Photos):** Assisted map geocoding and categorized photo upload (Facade, Living Room, Kitchen).
  3. **Step 3 (Identity, Owner & Validation):** Cadastral reference uniqueness check and strict isolation of the owner's private contact data.
* **Strict PII Isolation (Personally Identifiable Information):** The owner's name, phone, and email never become part of the vector embeddings or the public commercial copy.

---

## 2. Design System (`design.md`)

This system implements a sober, contemporary mode with contrast optimized against visual fatigue.

### 2.1 Semantic Color & Surface Tokens

| Token | Hex | Semantic Role | WCAG Ratio |
| :--- | :--- | :--- | :--- |
| `color.primary` | `#1A3A34` | Deep Forest Green. Brand, primary button, and accents. | > 10:1 vs. surface |
| `color.on-primary` | `#FFFFFF` | Text and icons over the primary container. | 11.5:1 |
| `color.primary-container` | `#E3EFEA` | Soft Sage Green. Backgrounds for highlighted states. | N/A (Background) |
| `color.surface` | `#FAFAF7` | Warm Ivory. General anti-glare background. | N/A (Canvas) |
| `color.surface-container` | `#F0EFEA` | Background for cards, fields, and dialog bubbles. | N/A (Container) |
| `color.on-surface` | `#191C1B` | Dark Charcoal. Main text and monetary values. | > 12:1 vs. surface |
| `color.on-surface-variant` | `#404845` | Graphite Gray. Metadata, labels, and subtitles. | > 4.5:1 vs. surface |
| `color.outline` | `#8D9390` | Visible borders with high physical delimitation (1.5px). | > 3:1 |
| `color.action-whatsapp` | `#1E7E34` | Accessible commercial green for sharing the listing sheet. | > 4.5:1 vs. white |
| `color.error` | `#BA1A1A` | Critical alerts and discrepancy warnings. | > 4.5:1 |

### 2.2 Typographic Scale (Optimized for Senior Reading)
* **Typeface Family:** `Plus Jakarta Sans` or `Inter` (wide glyph aperture and generous x-height).
* `typography.display-lg`: 32 sp | SemiBold (600) | Line Height: 40 sp
* `typography.headline-md`: 24 sp | SemiBold (600) | Line Height: 32 sp
* `typography.title-card`: 22 sp | Medium (500) | Line Height: 30 sp
* `typography.body-lg`: 18 sp | Regular (400) | Line Height: 28 sp (General body text)
* `typography.label-action`: 18 sp | SemiBold (600) | Line Height: 24 sp (Buttons and Chips)

### 2.3 Spacing & Accessibility Rules
* **Base Scale:** 8 pt (`2xs: 4dp`, `xs: 8dp`, `sm: 12dp`, `md: 16dp`, `lg: 24dp`, `xl: 32dp`).
* **Border Radii:** `radius.md = 16dp` for cards; `radius.full = 9999dp` for action buttons and PTT.
* **Push-to-Talk (PTT) Button:** Minimum height of 64 dp with mandatory haptic feedback on capture start and stop.
* **[A+] Control:** Persistent button on the top bar to toggle dynamic font-size increase on the fly.

---

## 3. System Architecture & Serverless Infrastructure

The system eliminates traditional dedicated Node.js servers. It relies on a *serverless / edge-first* pipeline using **Supabase Edge Functions** (Deno Deploy), media storage in buckets, and a relational PostgreSQL database equipped with geospatial and vector extensions.

### 3.1 Flow & Communication Diagram

```text
                           [Mobile: Expo App (React Native)]
                                          │
                  (Mono Opus 24kbps audio + local JSON payload)
                                          │
                                          ▼
                         [Supabase API Gateway / Kong]
                         (JWT Token verification / RLS)
                                          │
                                          ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                Supabase Edge Functions (Deno Runtime)                  │
     │                                                                        │
     │  1. `process-voice-draft` (Intake & Disambiguation Pipeline)           │
     │     ├── STT Engine: Deepgram Nova-2 (Fallback to Whisper API)          │
     │     ├── LangChain Extraction Agent (Gemini 1.5 Flash + Structured Zod) │
     │     ├── Sanity Engine (Currency and coherence sanity checks)           │
     │     └── TTS Synthesis (OpenAI TTS / ElevenLabs)                        │
     │                                                                        │
     │  2. `publish-property` (Lazy Execution - Only when isReady === true)   │
     │     ├── PII Filter: Excludes owner_name, owner_phone, and owner_email  │
     │     ├── Copywriting Agent: Persuasive commercial copy drafting         │
     │     ├── Embeddings Engine: text-embedding-004 (Gemini 768d)            │
     │     └── SQL Transaction: Direct insertion into PostgreSQL              │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          [Supabase Storage]                         [PostgreSQL Database]
        (S3 buckets for audio                       ├── properties (PostGIS + RLS)
         and categorized photos)                    └── pgvector (Hybrid search)
```
