# Architecture & Data Schema

Last updated: 2026-04-24

GrabVision is a mobile-first walking navigation PWA for Singapore. It uses GrabMaps for map styling, route data, and POI discovery where possible, then falls back to Google Places photos and curated demo assets so the hackathon demo remains reliable.

The current demo route is:

**Raffles Place MRT Exit F -> Lau Pa Sat Food Court**

This route was chosen because it is downtown, dense with landmarks, and easy to explain as a walking-navigation pain point.

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
   - `components/RouteMap.tsx` renders MapLibre GL.
   - The map style is loaded through `/api/map-style`, which fetches the GrabMaps style JSON with a server-side Bearer token.
   - The map draws the route line and uses `flyTo()` whenever the active story step changes.

4. **Story cards**
   - `components/StoryCard.tsx` renders the current `NavStep`.
   - Users can swipe horizontally through route steps.
   - Card changes trigger haptics where the browser supports `navigator.vibrate`.

5. **Preview Journey**
   - The play button starts an approximately 15-second route preview.
   - The app auto-advances the cards and the map flies to each step at a 60-degree pitch.

### Backend

All runtime provider calls are handled by App Router Route Handlers.

1. **`GET /api/navigation`**
   - Returns the curated demo route.
   - Useful for smoke tests and reliable demos.

2. **`POST /api/navigation`**
   - Input: origin and destination labels/coordinates.
   - Process:
     1. Fetches directions from GrabMaps.
     2. Prefers `profile=walking`.
     3. Falls back to `profile=driving` if walking is unavailable.
     4. Extracts route geometry and steps.
     5. Enriches each step with nearby recognizable landmarks.
     6. Searches Grab POI first.
     7. Falls back to Google Places photo/details when Grab imagery is missing.
     8. Falls back to curated demo landmarks/images if providers fail.
   - Output: a `NavigationRoute`.

3. **`GET /api/map-style`**
   - Fetches `https://maps.grab.com/api/style.json`.
   - Sends `Authorization: Bearer <GRABMAPS_API_KEY>`.
   - Returns the style JSON to MapLibre.
   - This avoids putting GrabMaps auth headers directly in the browser map style request.

4. **`GET /api/place-photo`**
   - Proxies Google Places photo references.
   - Keeps `GOOGLE_PLACES_API_KEY` server-side.
   - Redirects to the actual Google-hosted image URL.

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
- `GOOGLE_PLACES_API_KEY` is used only by server-side API routes.

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
   - The curated Raffles Place -> Lau Pa Sat route.
   - Used by `GET /api/navigation`.

3. **Fallback**
   - Returned by `POST /api/navigation` if live routing fails.
   - Uses the curated demo route but marks the source as `fallback`.

This protects the demo from network, provider, quota, or schema surprises.

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
- `target_bearing`: rotates the map camera and will later feed compass/sun orientation.
- `landmark.image_url`: must always resolve to a visible image. Use curated fallback images aggressively.
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

## Known Gaps

- iPhone-specific compass/sun orientation is not implemented yet.
- iOS haptics via `navigator.vibrate` may not work reliably; this is browser/platform dependent.
- GitHub CLI auth is currently invalid for `siva73-git`; pushing/deployment needs re-authentication.
- Vercel CLI is not installed locally; deployment can proceed through the Vercel GitHub integration or by installing/logging into Vercel CLI.
- Live route geometry from the current GrabMaps response may be sparse for walking; the curated route remains the reliable demo path.
