export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const routePath = parseLngLatPath(requestUrl.searchParams.get("path"));
  const origin = parseLatLng(requestUrl.searchParams.get("origin"));
  const destination = parseLatLng(requestUrl.searchParams.get("destination"));
  const current = parseLatLng(requestUrl.searchParams.get("current"));
  const center = parseLatLng(requestUrl.searchParams.get("center"));
  const zoom = Number(requestUrl.searchParams.get("zoom"));

  if (routePath.length < 2 || !origin || !destination) {
    return Response.json({ error: "Missing route path, origin, or destination" }, { status: 400 });
  }

  const staticMapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  staticMapUrl.searchParams.set("size", "900x420");
  staticMapUrl.searchParams.set("scale", "2");
  staticMapUrl.searchParams.set("maptype", "roadmap");
  staticMapUrl.searchParams.set("language", "en");
  if (center && Number.isFinite(zoom)) {
    staticMapUrl.searchParams.set("center", `${center.lat},${center.lng}`);
    staticMapUrl.searchParams.set("zoom", String(zoom));
  }
  for (const style of GRAB_STYLE_MAP_RULES) {
    staticMapUrl.searchParams.append("style", style);
  }
  if (!center || !Number.isFinite(zoom)) {
    staticMapUrl.searchParams.append(
      "visible",
      [origin, destination, current, ...routePath]
        .filter((point): point is { lat: number; lng: number } => Boolean(point))
        .map(({ lat, lng }) => `${lat},${lng}`)
        .join("|"),
    );
  }
  staticMapUrl.searchParams.set("key", apiKey);

  const response = await fetch(staticMapUrl, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    return Response.json(
      { error: "Unable to load Google Static Maps fallback", detail: text.slice(0, 240) },
      { status: response.status },
    );
  }

  const body = await response.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

const GRAB_STYLE_MAP_RULES = [
  "feature:all|element:all|hue:0x00b14f",
  "feature:all|element:all|saturation:-55",
  "feature:all|element:all|lightness:14",
  "feature:all|element:geometry|color:0xe8f5ee",
  "feature:all|element:labels.text.fill|color:0x27483b",
  "feature:all|element:labels.text.stroke|color:0xf5fbf8",
  "feature:all|element:labels.icon|saturation:-80",
  "feature:administrative|element:geometry.stroke|color:0xbcd8ca",
  "feature:landscape|element:geometry|color:0xe9f7ef",
  "feature:landscape.man_made|element:geometry|color:0xf7fbf8",
  "feature:poi|element:geometry|color:0xd8f0e2",
  "feature:poi.business|element:labels|visibility:simplified",
  "feature:poi.park|element:geometry|color:0xaee5c5",
  "feature:poi.park|element:labels.text.fill|color:0x1d6f44",
  "feature:road|element:geometry|color:0xffffff",
  "feature:road|element:geometry.stroke|color:0xb7dcca",
  "feature:road|element:labels|visibility:on",
  "feature:road|element:labels.text.fill|color:0x123b2a",
  "feature:road|element:labels.text.stroke|color:0xffffff",
  "feature:road.local|element:labels|visibility:on",
  "feature:road.local|element:labels.text.fill|color:0x1b4a37",
  "feature:road.arterial|element:labels|visibility:on",
  "feature:road.arterial|element:labels.text.fill|color:0x0f3f2b",
  "feature:road.arterial|element:geometry|color:0xf7fff9",
  "feature:road.highway|element:geometry|color:0xc7e9d8",
  "feature:road.highway|element:geometry.stroke|color:0x80c9a6",
  "feature:road.highway|element:labels|visibility:on",
  "feature:road.highway|element:labels.text.fill|color:0x0b3b2a",
  "feature:transit|element:geometry|color:0x9ed7bd",
  "feature:transit.station|element:labels.text.fill|color:0x007a3d",
  "feature:water|element:geometry|color:0xb7e7df",
  "feature:water|element:labels.text.fill|color:0x3c7068",
];

function parseLngLatPath(value: string | null) {
  if (!value) return [];

  return value
    .split(";")
    .map((pair) => {
      const [lng, lat] = pair.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    })
    .filter((point): point is { lat: number; lng: number } => Boolean(point));
}

function parseLatLng(value: string | null) {
  if (!value) return null;

  const [lat, lng] = value.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
