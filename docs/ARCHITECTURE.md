# Architecture & Data Schema

Last updated: 2026-04-24

GrabVision is a mobile-first walking navigation PWA for Singapore. It uses GrabMaps for map styling, route data, and POI discovery where possible, then falls back to checked-in exterior/street-view-style demo assets so the hackathon demo remains reliable.

The current demo route is:

**Furama City Centre -> Maxwell Food Centre**

This route was chosen because it runs through Chinatown, has dense street-level visual landmarks, and is more likely to have recognizable place imagery than an indoor MRT-to-office segment.

## System Architecture

### Frontend

The main UI is implemented in `app/page.tsx`.

1. **Route controls**
   - Origin and destination fields are shown at the top of the app.
   - The current default values are the curated downtown demo route.
   - The `Route` button calls `/api/navigation`.

2. **Grab-style navigation surface**
   - Uses Grab green (`#00B14F`), white surfaces, compact controls, and a Grab-first font stack.
   - The font stack activates `Sanomat Grab`, `Sanomat Grab Web`, `Grab Community`, or `GRAB COMMUNITY` if the font is available locally or later provided as licensed assets.
   - iPhone safe-area padding is applied with `env(safe-area-inset-*)` so the header and story controls avoid the notch/home indicator.

3. **Map panel**
   - `components/RouteMap.tsx` renders Section 1 as a styled Google Static Maps basemap plus an app-owned SVG route/cue overlay.
   - The basemap is loaded through `/api/google-static-map` and uses Google only for map context, not route generation.
   - The route line, start/end dots, cue dots, and active facing arrow are drawn from `NavigationRoute.route_geometry` and `NavigationRoute.steps`.
   - The Google Static Maps request and the SVG overlay share the same computed center, zoom, size, and Web Mercator projection so the route overlay aligns with the basemap.
   - If Google Static Maps fails, the panel falls back to the same app-owned north-up SVG route sketch on a neutral background for demo reliability.
   - The map camera stays `pitch: 0` and `bearing: 0`; facing is shown with an arrow instead of rotating or tilting the map.
   - This is Section 1 of the UX: a collapsible 2D route overview for the initial “how do I go?” mental model.

4. **Landmark cue cards**
   - `components/StoryCard.tsx` renders the current `NavStep`.
   - Users can swipe horizontally through route steps.
   - Card changes trigger haptics where the browser supports `navigator.vibrate`.
   - Demo route cards are intentionally frequent and pedestrian-scale: hotel frontage, People's Park Centre, Chinatown MRT Exit C, Pagoda Street, Trengganu Street, Ann Siang Road, CPF Maxwell, and Maxwell Food Centre.
   - Section 2 is now exterior-image-first for demo reliability: all current demo cue images live under `public/demo-images/` and are referenced directly by `landmark.image_url`.
   - Google Places venue photos are not used for the current demo path because they often return interiors, food, or unrelated venue shots rather than what a walking user sees from the street.
   - Street View Static exterior images are the preferred demo asset source. The current route has 12 low-resolution Street View cue images cached under `public/demo-images/streetview/`.
   - The Section 2 map inset is currently disabled because it competed with the exterior cue image. Route-map context stays in Section 1 while Section 2 focuses on what the walker should see.
   - This is Section 2 of the UX: the primary visual cue steering surface with an animated action arrow and one-line maneuver instruction.

5. **Destination panel**
   - The destination reminder is collapsible.
   - It keeps the final landmark visible without permanently consuming story-card space.
   - This is Section 3 of the UX: destination recognition.

6. **Preview Journey**
   - The play button starts an approximately 15-second route preview.
   - The app auto-advances the cards and the overview map flies to each step while staying top-down.

### Backend

All runtime provider calls are handled by App Router Route Handlers.

1. **`GET /api/navigation`**
   - Returns the curated demo route.
   - Useful for smoke tests and reliable demos.

