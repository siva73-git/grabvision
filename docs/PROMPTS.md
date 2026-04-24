# The "Vibe Coding" Prompt Library

These prompts define the phased implementation strategy for the hackathon. AI Assistants (like OpenAI Codex or Cursor) should be fed these prompts sequentially to build out the application components.

### Prompt 1: Foundation (The Shell) - *[COMPLETED]*
"Build a mobile-first Next.js PWA called GrabPath. The UI must be a full-screen swipeable 'Story' interface using Framer Motion. Each card represents a navigation step.
1. Top: A mini-map preview showing the current segment.
2. Middle: A high-quality landmark image/placeholder.
3. Bottom: Bold text instructions (e.g., 'Turn left at Starbucks').
4. Haptics: Add vibration on card change.
Include iPhone 'Add to Home Screen' manifest and meta tags."

### Prompt 2: Navigation Engine (The API Bridge)
"Create a Next.js API route `/api/navigation` that fetches Grab Directions. For each maneuver coordinate, call the Grab POI Search API to find the nearest recognizable landmark (prioritize brands like Starbucks, 7-Eleven, MRT exits). If Grab has no image, use Google Places API as a fallback. Return the data in the JSON schema provided."

### Prompt 3: Hardware & Orientation (Compass + Sun)
"Add a Compass component for iOS.
1. Request DeviceOrientationEvent permissions via a button.
2. Calculate the solar azimuth for Singapore at the current time.
3. Place a Sun icon on the compass rim. If the user's target_bearing is North and the Sun is West, the icon should appear on the left. This helps orientation if the GPS is jittery."

### Prompt 4: The 'Wow' Feature (Pre-flight Flyover)
"Create a `RoutePreviewer`. When the user taps 'Preview Journey':
1. Loop through the `navigationSteps` array.
2. For each step, use `map.flyTo()` to swoop down to the landmark at a 60-degree pitch.
3. Rotate the map bearing to match the walking direction.
4. Auto-swipe the UI cards in sync with the map movement. This gives a cinematic 15-second rehearsal of the walk."
