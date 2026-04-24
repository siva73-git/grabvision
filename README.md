# GrabVision (GrabPath)

A "Story-style" navigation Progressive Web App (PWA) designed for Singapore's urban canyons. GrabVision replaces traditional 2D map lines with visual landmarks (Grab POIs), solar orientation, and cinematic previews to create a human-centric navigation experience.

Built as a 6-hour hackathon project.

## Project Objectives
- **Human-Centric Navigation**: Move away from staring at top-down maps. Use real-world landmarks, clear swipeable cards, and haptics to guide the user.
- **Cinematic Experience**: Provide a "pre-flight" flyover of the route using MapLibre GL JS to reduce anxiety before the walk begins.
- **Orientation Fallbacks**: Integrate iOS Magnetometer and solar azimuth calculations to help users orient themselves when GPS bounces in dense urban areas.

## Core Technology Stack
- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS
- **Animation**: Framer Motion
- **Maps**: MapLibre GL JS (configured for Grab Maps Vector Tiles)
- **Hardware Integrations**: iOS Magnetometer API (Compass), Web Vibrate API (Haptics)
- **Deployment**: Vercel (PWA Enabled)

## Documentation Index
For AI Coding Assistants (Codex, Cursor, etc.) and developers, please refer to the following documentation files to understand the system context:
- [Architecture & Data Schema](docs/ARCHITECTURE.md)
- [Requirements & Features](docs/REQUIREMENTS.md)
- [Implementation Prompts](docs/PROMPTS.md)
- [GrabMaps API & MCP Skills Reference](docs/GRABMAPS_API.md)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. To test haptics and the compass, use a physical mobile device or simulator.
