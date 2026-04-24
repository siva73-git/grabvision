# Demo Plan

Last updated: 2026-04-24

This is the working checklist for getting GrabVision demo-ready. Update it as items move from planning to done.

## Checklist

- [ ] 1. Demo walkthrough script
- [ ] 2. Visual polish pass
- [ ] 3. Improve demo route content
- [ ] 4. Add demo lock / reliability toggle
- [ ] 5. iPhone local test path
- [ ] 6. Compass/sun decision

## 1. Demo Walkthrough Script

Goal: a crisp 90-second flow that explains the problem, shows the product, and makes the route feel hard enough to justify landmark-first navigation.

### Draft Script

**0-10s: Setup**

“This is GrabVision, a walking navigation experience for dense downtown Singapore. The problem we are solving is not long-distance routing. It is the last 600 meters, where GPS bounces, streets are visually crowded, and normal map lines do not tell you what to look for.”

**10-25s: Route**

Show the route fields:

- Origin: `Raffles Place MRT Exit F`
- Destination: `Lau Pa Sat Food Court`

“For the demo, we are starting at Raffles Place MRT and walking to Lau Pa Sat. It is a short route, but it is exactly the kind of urban canyon journey where people still hesitate: which exit, which tower, which road crossing, which landmark?”

Tap `Route`.

**25-45s: Story Navigation**

Show the first landmark card.

“Instead of asking the user to interpret a blue line, each step is anchored to something visible. The first instruction is not just ‘head south’; it tells you what to face and what landmark confirms you are oriented correctly.”

Swipe through one or two cards.

“Each card combines distance, remaining ETA, an action icon, a landmark image, and a plain-language instruction. The map stays in sync, but the user does not have to stare at it.”

**45-65s: Preview Journey**

Tap the play button.

“Before walking, the user can preview the journey. The map flies through the route while the cards advance, creating a quick rehearsal of what they are about to see.”

Let the preview advance.

“This is especially useful when leaving MRT stations, malls, or office towers where the first turn is the stressful one.”

**65-80s: Reliability / API Story**

“Under the hood, the app uses the new GrabMaps API for map styling, routing, and POI discovery. If a landmark image is missing, it falls back to Google Places, and for demo reliability we keep curated downtown fallbacks so there are no blank cards.”

**80-90s: Close**

“The core idea is simple: make walking navigation feel like following the city, not decoding a map.”

### Demo Notes

- Primary demo URL: `http://localhost:3000`
- Backup deployed URL: `https://grabvision.vercel.app`
- Use the curated route unless live route quality is clearly better.
- Avoid promising iOS haptics or compass until they are implemented and tested.

### Acceptance Criteria

- The presenter can complete the script in about 90 seconds.
- The first 15 seconds clearly state the problem.
- The demo shows route input, story cards, and preview journey.
- The fallback/API story is mentioned without becoming too technical.
- The close ties back to the product idea.
