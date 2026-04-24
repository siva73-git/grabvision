# GrabMaps Defect: Style Endpoint Intermittently Returns 503

## Summary

The GrabMaps style endpoint used to initialize MapLibre intermittently returns a non-OK response through the local authenticated proxy flow. When this happens, both Section 1 overview maps and Section 2 cue maps cannot initialize their GrabMaps basemap.

## Environment

- App: GrabVision local demo
- Date observed: 2026-04-24
- Local URL: `http://localhost:3000`
- App endpoint: `GET /api/map-style?theme=basic`
- Cue-map endpoint variant: `GET /api/map-style?theme=basic&mode=cue`
- Upstream endpoint: `GET https://maps.grab.com/api/style.json`
- Auth mode: server-side `Authorization: Bearer <GRABMAPS_API_KEY>`

## Reproduction

1. Start the local app.
2. Request the style endpoint:

```bash
curl -sS -o /tmp/cue-style.json -w '%{http_code}\n' \
  'http://localhost:3000/api/map-style?theme=basic&mode=cue'
```

3. Or reload `http://localhost:3000` and inspect browser console errors.

## Actual Result

The local endpoint returned HTTP `503` with body:

```json
{"error":"Unable to load GrabMaps style"}
```

Browser console examples:

```text
Error: GrabMaps style unavailable
Error: GrabMaps style unavailable for cue view
```

## Expected Result

The style endpoint should return a valid MapLibre-compatible style JSON consistently when called with a valid GrabMaps API key.

## Impact

- Section 1 can only show the fallback route sketch.
- Section 2 actual cue map views cannot initialize.
- Demo reliability depends on fallback rendering instead of the preferred GrabMaps basemap.

## Notes

This appears separate from sprite/glyph failures. The sprite/glyph issue can occur after style JSON succeeds; this issue prevents style JSON from loading at all.

## Retest: 2026-04-24 14:37 SGT

Status: **not currently reproducible**.

Direct upstream retest with the local `.env` GrabMaps API key:

```text
GET https://maps.grab.com/api/style.json?theme=basic
HTTP 200
Content-Type: application/json
Size: 69635 bytes
```

Local proxy retest in the in-app browser:

```text
GET http://localhost:3000/api/map-style?theme=basic&mode=cue
HTTP 200
Returned valid style JSON
```

Conclusion: the previously observed style endpoint 503 appears resolved at the time of this retest.
