import { NextRequest } from "next/server";
import {
  bearingBetween,
  Coordinate,
  DEMO_DESTINATION,
  DEMO_ORIGIN,
  DEMO_ROUTE,
  formatDistance,
  formatDuration,
  NavigationRoute,
  NavStep,
} from "@/lib/navigation";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type NavigationRequest = {
  origin?: Partial<typeof DEMO_ORIGIN>;
  destination?: Partial<typeof DEMO_DESTINATION>;
  demo?: boolean;
};

type RawStep = {
  instruction?: string;
  maneuver?: {
    instruction?: string;
    location?: [number, number] | { lat?: number; lng?: number; latitude?: number; longitude?: number };
    modifier?: string;
    type?: string;
    bearing_after?: number;
  };
  distance?: number;
  duration?: number;
  geometry?: { coordinates?: [number, number][] } | [number, number][];
  location?: [number, number];
  name?: string;
};

const BRAND_KEYWORDS = [
  "Furama City Centre",
  "Maxwell Food Centre",
  "People's Park Centre",
  "Chinatown MRT",
  "Pagoda Street",
  "Trengganu Street",
  "Ann Siang Road",
  "CPF Maxwell",
  "Starbucks",
  "7-Eleven",
  "OCBC",
  "UOB",
  "DBS",
  "Robinson Road",
  "Raffles Place",
];

const CURATED_IMAGES: Record<string, string> = {
  capitaspring:
    "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1400&auto=format&fit=crop",
  "maxwell food centre":
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1400&auto=format&fit=crop",
  furama:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1400&auto=format&fit=crop",
  chinatown:
    "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1400&auto=format&fit=crop",
  mrt: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1400&auto=format&fit=crop",
  default:
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1400&auto=format&fit=crop",
};

export async function GET() {
  return Response.json(DEMO_ROUTE);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as NavigationRequest;

  if (body.demo) {
    return Response.json(DEMO_ROUTE);
  }

  const origin = normalizeEndpoint(body.origin, DEMO_ORIGIN);
  const destination = normalizeEndpoint(body.destination, DEMO_DESTINATION);

  try {
    const liveRoute = await buildLiveRoute(origin, destination);
    return Response.json(liveRoute);
  } catch (error) {
    console.error("Navigation API fell back to demo route", error);
    return Response.json({
      ...DEMO_ROUTE,
      source: "fallback",
      summary: {
        ...DEMO_ROUTE.summary,
        confidence_text: "Live route unavailable; showing curated downtown demo",
      },
      steps: DEMO_ROUTE.steps.map((step) => ({ ...step, source: "fallback" })),
    } satisfies NavigationRoute);
  }
}

function normalizeEndpoint(
  endpoint: NavigationRequest["origin"],
  fallback: typeof DEMO_ORIGIN,
) {
  const lat = Number(endpoint?.coordinate?.lat);
  const lng = Number(endpoint?.coordinate?.lng);

  return {
    label: endpoint?.label || fallback.label,
    coordinate:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : fallback.coordinate,
  };
}

async function buildLiveRoute(
  origin: typeof DEMO_ORIGIN,
  destination: typeof DEMO_DESTINATION,
): Promise<NavigationRoute> {
  const grabKey = process.env.GRABMAPS_API_KEY ?? process.env.NEXT_PUBLIC_GRABMAPS_API_KEY;

  if (!grabKey) {
    throw new Error("Missing GRABMAPS_API_KEY");
  }

  const direction = await fetchGrabRoute(origin.coordinate, destination.coordinate, grabKey);
  const rawSteps = extractSteps(direction);
  const routeGeometry = extractGeometry(direction, origin.coordinate, destination.coordinate);
  const totalDistance = Number(direction?.routes?.[0]?.distance ?? sum(rawSteps, "distance"));
  const totalDuration = Number(direction?.routes?.[0]?.duration ?? sum(rawSteps, "duration"));

  const usableSteps =
    rawSteps.length > 0
      ? rawSteps
      : createGeometryRawSteps(routeGeometry, totalDuration);
  const steps = await Promise.all(
    usableSteps.map((step, index) =>
      enrichStep(step, index, usableSteps.length, grabKey, totalDuration),
    ),
  );

  return {
    source: "live",
    route_name: `${origin.label} to ${destination.label}`,
    origin,
    destination,
    summary: {
      distance_text: formatDistance(totalDistance),
      duration_text: formatDuration(totalDuration),
      confidence_text: "Live GrabMaps route enriched with nearby landmarks",
    },
    route_geometry: routeGeometry,
    steps,
  };
}

