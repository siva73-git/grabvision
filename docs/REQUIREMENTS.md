# Requirements & Features

## Functional Requirements

### 1. The Story Interface (Foundation)
- The application MUST run as a Progressive Web App (PWA) with 'Add to Home Screen' capabilities.
- The UI MUST be full-screen, hiding browser chrome where possible.
- Users MUST navigate route segments via horizontal swiping (Framer Motion).
- The device MUST trigger a 50ms vibration (haptic feedback) on card change.

### 2. The API Bridge
- The system MUST dynamically fetch visual landmarks associated with route maneuvers.
- Brand prioritization MUST be applied (favoring recognizable chains like Starbucks, 7-Eleven).
- The system MUST gracefully fallback to Google Places API if Grab POI images are unavailable.

### 3. Hardware & Orientation (Compass + Sun)
- The system MUST request and handle iOS `DeviceOrientationEvent` permissions explicitly (requires a user tap).
- The compass MUST calculate the solar azimuth based on the current time in Singapore (approx. `1.3521° N, 103.8198° E`).
- A dynamic Sun Icon MUST be rendered on the compass rim, showing the relative position of the sun based on the user's `target_bearing` to aid physical orientation.

### 4. Cinematic Route Preview
- A "Preview Journey" button MUST exist.
- Upon activation, the map MUST execute sequential `flyTo()` animations for each step.
- The map pitch MUST be locked at 60-degrees.
- The map bearing MUST match the walking direction.
- The UI Story Cards MUST auto-swipe in sync with the map movement, completing the rehearsal in approximately 15 seconds.

## Non-Functional Requirements
- **Performance**: The app must remain buttery smooth (60fps) during MapLibre flyovers and Framer Motion swiping simultaneously.
- **Resilience**: Map placeholders and fallback images must be used aggressively to prevent white screens during API latency.
