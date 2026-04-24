# GrabMaps Defect: Style Sprite And Glyph Resources Return 503

## Summary

The GrabMaps style document loads successfully, but sprite and glyph resources referenced by that style intermittently fail with `503 no healthy upstream`. This causes MapLibre warnings, missing map icons, and degraded label rendering in both the Section 1 overview map and Section 2 cue map.

## Environment

- App: GrabVision local demo
- Date observed: 2026-04-24
- Local URL: `http://localhost:3000`
- Style endpoint used by app: `GET /api/map-style?theme=basic`
- Upstream style endpoint: `GET https://maps.grab.com/api/style.json`
- Auth mode: server-side `Authorization: Bearer <GRABMAPS_API_KEY>`

## Reproduction

1. Start the local app.
2. Open `http://localhost:3000`.
3. Load the Furama City Centre to Maxwell Food Centre demo route.
4. Inspect browser console warnings or call the proxied resources directly:

```bash
curl -sS -o /tmp/glyph-status.txt -w '%{http_code}\n' \
  'http://localhost:3000/api/grabmaps/tiles/v2/fonts/Noto%20Sans%20Medium/2304-2559.pbf'

curl -sS -o /tmp/sprite-json.txt -w '%{http_code}\n' \
  'http://localhost:3000/api/grabmaps/tiles/v2/styles/urban-light/sprite.json'

curl -sS -o /tmp/sprite-png.txt -w '%{http_code}\n' \
  'http://localhost:3000/api/grabmaps/tiles/v2/styles/urban-light/sprite.png'
```

## Actual Result

The style JSON returns `200`, but the referenced resources return `503` with body:

```text
no healthy upstream
```

Browser console examples:

```text
Image "street_11" could not be loaded. Please make sure you have added the image with map.addImage() or a "sprite" property in your style.
Unable to load glyph range 9, 2304-2559. Rendering codepoint U+0989 locally instead. Error: AJAXError: Service Unavailable (503)
```

## Expected Result

All sprite and glyph resources referenced by the returned GrabMaps style should be available with the same authenticated access pattern as the style and vector tiles.

## Impact

- Map icons can be missing.
- Non-Latin glyph ranges can fail and fall back locally.
- The demo can still draw route overlays, but the basemap looks incomplete and less production-ready.

## Notes

The app proxies style resources through `/api/grabmaps/[...path]`, preserving the server-side GrabMaps bearer token. The failing proxied paths map to upstream `https://maps.grab.com/api/maps/...` resources.

## Retest: 2026-04-24 14:37 SGT

Status: **not currently reproducible**.

Direct upstream retest with the local `.env` GrabMaps API key:

```text
GET https://maps.grab.com/api/maps/tiles/v2/styles/urban-light/sprite.json
HTTP 200
Content-Type: application/json
Size: 13720 bytes

GET https://maps.grab.com/api/maps/tiles/v2/fonts/Noto%20Sans%20Medium/2304-2559.pbf
HTTP 200
Content-Type: binary/octet-stream
Size: 101794 bytes
```

Local proxy retest in the in-app browser:

```text
GET http://localhost:3000/api/grabmaps/tiles/v2/styles/urban-light/sprite.json
HTTP 200
Returned valid sprite JSON
```

The browser refused direct top-level navigation to the proxied binary PBF URL with `net::ERR_ABORTED`, so the proxied glyph path was not conclusively verified through the browser. The direct upstream glyph resource is now healthy.

Conclusion: the previously observed sprite/glyph upstream 503 appears resolved at the time of this retest.
