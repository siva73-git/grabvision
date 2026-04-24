import {
  grabMapsCacheKey,
  readGrabMapsCache,
  writeGrabMapsCache,
} from "@/lib/grabmaps-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const apiKey = process.env.GRABMAPS_API_KEY ?? process.env.NEXT_PUBLIC_GRABMAPS_API_KEY;

  const styleUrl = new URL("https://maps.grab.com/api/style.json");
  const requestUrl = new URL(request.url);
  const mode = requestUrl.searchParams.get("mode");
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== "mode") styleUrl.searchParams.set(key, value);
  });

  const cacheKey = grabMapsCacheKey(styleUrl);
  let rawStyle: unknown | undefined;
  let cacheStatus = "MISS";

  if (apiKey) {
    try {
      const response = await fetch(styleUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const body = Buffer.from(await response.arrayBuffer());
        await writeGrabMapsCache(cacheKey, {
          body,
          contentType: response.headers.get("content-type") ?? "application/json",
          status: response.status,
        });
        rawStyle = JSON.parse(body.toString("utf8"));
      }
    } catch {
      // Network errors fall through to stale cache.
    }
  }

  if (!rawStyle) {
    const cached = await readGrabMapsCache(cacheKey);
    if (!cached) {
      return Response.json(
        { error: apiKey ? "Unable to load GrabMaps style" : "Missing GRABMAPS_API_KEY" },
        { status: apiKey ? 503 : 500 },
      );
    }
    rawStyle = JSON.parse(cached.body.toString("utf8"));
    cacheStatus = "STALE";
  }

  const style = rewriteGrabMapsUrls(rawStyle, requestUrl.origin);
  const cappedStyle = capGrabMapsVectorZoom(style);
  return Response.json(mode === "cue" ? simplifyCueStyle(cappedStyle) : cappedStyle, {
    headers: {
      "X-GrabMaps-Cache": cacheStatus,
    },
  });
}

function rewriteGrabMapsUrls(value: unknown, origin: string): unknown {
  if (typeof value === "string") {
    return value
      .replaceAll("https://maps.grab.com/api/maps", `${origin}/api/grabmaps`)
      .replaceAll("https://maps.grab.com/maps", `${origin}/api/grabmaps`);
  }

  if (Array.isArray(value)) {
    return value.map((child) => rewriteGrabMapsUrls(child, origin));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, rewriteGrabMapsUrls(child, origin)]),
    );
  }

  return value;
}

function capGrabMapsVectorZoom(style: unknown) {
  if (!style || typeof style !== "object") return style;

  const styleRecord = style as { sources?: Record<string, { type?: string; tiles?: unknown; maxzoom?: number }> };

  for (const source of Object.values(styleRecord.sources ?? {})) {
    if (source.type === "vector" && Array.isArray(source.tiles)) {
      source.maxzoom = 14;
    }
  }

  return style;
}

function simplifyCueStyle(style: unknown) {
  if (!style || typeof style !== "object") return style;

  const styleRecord = style as {
    glyphs?: string;
    fonts?: string;
    sprite?: string;
    layers?: Array<{ type?: string; id?: string }>;
  };

  delete styleRecord.glyphs;
  delete styleRecord.fonts;
  delete styleRecord.sprite;
  styleRecord.layers = (styleRecord.layers ?? []).filter((layer) => layer.type !== "symbol");

  return styleRecord;
}
