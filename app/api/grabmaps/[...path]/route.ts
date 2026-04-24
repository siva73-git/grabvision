import { NextRequest } from "next/server";
import {
  grabMapsCacheKey,
  readGrabMapsCache,
  writeGrabMapsCache,
} from "@/lib/grabmaps-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const apiKey = process.env.GRABMAPS_API_KEY ?? process.env.NEXT_PUBLIC_GRABMAPS_API_KEY;
  const { path } = await context.params;

  const upstream = new URL(`https://maps.grab.com/api/maps/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });
  const cacheKey = grabMapsCacheKey(upstream);

  if (!apiKey) {
    const cached = await readGrabMapsCache(cacheKey);
    if (cached) return cachedResponse(cached);
    return new Response("Missing GRABMAPS_API_KEY", { status: 500 });
  }

  try {
    const response = await fetch(upstream, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer());
      const entry = {
        body,
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        status: response.status,
      };
      await writeGrabMapsCache(cacheKey, entry);
      return cachedResponse(entry, "MISS");
    }
  } catch {
    // Network errors fall through to stale cache.
  }

  const cached = await readGrabMapsCache(cacheKey);
  if (cached) return cachedResponse(cached, "STALE");

  return new Response("GrabMaps upstream unavailable and no cached copy exists", { status: 503 });
}

function cachedResponse(
  entry: { body: Buffer; contentType: string; status: number },
  cacheStatus = "HIT",
) {
  return new Response(new Uint8Array(entry.body), {
    status: entry.status,
    headers: {
      "Content-Type": entry.contentType,
      "Cache-Control": "public, max-age=86400",
      "X-GrabMaps-Cache": cacheStatus,
    },
  });
}