2. **`POST /api/navigation`**
   - Input: origin and destination labels/coordinates.
   - Process:
     1. Fetches route data from the GrabMaps `navigation` endpoint first.
     2. Prefers `profile=walking`.
     3. Falls back to GrabMaps `direction` if `navigation` is unavailable.
    4. Uses curated demo routing if GrabMaps walking data is unavailable; the app does not retry car routing for the walking product.
     5. Decodes GrabMaps encoded route geometry.
    6. Samples the route at every meaningful bearing change, then adds periodic straight-ahead confirmations only when they are visually distinct and reasonably spaced; the current curated demo has 12 cue points over roughly 1.1 km.
     7. Calls GrabMaps Nearby around each cue point to identify human-visible landmarks.
     8. Falls back to Grab POI keyword search if Nearby has no usable result.
     9. Falls back to curated demo landmarks/images if providers fail.
     10. Google Places photo APIs are kept for future enrichment, but the current demo does not use venue photos as cue-card imagery.
   - Output: a `NavigationRoute`.

3. **`GET /api/map-style`**
   - Fetches `https://maps.grab.com/api/style.json`.
   - Sends `Authorization: Bearer <GRABMAPS_API_KEY>`.
   - Rewrites GrabMaps style resources to same-origin proxy URLs.
   - Returns the style JSON to MapLibre.
   - This avoids putting GrabMaps auth headers directly in browser map, sprite, glyph, or tile requests.
   - `mode=cue` returns a simplified style by removing symbol layers, sprites, and glyph/font URLs. Sections 1 and 2 use this lean mode so the demo remains responsive and does not block on provider sprite/glyph failures.
   - Successful upstream style responses are cached under `.cache/grabmaps/`; if GrabMaps later returns 503 or has a network failure, the route handler serves the last good cached style.

4. **`GET /api/grabmaps/[...path]`**
   - Proxies authenticated GrabMaps map resources under `https://maps.grab.com/api/maps/...`.
   - Used for vector tiles, sprites, and glyphs referenced by the style JSON.
   - Keeps the GrabMaps token server-side while still using GrabMaps tiles in the browser.
   - Successful upstream responses are cached under `.cache/grabmaps/`; later failures fall back to the last good copy and include `X-GrabMaps-Cache: STALE`.

5. **`GET /api/place-photo`**
   - Proxies Google Places photo references.
   - Keeps `GOOGLE_PLACES_API_KEY` server-side.
   - Redirects to the actual Google-hosted image URL.
   - Kept for future live enrichment; not used by the current demo cue cards because Places photos tend to be interior/venue content.

6. **`GET /api/place-image`**
   - Searches Google Places by cue-specific text plus optional lat/lng bias.
   - Tries Find Place first, then Text Search.
   - Redirects to a Google Places photo when one is available.
   - Kept for future live enrichment, but the current demo does not depend on it at runtime.
   - Google Street View Static is used by `scripts/download-streetview-cues.mjs` to cache low-resolution exterior cue images for the demo route.

7. **`GET /api/google-static-map`**
   - Builds a styled Google Static Maps basemap image for Section 1.
   - Keeps `GOOGLE_PLACES_API_KEY` server-side.
   - Accepts route geometry and marker coordinates only to set the viewport with `visible`.
   - Does not draw Google markers or a Google route path; the app draws the single route/cue overlay itself.

## Environment Variables

Required locally and in Vercel:

```bash
GRABMAPS_API_KEY=
NEXT_PUBLIC_GRABMAPS_API_KEY=
GOOGLE_PLACES_API_KEY=
```

Notes:

- `GRABMAPS_API_KEY` is used by server-side route handlers.
- `NEXT_PUBLIC_GRABMAPS_API_KEY` currently exists for compatibility, but the app should prefer server-side map/style APIs where possible.
- `GOOGLE_PLACES_API_KEY` is used only by server-side API routes. It is not required for the current checked-in demo images.

## PWA and Mobile Demo

PWA assets live in `public/`:

- `icon.svg`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `manifest.json`

`scripts/generate-icons.mjs` generates the PNG icons from a small programmatic GrabVision mark. The manifest is portrait-oriented and uses maskable icons so it behaves better on iOS and Android home screens.

The laptop browser remains the primary reliable demo target. iPhone 13 Pro Max is supported as a secondary demo target once the app is deployed over HTTPS. iOS-specific compass/orientation features still need a dedicated implementation pass.

