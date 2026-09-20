# Workspace Rule: Feature & Module Relationship Graph

Static map of how the shipped RFCs extend each other and which modules/DB columns/Edge Functions
each one touches. Keep this updated whenever a new RFC extends or modifies an existing
chat/registration/search flow — it's the fastest way for a new session to see what depends on what
before changing shared code (`chatApi.ts`, `usePropertyRegistrationChat`, the `properties` table).

```mermaid
graph TD
  RFC004["RFC 004: Chat-guided registration<br/>(base flow + draft state machine)"]
  RFC006["RFC 006: catastro uniqueness guard<br/>(extends RFC 004's intake)"]
  RFC007["RFC 007: Photos, location, AI description, embedding<br/>(extends RFC 004's flow)"]
  RFC008["RFC 008: Cascading search & intake<br/>(hybrid RPC, gemini-2.5-flash-lite)"]
  RFC010["RFC 010: Property amenities & characteristics<br/>(passive extraction, chip confirmation, hybrid filter)"]

  RFC004 --> RFC006
  RFC004 --> RFC007
  RFC007 --> RFC008
  RFC008 --> RFC010

  Hook["usePropertyRegistrationChat.ts<br/>(draft state machine)"]
  ChatApi["chatApi.ts<br/>(client fallback + Edge Function calls)"]
  Intake["Edge Fn: property-intake<br/>(extract fields, catastro guard, amenities)"]
  Publish["Edge Fn: property-publish<br/>(validate, insert, embed)"]
  Describe["Edge Fn: property-describe<br/>(Gemini description)"]
  ChatQuery["Edge Fn: chat-query<br/>(search filters + hybrid semantic ranking)"]
  Images["propertyImages.ts<br/>(Storage upload, batched at publish)"]
  Grid["PropertyPhotoGrid.tsx<br/>(delete/reorder/cover UI)"]
  MapPicker["ChatMapPicker.tsx<br/>(Leaflet location picker)"]
  AmenitiesUI["AmenitiesConfirmation.tsx<br/>(pre-publish chip review)"]
  AmenitiesLib["_shared/amenities.ts + src/lib/amenities.ts<br/>(keyword dictionary, normalize/merge)"]

  RFC004 --> Hook
  RFC004 --> ChatApi
  RFC004 --> Intake
  RFC004 --> Publish
  RFC006 --> Intake
  RFC006 --> Publish
  RFC007 --> Hook
  RFC007 --> Images
  RFC007 --> Grid
  RFC007 --> MapPicker
  RFC007 --> Describe
  RFC007 --> Publish
  RFC007 --> ChatQuery
  RFC010 --> Hook
  RFC010 --> Intake
  RFC010 --> Publish
  RFC010 --> ChatQuery
  RFC010 --> ChatApi
  RFC010 --> AmenitiesUI
  RFC010 --> AmenitiesLib

  Catastro["properties.catastro<br/>(UNIQUE, indexed)"]
  MediaCols["properties.images / latitude / longitude / description"]
  Embedding["properties.embedding<br/>(vector(768), hnsw index)"]
  Amenities["properties.amenities<br/>(TEXT[], GIN index)"]

  RFC006 --> Catastro
  RFC007 --> MediaCols
  RFC007 --> Embedding
  RFC010 --> Amenities
  ChatQuery -. "match_properties_hybrid RPC (relational + semantic)" .-> Embedding
  ChatQuery -. "p_amenities @> containment filter" .-> Amenities
  Publish -. "computes at insert (description + amenities text)" .-> Embedding
  Publish -. "normalizes on insert" .-> Amenities
  RFC011["RFC 011: Sign-in, roles & agencies<br/>(Supabase Auth, agency tenancy, agent-only publishing)"]
  RFC010 --> RFC011
  AuthClient["AuthProvider + useAuth + authApi.ts<br/>(session, profile, role capabilities)"]
  RequireAgent["_shared/auth.ts requireAgent<br/>(401/403 before any work)"]
  Tenancy["agencies + profiles tables<br/>properties.agency_id / created_by"]
  Listings["property_listings view<br/>(agency_name, agent_name)"]

  RFC011 --> AuthClient
  RFC011 --> RequireAgent
  RFC011 --> Tenancy
  RFC011 --> Listings
  AuthClient -. "capabilities gate the register command, menu and startRegistration param in index.tsx" .-> Hook
  RequireAgent -. "gates" .-> Publish
  RequireAgent -. "gates" .-> Intake
  Publish -. "stamps agency_id + created_by from the caller's profile" .-> Tenancy
  Listings -. "joins agencies + agents_public" .-> Tenancy
  ChatQuery -. "fallback select + match_properties_hybrid now read from" .-> Listings
```
