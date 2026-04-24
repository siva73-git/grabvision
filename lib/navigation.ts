export type Coordinate = {
  lat: number;
  lng: number;
};

export type LandmarkProvider = "grab" | "google" | "curated";

export type NavStep = {
  step_index: number;
  instruction: string;
  distance_text: string;
  duration_seconds: number;
  target_bearing: number;
  coordinate: Coordinate;
  segment_geometry?: [number, number][];
  landmark: {
    name: string;
    category: string;
    image_url: string;
    provider: LandmarkProvider;
    coordinate?: Coordinate;
    place_id?: string;
    confidence?: number;
  };
  action_icon: "straight" | "turn-left" | "turn-right" | "arrive" | "depart";
  is_junction: boolean;
  eta_remaining: string;
  source: "live" | "demo" | "fallback";
};

export type NavigationRoute = {
  source: "live" | "demo" | "fallback";
  route_name: string;
  origin: {
    label: string;
    coordinate: Coordinate;
  };
  destination: {
    label: string;
    coordinate: Coordinate;
  };
  summary: {
    distance_text: string;
    duration_text: string;
    confidence_text: string;
  };
  steps: NavStep[];
  route_geometry: [number, number][];
};

export const DEMO_ORIGIN = {
  label: "Raffles Place MRT Exit F",
  coordinate: { lat: 1.28392, lng: 103.8517 },
};

export const DEMO_DESTINATION = {
  label: "Lau Pa Sat Food Court",
  coordinate: { lat: 1.28056, lng: 103.85055 },
};

export const DEMO_ROUTE: NavigationRoute = {
  source: "demo",
  route_name: "Raffles Place MRT to Lau Pa Sat",
  origin: DEMO_ORIGIN,
  destination: DEMO_DESTINATION,
  summary: {
    distance_text: "650m",
    duration_text: "9 min",
    confidence_text: "Curated downtown demo with live API fallback",
  },
  route_geometry: [
    [103.8517, 1.28392],
    [103.85141, 1.2833],
    [103.8512, 1.2827],
    [103.85096, 1.28205],
    [103.85075, 1.28142],
    [103.85055, 1.28056],
  ],
  steps: [
    {
      step_index: 1,
      instruction: "Exit Raffles Place MRT and face the green CapitaSpring tower",
      distance_text: "90m",
      duration_seconds: 75,
      target_bearing: 194,
      coordinate: { lat: 1.28392, lng: 103.8517 },
      segment_geometry: [
        [103.8517, 1.28392],
        [103.85141, 1.2833],
      ],
      landmark: {
        name: "CapitaSpring",
        category: "Office tower",
        image_url:
          "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1400&auto=format&fit=crop",
        provider: "curated",
        coordinate: { lat: 1.28422, lng: 103.85131 },
        confidence: 0.92,
      },
      action_icon: "depart",
      is_junction: false,
      eta_remaining: "9 min",
      source: "demo",
    },
    {
      step_index: 2,
      instruction: "Walk down the sheltered stretch toward Robinson Road",
      distance_text: "180m",
      duration_seconds: 150,
      target_bearing: 199,
      coordinate: { lat: 1.2833, lng: 103.85141 },
      segment_geometry: [
        [103.85141, 1.2833],
        [103.8512, 1.2827],
        [103.85096, 1.28205],
      ],
      landmark: {
        name: "Raffles Place Office Arcade",
        category: "Covered walkway",
        image_url:
          "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1400&auto=format&fit=crop",
        provider: "curated",
        coordinate: { lat: 1.2828, lng: 103.85115 },
        confidence: 0.84,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "7 min",
      source: "demo",
    },
    {
      step_index: 3,
      instruction: "Keep left when the road opens up near the OCBC Centre",
      distance_text: "140m",
      duration_seconds: 115,
      target_bearing: 207,
      coordinate: { lat: 1.28205, lng: 103.85096 },
      segment_geometry: [
        [103.85096, 1.28205],
        [103.85075, 1.28142],
      ],
      landmark: {
        name: "OCBC Centre",
        category: "Bank landmark",
        image_url:
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1400&auto=format&fit=crop",
        provider: "curated",
        coordinate: { lat: 1.28423, lng: 103.84952 },
        confidence: 0.78,
      },
      action_icon: "turn-left",
      is_junction: true,
      eta_remaining: "4 min",
      source: "demo",
    },
    {
      step_index: 4,
      instruction: "Cross toward the clock tower and enter Lau Pa Sat",
      distance_text: "240m",
      duration_seconds: 190,
      target_bearing: 192,
      coordinate: { lat: 1.28142, lng: 103.85075 },
      segment_geometry: [
        [103.85075, 1.28142],
        [103.85055, 1.28056],
      ],
      landmark: {
        name: "Lau Pa Sat",
        category: "Food court",
        image_url:
          "https://images.unsplash.com/photo-1542181961-9590d0c79dab?q=80&w=1400&auto=format&fit=crop",
        provider: "curated",
        coordinate: { lat: 1.28056, lng: 103.85055 },
        confidence: 0.95,
      },
      action_icon: "arrive",
      is_junction: true,
      eta_remaining: "1 min",
      source: "demo",
    },
  ],
};

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return "Nearby";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "A few min";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export function bearingBetween(from: Coordinate, to: Coordinate) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = from.lat * toRad;
  const lat2 = to.lat * toRad;
  const deltaLng = (to.lng - from.lng) * toRad;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return Math.round(((Math.atan2(y, x) * toDeg + 360) % 360));
}
