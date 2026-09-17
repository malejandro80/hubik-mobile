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

  RFC004 --> RFC006
  RFC004 --> RFC007

  Hook["usePropertyRegistrationChat.ts<br/>(draft state machine)"]
  ChatApi["chatApi.ts<br/>(client fallback + Edge Function calls)"]
  Intake["Edge Fn: property-intake<br/>(extract fields, catastro guard)"]
  Publish["Edge Fn: property-publish<br/>(validate, insert, embed)"]
  Describe["Edge Fn: property-describe<br/>(Gemini description)"]
  ChatQuery["Edge Fn: chat-query<br/>(search filters + semantic fallback)"]
  Images["propertyImages.ts<br/>(Storage upload, batched at publish)"]
  Grid["PropertyPhotoGrid.tsx<br/>(delete/reorder/cover UI)"]
  MapPicker["ChatMapPicker.tsx<br/>(Leaflet location picker)"]

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

  Catastro["properties.catastro<br/>(UNIQUE, indexed)"]
  MediaCols["properties.images / latitude / longitude / description"]
  Embedding["properties.embedding<br/>(vector(768), hnsw index)"]

  RFC006 --> Catastro
  RFC007 --> MediaCols
  RFC007 --> Embedding
  ChatQuery -. "match_properties RPC (semantic fallback)" .-> Embedding
  Publish -. "computes at insert" .-> Embedding
```
