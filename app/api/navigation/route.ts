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
  "MRT Exit",
  "Lau Pa Sat",
  "CapitaSpring",
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
  "lau pa sat":
    "https://images.unsplash.com/photo-1542181961-9590d0c79dab?q=80&w=1400&auto=format&fit=crop",
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

  const direction = await fetchGrabDirection(origin.coordinate, destination.coordinate, grabKey);
  const rawSteps = extractSteps(direction);
  const routeGeometry = extractGeometry(direction, origin.coordinate, destination.coordinate);
  const totalDistance = Number(direction?.routes?.[0]?.distance ?? sum(rawSteps, "distance"));
  const totalDuration = Number(direction?.routes?.[0]?.duration ?? sum(rawSteps, "duration"));

  const usableSteps = rawSteps.length > 0 ? rawSteps : createFallbackRawSteps(origin.coordinate, destination.coordinate);
  const steps = await Promise.all(
    usableSteps.slice(0, 6).map((step, index) =>
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

async function fetchGrabDirection(origin: Coordinate, destination: Coordinate, apiKey: string) {
  const request = new URL("https://maps.grab.com/api/v1/maps/eta/v1/direction");
  request.searchParams.append("coordinates", `${origin.lng},${origin.lat}`);
  request.searchParams.append("coordinates", `${destination.lng},${destination.lat}`);
  request.searchParams.set("profile", "walking");
  request.searchParams.set("overview", "full");

  let response = await fetch(request, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    request.searchParams.set("profile", "driving");
    response = await fetch(request, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(`Grab directions failed: ${response.status}`);
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

function createFallbackRawSteps(origin: Coordinate, destination: Coordinate): RawStep[] {
  return [
    {
      instruction: "Start walking toward the landmark ahead",
      distance: 120,
      duration: 120,
      location: [origin.lng, origin.lat],
    },
    {
      instruction: "Continue along the main pedestrian route",
      distance: 260,
      duration: 240,
      location: [
        (origin.lng + destination.lng) / 2,
        (origin.lat + destination.lat) / 2,
      ],
    },
    {
      instruction: "Arrive at your destination",
      distance: 80,
      duration: 80,
      location: [destination.lng, destination.lat],
    },
  ];
}

async function enrichStep(
  rawStep: RawStep,
  index: number,
  totalSteps: number,
  grabKey: string,
  totalDuration: number,
): Promise<NavStep> {
  const coordinate = extractStepCoordinate(rawStep, DEMO_ROUTE.steps[index]?.coordinate ?? DEMO_ORIGIN.coordinate);
  const nextCoordinate =
    DEMO_ROUTE.steps[index + 1]?.coordinate ??
    DEMO_ROUTE.destination.coordinate;
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
  const grabLandmark = await searchGrabPoi(coordinate, rawStep, grabKey);
  if (grabLandmark?.image_url) return grabLandmark;

  const googleLandmark = await searchGooglePlace(coordinate, rawStep);
  if (googleLandmark?.image_url) return googleLandmark;

  return {
    ...DEMO_ROUTE.steps[index % DEMO_ROUTE.steps.length].landmark,
    provider: "curated",
  };
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
