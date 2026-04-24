# Demo Plan

Last updated: 2026-04-24

This is the working checklist for getting GrabVision demo-ready. Update it as items move from planning to done.

## Checklist

- [ ] 1. Demo walkthrough script
- [x] 2. Visual polish pass
- [x] 3. Improve demo route content
- [ ] 4. Add demo lock / reliability toggle
- [ ] 5. iPhone local test path
- [ ] 6. Compass/sun decision
- [ ] Nice-to-have: three-panel landmark view

## 1. Demo Walkthrough Script

Goal: a crisp 90-second flow that explains the problem, shows the product, and makes the route feel hard enough to justify landmark-first navigation.

### Draft Script

**0-10s: Setup**

“This is GrabVision, a walking navigation experience for dense downtown Singapore. The problem we are solving is not long-distance routing. It is the last 600 meters, where GPS bounces, streets are visually crowded, and normal map lines do not tell you what to look for.”

**10-25s: Route**

Show the route fields:

- Origin: `Furama City Centre`
- Destination: `Maxwell Food Centre`

“For the demo, we are starting at Furama City Centre and walking through Chinatown to Maxwell Food Centre. This is the kind of dense street-level journey where people hesitate even over short distances: which frontage, which Chinatown street, which turn, which food-centre entrance?”

Tap `Route`.

**25-45s: Story Navigation**

Show the first landmark card.

“Instead of asking the user to interpret one far-away blue line, each step gets a recognizable visual cue. The first instruction tells you to face Eu Tong Sen Street and go straight, then the following cues use People’s Park, Chinatown MRT, Pagoda Street, Trengganu Street, Ann Siang, and Maxwell.”

Swipe through one or two cards.

“Each card combines distance, remaining ETA, an action icon, an exterior landmark view, and a plain-language instruction. The map stays in Section 1; this section is deliberately focused on what the walker should see.”

Collapse the 2D overview.

“The overview is still available, but it is collapsible. Once the user understands the rough path, the screen can focus on steering by landmarks.”

**45-65s: Preview Journey**

Tap the play button.

“Before walking, the user can preview the journey. The map flies through the route while the cards advance, creating a quick rehearsal of what they are about to see.”

Let the preview advance.

“This is especially useful when leaving MRT stations, malls, or office towers where the first turn is the stressful one.”

**65-80s: Reliability / API Story**

“Under the hood, the app uses the new GrabMaps API for map styling, routing, and POI discovery. For the demo, the visual cue layer uses checked-in exterior/street-view-style images so there are no blank cards or surprise indoor venue photos.”

**80-90s: Close**

“The core idea is simple: make walking navigation feel like following the city, not decoding a map.”

### Demo Notes

- Primary demo URL: `http://localhost:3000`
- Backup deployed URL: `https://grabvision.vercel.app`
- Use the curated route unless live route quality is clearly better.
- Avoid promising iOS haptics or compass until they are implemented and tested.
- The route should feel like pedestrian micro-wayfinding, not car navigation. Prefer visible, decision-relevant cues over a magic count; the curated demo currently uses 12 cue points across roughly 1.1 km.
- Live routing should use GrabMaps navigation geometry and GrabMaps Nearby POIs wherever possible. Cue density should include every meaningful turn plus periodic straight-ahead confirmations when they are visually distinct and reasonably spaced. If GrabMaps walking data is unavailable, use the curated demo route rather than retrying car routing.
- Section 1 now uses a styled Google Static Maps image as basemap context, but the route line and cue points are drawn by the app from the GrabMaps/demo route geometry. Google is not used to generate or draw the route. The basemap and SVG overlay share one Mercator viewport; remaining route oddities are route-geometry/content issues, not map projection drift.
- Section 2 should remain usable even when GrabMaps style resources fail. Current implementation is exterior-image-first: demo images are stored in `public/demo-images/`, and the route-map context remains in Section 1.
- Avoid Google Places venue-photo candidates for the cue cards; they tend to return interiors, food, or storefront albums. Prefer Google Street View Static exterior images that match what a walker sees from the route.
- GrabMaps style/tile proxy responses are cached locally in `.cache/grabmaps/` after each successful upstream download. If GrabMaps becomes unstable after a successful fetch, the app serves the cached response for localhost demo reliability.

### Acceptance Criteria

- The presenter can complete the script in about 90 seconds.
- The first 15 seconds clearly state the problem.
- The demo shows route input, story cards, and preview journey.
- The fallback/API story is mentioned without becoming too technical.
- The close ties back to the product idea.

## Nice-to-Have: Three-Panel Landmark View

Concept: use three side-by-side visual panels for each walking cue.

- **Center panel**: what the user should head toward.
- **Left panel**: what the user should see on their left, such as stores, pillars, exits, or curbside landmarks.
- **Right panel**: what the user should see on their right.

The labels must be visually obvious, not hidden in small captions. Suggested labels:

- `Ahead`
- `Left side`
- `Right side`

This would make the app feel less like generic POI cards and more like human wayfinding: “walk forward with 7-Eleven on your left and the station wall on your right.” It likely needs richer per-step landmark data than the current `landmark` object, for example:

```ts
landmarks: {
  ahead: Landmark;
  left?: Landmark;
  right?: Landmark;
}
```

Parked implementation idea:

1. Extend `NavStep` to support optional `landmarks.ahead/left/right`.
2. Keep current `landmark` as backwards-compatible `ahead`.
3. Use GrabMaps Nearby POIs plus bearing/side classification where possible.
4. Use curated demo side landmarks for station/indoor cues where the API lacks corridor semantics.

## UX Framing

Agreed product frame:

1. **Section 1: 2D Route Overview**
   - Traditional top-down map.
   - Shows the route shape, route line, facing/bearing context, and compass-style orientation.
   - Purpose: “Oh, this is roughly how I am supposed to go.”
   - Should be useful at the beginning and easy to collapse.
   - Current implementation uses a GrabMaps-backed MapLibre canvas plus a blue SVG route overlay for reliable presentation.

2. **Section 2: Landmark Cue Steering**
   - Main section where users spend most of their time.
   - Shows the current cue-point exterior view, optional map inset, and a clear animated action arrow: go straight, turn left, turn right, arrive.
   - Purpose: “What do I do now, and what should I be looking at?”
   - Should be the largest/default active section.

3. **Section 3: Destination Recognition**
   - Shows what the destination looks like.
   - Purpose: “What does success look like?”
   - Should be compact by default, expandable/collapsible when needed.

Do not make the sections equal height by default. Use priority weighting:

- Overview: medium height at start, often collapsed after orientation.
- Cue steering: largest/default active area.
- Destination: compact visual confirmation.
