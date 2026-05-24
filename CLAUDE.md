# Rouvio — Claude Code Instructions

## What this project is
Rouvio is a road-trip POI discovery app for Germany (DACH market).
Web (Next.js 14) + Mobile (React Native/Expo, Phase 2).
Users enter A→B, discover places along the route, talk to AI agent RODI.

## Stack
- Next.js 14 App Router, TypeScript strict, Tailwind CSS
- MapLibre GL JS (web) + MapLibre React Native (mobile) — NO Google Maps ever
- Nominatim for geocoding, OSRM for routing, Overpass API for POIs
- Anthropic SDK: claude-sonnet-4-20250514 (RODI agent), claude-haiku-4-5 (POI enrichment)
- Supabase (auth + PostgreSQL), Upstash Redis (caching), Vercel (hosting)
- Framer Motion (web animations), React Native Reanimated (mobile)

## Critical Rules — READ BEFORE WRITING ANY CODE
1. NEVER use Google Maps API. Only OSM, MapLibre, Nominatim, OSRM, Overpass.
2. All API keys via environment variables only — never hardcode anything
3. Always cache Overpass API responses in Redis: key = bbox+categories hash, TTL = 3600
4. RODI agent endpoint: always validate input, always return structured JSON
5. Mobile-first CSS — test every layout at 375px viewport width
6. i18n from day 1: all user-facing strings support DE and EN
7. Design tokens from DESIGN.md — NEVER hardcode colors, fonts, or spacing
8. Rate limit the /api/agent endpoint: 10 requests/minute/user via Upstash

## Design Tokens — Alpine (Final)
--color-primary: #1B3A6B      (headers, sidebars, agent bubbles)
--color-accent: #00C9A7       (CTAs, active states, route line on map)
--color-accent-dark: #00A88C  (CTA hover)
--color-highlight: #FF8C42    (POI map pins, ratings, highlights)
--color-surface: #F0F6FF      (card backgrounds)
--color-dark-bg: #0F1F3D      (dark mode background)
Font-body: DM Sans | Font-heading: Outfit

## Environment Variables (apps/web/.env.local)
NEXT_PUBLIC_MAPLIBRE_STYLE_URL=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
OSRM_ENDPOINT=https://router.project-osrm.org

## Project structure
rouvio/
├── apps/web/               Next.js 14 application
│   ├── app/
│   │   ├── page.tsx        Landing page
│   │   ├── map/page.tsx    Main discovery view
│   │   ├── trip/[id]/      Trip detail + export
│   │   ├── saved/          Saved trips
│   │   ├── explore/        Editorial routes
│   │   └── api/            route/, pois/, agent/ endpoints
│   └── components/
│       ├── Map/            MapCanvas, POIMarkers, RouteLayer
│       ├── POICard/
│       ├── FilterBar/
│       ├── AgentChat/      ChatPanel, MessageBubble, VoiceButton
│       └── TripPanel/
├── packages/
│   ├── shared-types/       POI, Trip, Route, Agent interfaces
│   ├── overpass-client/    Typed Overpass API wrapper
│   └── route-utils/        Polyline, bbox, corridor math
└── supabase/               migrations + schema.sql

## MVP Build Order
1. Landing page (/) with animated MapLibre background, glassmorphism A→B search
2. /api/route (OSRM proxy) and /api/pois (Overpass + Redis cache)
3. /map page: MapLibre canvas + route layer + POI markers + 8-category filter chips + POI cards
4. /api/agent (Claude RODI streaming) + ChatPanel component
5. Supabase auth (Google OAuth) + trip saving
6. GPX export + shareable URL
