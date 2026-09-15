# RFC 001: Supabase Client Integration & Secure Storage

- **Author**: Antigravity Mobile Engineer
- **Status**: Approved
- **Created**: 2026-09-14
- **Target Release / Milestone**: Supabase Backend Integration

---

## 1. Problem Statement & Motivation
The `hubik-mobile` application requires connectivity to the HUBIK Supabase backend (`xbirlummltqnesuzdlov`) for authentication, data access, and real-time events. To adhere to mobile security standards (OWASP Mobile & `.agents/rules/06-mobile-development.md`), JWT tokens and session data must be stored in encrypted storage (`expo-secure-store`) rather than plaintext `AsyncStorage`.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Configure `@supabase/supabase-js` client with environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- [x] Provide a secure storage adapter wrapping `expo-secure-store` for native iOS and Android environments.
- [x] Provide a fallback storage adapter for web/node test environments.
- [x] Enable session persistence and automatic token refresh.

### Non-Goals (Out of Scope)
- No client-side usage of `SUPABASE_SERVICE_ROLE_KEY` (secret quarantine strictly enforced).
- No unencrypted AsyncStorage session storage on mobile devices.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 (Client Initialization)**:
  - **Given** valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - **When** `supabase` client is accessed
  - **Then** the client is configured and ready for queries.
- **Story 2 (Secure Storage Adapter)**:
  - **Given** native mobile execution
  - **When** auth session tokens are read, written, or removed
  - **Then** `expo-secure-store` APIs (`getItemAsync`, `setItemAsync`, `deleteItemAsync`) are invoked.

---

## 4. Proposed Architecture & Public Contracts

### Interface Schemas & Signatures
```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export const ExpoSecureStoreAdapter: StorageAdapter;
export const supabase: SupabaseClient;
```

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
- Only public publishable / anon keys are accepted on mobile client.
- Auth tokens are encrypted at rest using OS-level keystore/keychain through `expo-secure-store`.

---

## 6. Verification & Test Plan
- [x] Unit Test: `ExpoSecureStoreAdapter` correctly calls `SecureStore.getItemAsync`, `setItemAsync`, and `deleteItemAsync`.
- [x] Unit Test: `supabase` instance is successfully created with configured URL and auth settings.