async function fetchGrabRoute(origin: Coordinate, destination: Coordinate, apiKey: string) {
  const navigation = await fetchGrabNavigation(origin, destination, apiKey);
  if (navigation) return navigation;
  return fetchGrabDirection(origin, destination, apiKey);
}

async function fetchGrabNavigation(origin: Coordinate, destination: Coordinate, apiKey: string) {
  const request = new URL("https://maps.grab.com/api/v1/maps/eta/v1/navigation");
  request.searchParams.set("requestID", `grabvision-${Date.now()}`);
  request.searchParams.append("coordinates", `${origin.lng},${origin.lat}`);
  request.searchParams.append("coordinates", `${destination.lng},${destination.lat}`);
  request.searchParams.set("profile", "walking");
  request.searchParams.set("overview", "full");

  const response = await fetch(request, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) return undefined;

  const data = await response.json();
  const code = String(asRecord(data)?.code ?? "").toLowerCase();
  return code === "ok" ? data : undefined;
}

async function fetchGrabDirection(origin: Coordinate, destination: Coordinate, apiKey: string) {
  const request = new URL("https://maps.grab.com/api/v1/maps/eta/v1/direction");
  request.searchParams.append("coordinates", `${origin.lng},${origin.lat}`);
  request.searchParams.append("coordinates", `${destination.lng},${destination.lat}`);
  request.searchParams.set("profile", "walking");
  request.searchParams.set("overview", "full");

  const response = await fetch(request, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Grab walking directions failed: ${response.status}`);
  }

  return response.json();
}

function extractSteps(direction: JsonRecord): RawStep[] {
  const legs = firstRoute(direction)?.legs;
  if (!Array.isArray(legs)) return [];

  return legs.flatMap((leg) => {
    const steps = asRecord(leg)?.steps;
    return Array.isArray(steps) ? (steps as RawStep[]) : [];
  });
}

function extractGeometry(direction: JsonRecord, origin: Coordinate, destination: Coordinate): [number, number][] {
  const route = firstRoute(direction);
  const geometry = route?.geometry;
  const coordinates = asRecord(geometry)?.coordinates ?? geometry;

  if (typeof coordinates === "string") {
    return decodePolyline(coordinates, 6);
  }

  if (Array.isArray(coordinates) && coordinates.length > 0) {
    return coordinates
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map((point) => [Number(point[0]), Number(point[1])] as [number, number]);
  }

  return [
    [origin.lng, origin.lat],
    [destination.lng, destination.lat],
  ];
}

function createGeometryRawSteps(geometry: [number, number][], totalDuration: number): RawStep[] {
  const samples = sampleRouteGeometry(geometry, 25, 28);
  const fallbackDuration = totalDuration / Math.max(samples.length, 1);

  return samples.map((sample, index) => {
    const next = samples[index + 1] ?? sample;
    return {
      instruction:
        index === 0
          ? "Start walking from this point"
          : index === samples.length - 1
            ? "Arrive at your destination"
            : "Continue to the next visible landmark",
      distance: sample.distanceToNext || 55,
      duration: fallbackDuration,
      location: sample.point,
      maneuver: {
        bearing_after: bearingBetween(
          { lng: sample.point[0], lat: sample.point[1] },
          { lng: next.point[0], lat: next.point[1] },
        ),
      },
      geometry: [sample.point, next.point],
    };
  });
}

async function enrichStep(
  rawStep: RawStep,
  index: number,
  totalSteps: number,
  grabKey: string,
  totalDuration: number,
): Promise<NavStep> {
  const coordinate = extractStepCoordinate(rawStep, DEMO_ROUTE.steps[index]?.coordinate ?? DEMO_ORIGIN.coordinate);
  const nextPoint = extractStepGeometry(rawStep)?.at(-1);
  const nextCoordinate = nextPoint
    ? { lng: nextPoint[0], lat: nextPoint[1] }
    : DEMO_ROUTE.steps[index + 1]?.coordinate ?? DEMO_ROUTE.destination.coordinate;
  const targetBearing =
    Number(rawStep.maneuver?.bearing_after) || bearingBetween(coordinate, nextCoordinate);
  const distance = Number(rawStep.distance ?? DEMO_ROUTE.steps[index]?.distance_text.replace("m", ""));
  const duration = Number(rawStep.duration ?? DEMO_ROUTE.steps[index]?.duration_seconds ?? 90);
  const landmark = await findBestLandmark(coordinate, rawStep, grabKey, index);
  const etaSeconds = Math.max(60, totalDuration - index * (totalDuration / Math.max(totalSteps, 1)));

  return {
    step_index: index + 1,
    instruction: humanizeInstruction(rawStep, landmark.name, index, totalSteps),
    distance_text: formatDistance(distance),
    duration_seconds: duration,
    target_bearing: targetBearing,
    coordinate,
    segment_geometry: extractStepGeometry(rawStep),
    landmark,
    action_icon: getActionIcon(rawStep, index, totalSteps),
    is_junction: index > 0 && index < totalSteps - 1,
    eta_remaining: formatDuration(etaSeconds),
    source: "live",
  };
}

function extractStepCoordinate(rawStep: RawStep, fallback: Coordinate): Coordinate {
  const location = rawStep.maneuver?.location ?? rawStep.location;
  if (Array.isArray(location)) {
    return { lng: Number(location[0]), lat: Number(location[1]) };
  }

  if (location && typeof location === "object") {
    return {
      lat: Number(location.lat ?? location.latitude ?? fallback.lat),
      lng: Number(location.lng ?? location.longitude ?? fallback.lng),
    };
  }

  return fallback;
}

function extractStepGeometry(rawStep: RawStep): [number, number][] | undefined {
  const geometry = Array.isArray(rawStep.geometry)
    ? rawStep.geometry
    : rawStep.geometry?.coordinates;

  return Array.isArray(geometry) ? geometry : undefined;
}

async function findBestLandmark(
  coordinate: Coordinate,
  rawStep: RawStep,
  grabKey: string,
  index: number,
): Promise<NavStep["landmark"]> {
  const nearbyLandmark = await searchGrabNearby(coordinate, grabKey);
  if (nearbyLandmark) return nearbyLandmark;

  const grabLandmark = await searchGrabPoi(coordinate, rawStep, grabKey);
  if (grabLandmark?.image_url) return grabLandmark;

  const googleLandmark = await searchGooglePlace(coordinate, rawStep);
  if (googleLandmark?.image_url) return googleLandmark;

  return {
    ...DEMO_ROUTE.steps[index % DEMO_ROUTE.steps.length].landmark,
    provider: "curated",
  };
}

async function searchGrabNearby(coordinate: Coordinate, apiKey: string) {
  const request = new URL("https://maps.grab.com/api/v1/maps/place/v2/nearby");
  request.searchParams.set("location", `${coordinate.lat},${coordinate.lng}`);
  request.searchParams.set("radius", "0.12");
  request.searchParams.set("limit", "12");
  request.searchParams.set("rankBy", "distance");

  try {
    const response = await fetch(request, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const data = asRecord(await response.json());
    const places = data?.places;
    const place = Array.isArray(places) ? rankPlaces(places.filter(isRecord))?.[0] : undefined;
    if (!place) return undefined;

    const name = String(place.name ?? "Nearby GrabMaps POI");
    return {
      name,
      category: grabCategoryLabel(place),
      image_url: curatedImageFor(name),
      provider: "grab" as const,
      coordinate: parsePlaceCoordinate(place),
      place_id: String(place.poi_id ?? place.place_id ?? place.id ?? ""),
      confidence: scorePlace(place),
    };
  } catch {
    return undefined;
  }
}

async function searchGrabPoi(coordinate: Coordinate, rawStep: RawStep, apiKey: string) {
  const keyword = pickKeyword(rawStep);
  const request = new URL("https://maps.grab.com/api/v1/maps/poi/v1/search");
  request.searchParams.set("keyword", keyword);
  request.searchParams.set("country", "SGP");
  request.searchParams.set("location", `${coordinate.lat},${coordinate.lng}`);
  request.searchParams.set("limit", "8");

  try {
    const response = await fetch(request, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    const dataRecord = asRecord(data);
    const places = dataRecord?.places ?? dataRecord?.results ?? dataRecord?.data ?? [];
    const place = Array.isArray(places) ? rankPlaces(places.filter(isRecord))?.[0] : undefined;
    if (!place) return undefined;

    const name = String(place.name ?? place.title ?? keyword);
    return {
      name,
      category: String(place.category ?? place.type ?? "Landmark"),
      image_url: String(place.image_url ?? place.imageUrl ?? place.photo_url ?? ""),
      provider: "grab" as const,
      coordinate: parsePlaceCoordinate(place),
      place_id: String(place.place_id ?? place.id ?? ""),
      confidence: scorePlace(place),
    };
  } catch {
    return undefined;
  }
}

async function searchGooglePlace(coordinate: Coordinate, rawStep: RawStep) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return undefined;

  const request = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  request.searchParams.set("key", key);
  request.searchParams.set("location", `${coordinate.lat},${coordinate.lng}`);
  request.searchParams.set("radius", "180");
  request.searchParams.set("keyword", pickKeyword(rawStep));

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) return undefined;
    const data = await response.json();
    const dataRecord = asRecord(data);
    const results = dataRecord?.results;
    const places = Array.isArray(results) ? rankPlaces(results.filter(isRecord)) : [];
    const place = places[0];
    if (!place) return undefined;
    const photos = Array.isArray(place.photos) ? place.photos.filter(isRecord) : [];
    const photoRef =
      typeof photos[0]?.photo_reference === "string" ? photos[0].photo_reference : "";

    return {
      name: String(place.name ?? "Nearby landmark"),
      category: firstTypeLabel(place.types),
      image_url: photoRef
        ? `/api/place-photo?ref=${encodeURIComponent(photoRef)}`
        : curatedImageFor(String(place.name ?? "")),
      provider: "google" as const,
      coordinate: parsePlaceCoordinate(place),
      place_id: String(place.place_id ?? ""),
      confidence: scorePlace(place),
    };
  } catch {
    return undefined;
  }
}

function pickKeyword(rawStep: RawStep) {
  const instruction = String(rawStep.instruction ?? rawStep.maneuver?.instruction ?? rawStep.name ?? "");
  const exact = BRAND_KEYWORDS.find((brand) =>
    instruction.toLowerCase().includes(brand.toLowerCase()),
  );

  return exact ?? "landmark MRT food office";
}

function rankPlaces(places: JsonRecord[]) {
  return [...places].sort((a, b) => scorePlace(b) - scorePlace(a));
}

function scorePlace(place: JsonRecord) {
  const name = String(place.name ?? place.title ?? "").toLowerCase();
  const types = Array.isArray(place.types) ? place.types.join(" ") : "";
  const typeText = String(place.category ?? place.type ?? types).toLowerCase();
  let score = Number(place.rating ?? 0) * 0.05;

  for (const brand of BRAND_KEYWORDS) {
    if (name.includes(brand.toLowerCase())) score += 1.5;
  }

  if (typeText.includes("transit") || typeText.includes("subway")) score += 1.2;
  if (typeText.includes("restaurant") || typeText.includes("food")) score += 0.8;
  if (typeText.includes("store") || typeText.includes("bank")) score += 0.6;
  if ((Array.isArray(place.photos) && place.photos.length > 0) || place.image_url || place.imageUrl) score += 1;

  return Number(score.toFixed(2));
}

function parsePlaceCoordinate(place: JsonRecord): Coordinate | undefined {
  const geometry = asRecord(place.geometry);
  const location = asRecord(geometry?.location ?? place.location ?? place.coordinate);
  const lat = Number(location?.lat ?? location?.latitude);
  const lng = Number(location?.lng ?? location?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

function grabCategoryLabel(place: JsonRecord) {
  const categories = place.categories;
  if (Array.isArray(categories)) {
    const first = categories.map(asRecord).find(Boolean);
    const category = String(first?.category_name ?? "");
    if (category) return category.split("::").at(-1) ?? category;
  }

  return String(place.business_type ?? place.place_type ?? "GrabMaps POI");
}

function decodePolyline(encoded: string, precision: number): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = 10 ** precision;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

function sampleRouteGeometry(
  geometry: [number, number][],
  spacingMeters: number,
  turnThresholdDegrees: number,
) {
  if (geometry.length <= 2) {
    return geometry.map((point) => ({ point, distanceToNext: 0 }));
  }

  const samples: Array<{ point: [number, number]; distanceToNext: number }> = [
    { point: geometry[0], distanceToNext: 0 },
  ];
  let distanceSinceLast = 0;
  let lastBearing = bearingBetween(
    { lng: geometry[0][0], lat: geometry[0][1] },
    { lng: geometry[1][0], lat: geometry[1][1] },
  );

  for (let index = 1; index < geometry.length; index += 1) {
    let previous = geometry[index - 1];
    const current = geometry[index];
    let segmentDistance = distanceMeters(previous, current);
    const currentBearing = bearingBetween(
      { lng: previous[0], lat: previous[1] },
      { lng: current[0], lat: current[1] },
    );
    const turnDelta = bearingDelta(lastBearing, currentBearing);
    const shouldCueTurn =
      index > 1 &&
      turnDelta >= turnThresholdDegrees &&
      distanceSinceLast >= spacingMeters * 0.35 &&
      distanceMeters(samples[samples.length - 1].point, previous) >= spacingMeters * 0.35;

    if (shouldCueTurn) {
      samples[samples.length - 1].distanceToNext = distanceSinceLast;
      samples.push({ point: previous, distanceToNext: 0 });
      distanceSinceLast = 0;
    }

    while (distanceSinceLast + segmentDistance >= spacingMeters) {
      const remaining = spacingMeters - distanceSinceLast;
      const ratio = segmentDistance === 0 ? 0 : remaining / segmentDistance;
      const interpolated: [number, number] = [
        previous[0] + (current[0] - previous[0]) * ratio,
        previous[1] + (current[1] - previous[1]) * ratio,
      ];

      samples[samples.length - 1].distanceToNext = spacingMeters;
      samples.push({ point: interpolated, distanceToNext: 0 });
      previous = interpolated;
      segmentDistance = distanceMeters(previous, current);
      distanceSinceLast = 0;
    }

    distanceSinceLast += segmentDistance;
    lastBearing = currentBearing;
  }

  const last = geometry[geometry.length - 1];
  const currentLast = samples[samples.length - 1].point;
  if (currentLast[0] !== last[0] || currentLast[1] !== last[1]) {
    samples[samples.length - 1].distanceToNext = distanceSinceLast;
    samples.push({ point: last, distanceToNext: 0 });
  }

  return samples;
}

function bearingDelta(a: number, b: number) {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

function distanceMeters(from: [number, number], to: [number, number]) {
  const earthRadius = 6371000;
  const toRad = Math.PI / 180;
  const lat1 = from[1] * toRad;
  const lat2 = to[1] * toRad;
  const deltaLat = (to[1] - from[1]) * toRad;
  const deltaLng = (to[0] - from[0]) * toRad;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function firstRoute(direction: JsonRecord): JsonRecord | undefined {
  const routes = direction.routes;
  return Array.isArray(routes) ? asRecord(routes[0]) : undefined;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" ? (value as JsonRecord) : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(asRecord(value));
}

function firstTypeLabel(types: unknown) {
  if (!Array.isArray(types)) return "Landmark";
  const first = types.find((type) => typeof type === "string");
  return typeof first === "string" ? first.replaceAll("_", " ") : "Landmark";
}

function curatedImageFor(name: string) {
  const key = Object.keys(CURATED_IMAGES).find((candidate) =>
    name.toLowerCase().includes(candidate),
  );
  return CURATED_IMAGES[key ?? "default"];
}

function humanizeInstruction(rawStep: RawStep, landmarkName: string, index: number, totalSteps: number) {
  if (index === 0) return `Start toward ${landmarkName}`;
  if (index === totalSteps - 1) return `Arrive near ${landmarkName}`;

  const instruction = rawStep.instruction ?? rawStep.maneuver?.instruction;
  if (instruction) return `${instruction.replace(/<[^>]+>/g, "")} by ${landmarkName}`;

  return `Continue past ${landmarkName}`;
}

function getActionIcon(rawStep: RawStep, index: number, totalSteps: number): NavStep["action_icon"] {
  if (index === 0) return "depart";
  if (index === totalSteps - 1) return "arrive";

  const text = `${rawStep.maneuver?.modifier ?? ""} ${rawStep.maneuver?.type ?? ""}`.toLowerCase();
  if (text.includes("left")) return "turn-left";
  if (text.includes("right")) return "turn-right";
  return "straight";
}

function sum(steps: RawStep[], key: "distance" | "duration") {
  return steps.reduce((total, step) => total + Number(step[key] ?? 0), 0);
}
