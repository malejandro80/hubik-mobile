# RFC 002: Real Estate AI Natural Language Query Service & UI

- **Author**: Antigravity Full-Stack Engineer
- **Status**: Approved
- **Created**: 2026-09-14
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Users searching for properties often think in natural language (e.g., "Find modern 2-bedroom apartments in Austin under $400k" or "Quiet spacious homes near nature in Denver"). Traditional search forms with endless dropdowns create friction. This MVP introduces an AI conversational search pipeline powered by Google Gemini Tool Calling, deterministic parameterized SQL execution, and pgvector semantic matching, returning both conversational answers and visual property cards.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Integrate Gemini Function Calling (`search_properties`) to parse user queries into strictly typed filter parameters.
- [x] Enforce secure parameterized `SELECT`-only execution (prevent SQL injection, mutations, or arbitrary string execution).
- [x] Configure pgvector vector database with 768-dim embeddings and `match_properties` RPC
      function. Originally generated via `text-embedding-004`; migrated to `gemini-embedding-001`
      (`outputDimensionality: 768`) on 2026-09-17 after Google deprecated the former — see RFC
      004's matching amendment. The column stays `vector(768)` either way.
- [x] Configure Supabase Storage bucket (`property-images`) for high-resolution property photography.
- [x] Expose `POST /api/chat-query` endpoint returning `{ answer: string, data: Array<Property> }`.
- [x] Provide a responsive Chat UI with prompt suggestions, message feed, and interactive property cards.

### Non-Goals (Out of Scope)
- Allowing the LLM to generate or execute raw SQL strings directly.
- Allowing database write operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`).

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Filtered Query)**:
  - **Given** a user message like "Show me 2-bedroom apartments in Austin under $400k"
  - **When** submitted to `/api/chat-query`
  - **Then** the LLM triggers the `search_properties` tool with `{ city: 'Austin', property_type: 'Apartment', max_price: 400000, min_bedrooms: 2 }`
  - **And** matching records are fetched, synthesized by the LLM, and displayed as property cards.

- **Story 2 (Zero Results)**:
  - **Given** a user message with criteria that yield 0 matches (e.g. "Mansions in Austin under $50k")
  - **When** query is processed
  - **Then** the LLM returns a helpful conversational message explaining no properties were found, with suggestion tips.

---

## 4. Architecture & Interface Contracts

### Data Model
```typescript
export interface Property {
  id: string;
  title: string;
  property_type: 'Apartment' | 'Single Family' | 'Townhouse' | 'Studio' | 'Condo';
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  city: string;
  address: string;
  status: 'Available' | 'Pending' | 'Sold';
  image_url: string;
  images: string[];
  similarity?: number;
  created_at?: string;
}
```

### API Contract
- **Endpoint**: `POST /api/chat-query`
- **Request Body**:
  ```json
  {
    "message": "2-bedroom apartments in Austin under $400k"
  }
  ```
- **Response**:
  ```json
  {
    "answer": "Here are 2 apartments in Austin under $400,000 matching your search...",
    "data": [ ...properties ]
  }
  ```

---

## 5. Security & Error Handling
- Query parameters strictly validated via Zod (`PropertyFilterSchema`).
- Database repository strictly executes read-only parameterized builder.
- Client secret quarantine: only public keys exposed to frontend bundle.
