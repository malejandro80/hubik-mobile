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

  RFC012["RFC 012: AI listing composer<br/>(single composer, live draft panel, no steps, cadastral last)"]
  RFC011 --> RFC012
  RFC007 --> RFC012
  ComposerHook["usePropertyRegistrationChat.ts (rewritten)<br/>(draft + recentlyChanged, no mode machine)"]
  Conversation["useRegistrationConversation.ts<br/>(text/voice intents, photos, publish confirm)"]
  DraftLogic["lib/draftStatus.ts + lib/draftValidation.ts<br/>(field statuses, suggestions, inline-edit rules)"]
  DraftPanel["DraftPanel + DraftFieldRow + LivingDraftCard (editable mode)<br/>(reuses PropertyPhotoGrid, ChatMapPicker, AmenitiesConfirmation)"]
  IntakeMessage["_shared/intakeMessage.ts<br/>(asks catastro last, free-description opening)"]

  RFC012 --> ComposerHook
  RFC012 --> Conversation
  RFC012 --> DraftLogic
  RFC012 --> DraftPanel
  RFC012 --> IntakeMessage
  Conversation -. "drives" .-> ComposerHook
  DraftPanel -. "renders statuses from" .-> DraftLogic
  IntakeMessage -. "used by" .-> Intake
  Conversation -. "uses" .-> Images
  ChatInputBar2["ChatInputBar attachments<br/>(photos + pin buttons while composing)"]
  RFC012 --> ChatInputBar2

  RFC013["RFC 013: Owners add agents by email<br/>(pending invites applied on first sign-in)"]
  RFC011 --> RFC013
  Invites["agent_invites table + add_agent / cancel_agent_invite<br/>(owner-only, SECURITY DEFINER, no client write path)"]
  ApplyInvite["apply_pending_invite + handle_new_user + on_auth_user_confirmed<br/>(google/apple claim on insert, or email confirmation)"]
  AgentsUI["AgentsSection + useAgencyAgents in the 'Mi inmobiliaria' screen"]

  RFC013 --> Invites
  RFC013 --> ApplyInvite
  RFC013 --> AgentsUI
  ApplyInvite -. "promotes a client to agent of the inviting agency" .-> Tenancy
  AgentsUI -. "RPC calls + RLS reads via authApi.ts" .-> Invites

  RFC014["RFC 014: Chat on every screen (slice 1: Mi inmobiliaria)<br/>(shared conversation, typed commands, no AI)"]
  RFC013 --> RFC014
  RFC012 --> RFC014
  SharedConvo["ConversationProvider + useConversation<br/>(shared history, cleared on sign-out)"]
  ScreenChat["useScreenChat + useAgencyChat + ScreenChatBar<br/>(parseAgencyCommand: add/cancel/count/list/go home)"]
  AppMenu["useAppMenu<br/>(one role-aware menu for home, agency, property)"]

  RFC014 --> SharedConvo
  RFC014 --> ScreenChat
  RFC014 --> AppMenu
  SharedConvo -. "replaces the home screen's local message list" .-> Hook
  ScreenChat -. "second client of add_agent / cancel_agent_invite" .-> Invites

  RFC015["RFC 015: Listing preview and photo order<br/>(client only)"]
  RFC012 --> RFC015
  DraftReview["useDraftReview<br/>(preview push + order modal state)"]
  PhotoOrder["PhotoOrderModal + lib/photoOrder<br/>(drag with react-native-reorderable-list, arrows)"]
  PreviewMode["property/[id] preview mode<br/>(banner, no AI call, no question bar)"]

  RFC015 --> DraftReview
  RFC015 --> PhotoOrder
  RFC015 --> PreviewMode
  DraftReview -. "buildDraftPreviewProperty + preview=1 route param" .-> PreviewMode
  PhotoOrder -. "setPhotos accepts only a permutation of the current photos" .-> Hook

  RFC016["RFC 016: Start screen with quick actions<br/>(replaces the welcome bubble; client only)"]
  RFC014 --> RFC016
  RFC011 --> RFC016
  StartScreenUI["StartScreen + useStartScreen + lib/startActions<br/>(role-aware cards, fixed examples, empty-state of the home chat)"]

  RFC016 --> StartScreenUI
  StartScreenUI -. "the shared conversation now starts empty; empty = start screen" .-> SharedConvo
  StartScreenUI -. "cards send through the home handleSend (search, /agregar-propiedad)" .-> Hook

  RFC017["RFC 017: Slash command menu<br/>(client only)"]
  RFC012 --> RFC017
  RFC016 --> RFC017
  SlashMenu["resolveSlashMenu + SlashCommandMenu + constants/slashCommands<br/>(registry: one entry per command, role-gated)"]

  RFC017 --> SlashMenu
  SlashMenu -. "a tapped row calls the home handleSend, which still enforces who may register" .-> Hook

  RFC018["RFC 018: Search clients to add as agents<br/>(migration 20260922_client_search, applied via MCP)"]
  RFC013 --> RFC018
  RFC011 --> RFC018
  ClientSearchDB["search_agent_candidates + add_agent_by_id + client_search_log<br/>(owner only, masked email, 5 rows, 20 searches/min)"]
  ClientSearchUI["useClientSearch + ClientSearchResults + AgentsSection selection"]

  RFC018 --> ClientSearchDB
  RFC018 --> ClientSearchUI
  ClientSearchDB -. "narrow owner-only exception to private client profiles (RFC 011)" .-> Tenancy
  ClientSearchDB -. "same outcomes as add_agent; removes a pending invite of the same agency" .-> Invites
  ClientSearchUI -. "extends the Agentes email field; useAgencyAgents gains addAgentById" .-> AgentsUI

  RFC019["RFC 019: Public shared-property page + install sheet<br/>(client only; web export route /p)"]
  RFC011 --> RFC019
  SharePage["src/app/p.tsx + SharedPropertyView + InstallSheet/InstallBar<br/>(useSharedProperty, useInstallPrompt, storeLinks)"]
  ShareLink["PropertyCard Compartir + lib/shareLink<br/>(link only when EXPO_PUBLIC_SHARE_BASE_URL is set)"]

  RFC019 --> SharePage
  RFC019 --> ShareLink
  ShareLink -. "opens https://host/p?id=listing-id" .-> SharePage
  SharePage -. "anon read of property_listings display columns (no coordinates, creator id or embedding)" .-> Tenancy

  RFC020["RFC 020: Rich link previews + SEO<br/>(web.output server + unstable_useServerRendering; client/server code only)"]
  RFC019 --> RFC020
  ShareMeta["p/[slug].tsx + p/index.tsx generateMetadata<br/>listingSlug, listingMetadata, sharedMetadata"]
  SeoApi["sitemap.xml+api.ts + robots.txt+api.ts<br/>(lib/sitemap, fetchSitemapListings)"]

  RFC020 --> ShareMeta
  RFC020 --> SeoApi
  ShareMeta -. "resolves the 8-char id prefix by uuid range on property_listings" .-> Tenancy
  ShareLink -. "now shares the slug URL alone" .-> ShareMeta
  ShareMeta -. "server-rendered HTML carries OG/Twitter/canonical/robots" .-> SharePage

  RFC021["RFC 021: Full photo gallery<br/>(client only)"]
  RFC019 --> RFC021
  Gallery["PhotoGallery + usePhotoGallery + useGalleryKeys<br/>(modal viewer: swipe, thumbnails, web arrows)"]
  RFC021 --> Gallery
  Gallery -. "hero of the in-app property screen and of the shared web page opens it" .-> SharePage

  RFC022["RFC 022: Abrir en la app<br/>(client only; custom scheme hubikmobile://)"]
  RFC019 --> RFC022
  RFC020 --> RFC022
  OpenApp["appLink + useOpenApp + InstallSheet open button<br/>SharedListingRoute -> SharedListingRedirect on native"]
  RFC022 --> OpenApp
  OpenApp -. "hubikmobile://p/slug on native replaces to property/[id] with fetched listing params" .-> ShareMeta

  RFC025["RFC 025: LLM-grounded search answers<br/>(answer + suggestions written from the real rows)"]
  RFC008 --> RFC025
  SearchAnswer["_shared/searchAnswer.ts + searchAnswerConstants.ts<br/>(allowlisted facts, gemini-3.5-flash-lite, template fallback)"]
  RFC025 --> SearchAnswer
  RFC025 --> ChatQuery
  ChatQuery -. "composeSearchAnswer(items, filters, knownCities)" .-> SearchAnswer
  Chips["ChatMessageItem + SuggestionChips<br/>(chips under the latest reply in index.tsx)"]
  RFC025 --> Chips

  RFC026["RFC 026: Typewriter replies<br/>(client only; typing indicator + word-by-word reveal, Reduce Motion)"]
  RFC025 --> RFC026
  Typewriter["useTypewriter + lib/typewriter + useNewReply + useReduceMotion<br/>TypingIndicator (list footer while loading)"]
  RFC026 --> Typewriter
  Typewriter -. "animate only the reply that arrived after mount; cards and chips wait for the last word" .-> Chips

  RFC027["RFC 027: Precise hybrid search<br/>(full listing document, weighted full-text, RRF, relevance floor)"]
  RFC008 --> RFC027
  RFC010 --> RFC027
  HybridSearch["_shared/hybridSearch.ts + listingDocument.ts<br/>(content terms, place vs city, params)"]
  SearchRpc["search_properties_hybrid RPC<br/>(replaces match_properties_hybrid)"]
  SearchTsv["properties.search_tsv<br/>(generated, GIN; title A, amenities B, description C)"]
  RFC027 --> HybridSearch
  RFC027 --> SearchRpc
  RFC027 --> SearchTsv
  ChatQuery -. "buildHybridSearch → search_properties_hybrid" .-> SearchRpc
  SearchRpc -. "reads via property_listings (security_invoker)" .-> SearchTsv
  Publish -. "embeds listingDocument (title+type+operation+city+description+amenities)" .-> Embedding

  RFC028["RFC 028: One input bar<br/>(same look + real voice on every screen; detail asks in the chat)"]
  RFC026 --> RFC028
  InputBar["ChatInputBar (no per-screen props, mic required)<br/>useVoiceNote + transcribeVoiceNote"]
  RouteAsk["useChatRouteParams<br/>(startRegistration, ask/askAt)"]
  RFC028 --> InputBar
  RFC028 --> RouteAsk
  InputBar -. "transcribe_only" .-> ChatQuery
  RouteAsk -. "property detail → router.navigate('/', { ask, askAt })" .-> Hook

  RFC029["RFC 029: Role-aware start screen<br/>(audience → subtitle, first task, examples)"]
  RFC016 --> RFC029
  StartAudience["lib/startActions getStartAudience + getStartActions<br/>constants/startScreen START_EXAMPLES_BY_AUDIENCE"]
  RFC029 --> StartAudience
  AuthClient -. "status + profile.role" .-> StartAudience

  RFC030["RFC 030: Role-scoped search<br/>(agents/owners see only their agency; 'Tuya' badge)"]
  RFC027 --> RFC030
  RFC030 --> SearchRpc
  SearchRpc -. "viewer CTE: auth.uid() → profiles.agency_id (agent/owner)" .-> Tenancy
```

