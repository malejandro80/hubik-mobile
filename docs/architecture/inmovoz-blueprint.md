# Blueprint Técnico Integral: InmoVoz (Voice-First Real Estate AI)

Documento maestro de arquitectura, experiencia de usuario (UX/UI), modelos de datos, orquestación de IA y directrices de implementación para la plataforma inmobiliaria asistida por voz, orientada a agentes y propietarios mayores de 50 años.

---

## 1. Visión del Producto y Principios Rectores

* **Simplicidad sobre Funcionalidad:** Reducción drástica de la carga cognitiva. El núcleo no es un formulario denso ni una interfaz técnica, sino una interacción por voz multimodal guiada por un asistente empático.
* **Ergonomía Sénior (+50/60 años):** Objetivos táctiles mínimos de **52×52 dp**, fuentes base ampliadas (mínimo 18 sp), contrastes superiores a 7:1 (WCAG AAA) y eliminación de gestos táctiles complejos.
* **Progresión Paso a Paso Asistida (Stepped Wizard Machine):**
  1. **Paso 1 (Extracción e Ingesta):** Dictado por voz, resumen visual reactivo y aclaración de dudas mediante decisiones binarias (`[SÍ]` / `[NO]`).
  2. **Paso 2 (Ubicación y Fotos):** Geocodificación asistida en mapa y carga categorizada de fotos (Fachada, Salón, Cocina).
  3. **Paso 3 (Identidad, Dueño y Validación):** Comprobación de unicidad catastral/referencia y aislamiento estricto de los datos privados de contacto del propietario.
* **Aislamiento Estricto de PII (Personally Identifiable Information):** El nombre, teléfono y correo del dueño jamás forman parte de los embeddings vectoriales ni de los copys comerciales públicos.

---

## 2. Sistema de Diseño (`design.md`)

Este sistema implementa el modo sobrio y contemporáneo con contraste optimizado contra la fatiga visual.

### 2.1 Tokens Semánticos de Color y Superficies

| Token | Hex | Rol Semántico | WCAG Ratio |
| :--- | :--- | :--- | :--- |
| `color.primary` | `#1A3A34` | Verde Bosque Profundo. Marca, botón primario y acentos. | > 10:1 s/ surface |
| `color.on-primary` | `#FFFFFF` | Texto e iconos sobre contenedor primario. | 11.5:1 |
| `color.primary-container` | `#E3EFEA` | Verde Salvia Suave. Fondos de estados destacados. | N/A (Fondo) |
| `color.surface` | `#FAFAF7` | Marfil Cálido. Fondo general anti-deslumbramiento. | N/A (Canvas) |
| `color.surface-container` | `#F0EFEA` | Fondo de tarjetas, campos y burbujas de diálogo. | N/A (Contenedor) |
| `color.on-surface` | `#191C1B` | Carbón Oscuro. Textos principales y valores monetarios. | > 12:1 s/ surface |
| `color.on-surface-variant` | `#404845` | Gris Grafito. Metadatos, etiquetas y subtítulos. | > 4.5:1 s/ surface |
| `color.outline` | `#8D9390` | Bordes visibles de alta delimitación física (1.5px). | > 3:1 |
| `color.action-whatsapp` | `#1E7E34` | Verde comercial accesible para compartir ficha técnica. | > 4.5:1 s/ blanco |
| `color.error` | `#BA1A1A` | Alertas críticas y advertencias de discrepancia. | > 4.5:1 |

### 2.2 Escala Tipográfica (Optimizada para Lectura Sénior)
* **Familia Tipográfica:** `Plus Jakarta Sans` o `Inter` (amplia apertura de glifos y altura de x generosa).
* `typography.display-lg`: 32 sp | SemiBold (600) | Line Height: 40 sp
* `typography.headline-md`: 24 sp | SemiBold (600) | Line Height: 32 sp
* `typography.title-card`: 22 sp | Medium (500) | Line Height: 30 sp
* `typography.body-lg`: 18 sp | Regular (400) | Line Height: 28 sp (Cuerpo general)
* `typography.label-action`: 18 sp | SemiBold (600) | Line Height: 24 sp (Botones y Chips)

### 2.3 Espaciado y Reglas de Accesibilidad
* **Escala Base:** 8 pt (`2xs: 4dp`, `xs: 8dp`, `sm: 12dp`, `md: 16dp`, `lg: 24dp`, `xl: 32dp`).
* **Radios de Borde:** `radius.md = 16dp` para tarjetas; `radius.full = 9999dp` para botones de acción y PTT.
* **Botón Push-to-Talk (PTT):** Altura mínima de 64 dp con vibración háptica obligatoria al iniciar y detener la captura.
* **Control [A+]:** Botón persistente en la barra superior para alternar incremento dinámico de tipografía en caliente.

---

## 3. Arquitectura del Sistema e Infraestructura Serverless

El sistema elimina los servidores Node.js tradicionales dedicados. Se apoya en un pipeline *serverless / edge-first* con **Supabase Edge Functions** (Deno Deploy), almacenamiento de medios en buckets y la base de datos relacional PostgreSQL equipada con extensiones geoespaciales y vectoriales.

### 3.1 Diagrama de Flujo y Comunicación

```text
                           [Móvil: Expo App (React Native)]
                                          │
                  (Audio mono Opus 24kbps + Payload JSON local)
                                          │
                                          ▼
                         [Supabase API Gateway / Kong]
                         (Verificación de Token JWT / RLS)
                                          │
                                          ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                Supabase Edge Functions (Deno Runtime)                  │
     │                                                                        │
     │  1. `process-voice-draft` (Pipeline de Ingesta y Desambiguación)       │
     │     ├── STT Engine: Deepgram Nova-2 (Fallback a Whisper API)           │
     │     ├── LangChain Extraction Agent (Gemini 1.5 Flash + Structured Zod) │
     │     ├── Motor de Cordura (Sanity Checks de moneda y coherencia)        │
     │     └── TTS Synthesis (OpenAI TTS / ElevenLabs)                        │
     │                                                                        │
     │  2. `publish-property` (Lazy Execution - Solo cuando isReady === true) │
     │     ├── PII Filter: Excluye owner_name, owner_phone y owner_email      │
     │     ├── Copywriting Agent: Redacción comercial persuasiva              │
     │     ├── Embeddings Engine: text-embedding-004 (Gemini 768d)            │
     │     └── Transacción SQL: Inserción directa en PostgreSQL               │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          [Supabase Storage]                         [PostgreSQL Database]
        (Buckets S3 de audios                      ├── properties (PostGIS + RLS)
         y fotos categorizadas)                    └── pgvector (Búsqueda híbrida)
```