## Demo Reliability Strategy

The app has three route-data modes:

1. **Live**
   - GrabMaps directions succeeded.
   - Landmark enrichment may include Grab POIs, Google Places, or curated images.

2. **Demo**
   - The curated Furama City Centre -> Maxwell Food Centre route.
   - Used by `GET /api/navigation`.

3. **Fallback**
   - Returned by `POST /api/navigation` if live routing fails.
   - Uses the curated demo route but marks the source as `fallback`.

This protects the demo from network, provider, quota, or schema surprises.

Important implementation detail: the current demo route is deliberately street-level. We are prioritizing Section 2 exterior landmark steering over indoor station micro-wayfinding until we have richer indoor landmark imagery/data.

Demo image sourcing rule: use exterior, street-facing images whenever possible. Avoid Google Places venue-photo candidates for cue steering unless they clearly show the sidewalk or building frontage a user will actually see. For the current route, refresh the cached assets with:

```bash
set -a; source .env; set +a; node scripts/download-streetview-cues.mjs
```

Provider/API failures that look like GrabMaps defects should be captured under `docs/defects/` with reproduction steps and observed responses.

## Core Data Schema

The UI is driven by a `NavigationRoute`, which contains a route summary, origin/destination, route geometry, and ordered `NavStep[]`.

```ts
type Coordinate = {
  lat: number;
  lng: number;
};

type NavigationRoute = {
  source: "live" | "demo" | "fallback";
  route_name: string;
  origin: {
    label: string;
    coordinate: Coordinate;
  };
  destination: {
    label: string;
    coordinate: Coordinate;
  };
  summary: {
    distance_text: string;
    duration_text: string;
    confidence_text: string;
  };
  steps: NavStep[];
  route_geometry: [number, number][];
};
```

`route_geometry` uses MapLibre/GeoJSON coordinate order: `[lng, lat]`.

### NavStep

```ts
type NavStep = {
  step_index: number;
  instruction: string;
  distance_text: string;
  duration_seconds: number;
  target_bearing: number;
  coordinate: Coordinate;
  segment_geometry?: [number, number][];
  landmark: {
    name: string;
    category: string;
    image_url: string;
    provider: "grab" | "google" | "curated";
    coordinate?: Coordinate;
    place_id?: string;
    confidence?: number;
  };
  action_icon: "straight" | "turn-left" | "turn-right" | "arrive" | "depart";
  is_junction: boolean;
  eta_remaining: string;
  source: "live" | "demo" | "fallback";
};
```

### Field Rules

- `coordinate`: the route-step coordinate used by story/map synchronization.
- `segment_geometry`: optional route segment geometry in `[lng, lat]` order.
- `target_bearing`: rotates the facing arrow and will later feed compass/sun orientation.
- `landmark.image_url`: must always resolve to a visible image. For the current demo, prefer checked-in files under `public/demo-images/`.
- `landmark.photo_query`: optional Google Places query for more photo-friendly landmark lookup.
- `landmark.provider`: indicates whether the landmark came from Grab, Google, or curated demo data.
- `action_icon`: maps to Lucide icons in `StoryCard`.
- `source`: lets the UI and logs distinguish live data from demo/fallback behavior.

## Current Verification

Known passing checks:

```bash
npm run lint
npm run typecheck
npm run build
```

`npm run build` may require running outside the filesystem sandbox because Turbopack starts a CSS helper process that binds to a local port.

Deployment and mobile demo notes live in `docs/DEPLOYMENT.md`. Current production URL: `https://grabvision.vercel.app`.

Demo readiness planning lives in `docs/DEMO_PLAN.md`.

## Known Gaps

- iPhone-specific compass/sun orientation is not implemented yet.
- iOS haptics via `navigator.vibrate` may not work reliably; this is browser/platform dependent.
- GitHub CLI auth is currently invalid for `siva73-git`; pushing/deployment needs re-authentication.
- Vercel CLI is not installed locally; deployment can proceed through the Vercel GitHub integration or by installing/logging into Vercel CLI.
- Live route geometry from the current GrabMaps response may be sparse for walking; the curated route remains the reliable demo path.
