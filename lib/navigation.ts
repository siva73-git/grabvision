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
    photo_query?: string;
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
  label: "Furama City Centre",
  coordinate: { lat: 1.286576914, lng: 103.844395 },
};

export const DEMO_DESTINATION = {
  label: "Maxwell Food Centre",
  coordinate: { lat: 1.2800171758814427, lng: 103.84500533776782 },
};

const ROUTE_IMAGES = {
  furama: "/demo-images/streetview/01-furama-eu-tong-sen.jpg",
  peoplesPark: "/demo-images/streetview/02-peoples-park-centre.jpg",
  chinatownMrt: "/demo-images/streetview/03-chinatown-mrt-approach.jpg",
  pagodaStreet: "/demo-images/streetview/04-pagoda-street-turn.jpg",
  pagodaShophouses: "/demo-images/streetview/05-pagoda-street-shophouses.jpg",
  trengganuStreet: "/demo-images/streetview/06-trengganu-street-turn.jpg",
  foodStreet: "/demo-images/streetview/07-trengganu-food-stalls.jpg",
  foodStreetAnnSiang: "/demo-images/streetview/08-food-street-ann-siang.jpg",
  annSiang: "/demo-images/streetview/09-ann-siang-toward-maxwell.jpg",
  maxwellRoofline: "/demo-images/streetview/maxwell-food-centre-streetview.jpg",
  cpfMaxwell: "/demo-images/streetview/11-cpf-maxwell-corner.jpg",
  maxwellArrive: "/demo-images/streetview/maxwell-food-centre-streetview.jpg",
};

function demoStep(
  step: Omit<NavStep, "landmark" | "source"> & {
    landmark: Omit<NavStep["landmark"], "provider"> & { provider?: LandmarkProvider };
  },
): NavStep {
  return {
    ...step,
    source: "demo",
    landmark: {
      ...step.landmark,
      provider: "curated",
    },
  };
}

export const DEMO_ROUTE: NavigationRoute = {
  source: "demo",
  route_name: "Furama City Centre to Maxwell Food Centre",
  origin: DEMO_ORIGIN,
  destination: DEMO_DESTINATION,
  summary: {
    distance_text: "1.1km",
    duration_text: "14 min",
    confidence_text: "Demo locked: Chinatown hotel to hawker centre with frequent landmarks",
  },
  route_geometry: [
    [103.844308, 1.286566],
    [103.844665, 1.286016],
    [103.843934, 1.285146],
    [103.843267, 1.28432],
    [103.843368, 1.283924],
    [103.843537, 1.283823],
    [103.843951, 1.282633],
    [103.844614, 1.282054],
    [103.845012, 1.281712],
    [103.845207, 1.281346],
    [103.845569, 1.280767],
    [103.845433, 1.280231],
    [103.845011, 1.280009],
  ],
  steps: [
    demoStep({
      step_index: 1,
      instruction: "Face Eu Tong Sen Street, then go straight",
      distance_text: "70m",
      duration_seconds: 35,
      target_bearing: 174,
      coordinate: { lat: 1.286566, lng: 103.844308 },
      segment_geometry: [[103.844308, 1.286566], [103.844665, 1.286016]],
      landmark: {
        name: "Furama City Centre",
        category: "Hotel lobby",
        image_url: ROUTE_IMAGES.furama,
        photo_query: "Furama City Centre Singapore hotel",
        coordinate: { lat: 1.286576914, lng: 103.844395 },
        confidence: 0.96,
      },
      action_icon: "depart",
      is_junction: false,
      eta_remaining: "14 min",
    }),
    demoStep({
      step_index: 2,
      instruction: "Go straight past People's Park Centre shops",
      distance_text: "95m",
      duration_seconds: 40,
      target_bearing: 211,
      coordinate: { lat: 1.286033, lng: 103.844653 },
      segment_geometry: [[103.844333, 1.286343], [103.844653, 1.286033]],
      landmark: {
        name: "People's Park Centre",
        category: "Shopping centre frontage",
        image_url: ROUTE_IMAGES.peoplesPark,
        photo_query: "People's Park Centre Singapore Chinatown",
        coordinate: { lat: 1.286033, lng: 103.844653 },
        confidence: 0.9,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "12 min",
    }),
    demoStep({
      step_index: 3,
      instruction: "Go straight until Chinatown MRT Exit C appears",
      distance_text: "90m",
      duration_seconds: 50,
      target_bearing: 219,
      coordinate: { lat: 1.285132, lng: 103.843862 },
      segment_geometry: [[103.844397, 1.285683], [103.843862, 1.285132]],
      landmark: {
        name: "Chinatown approach",
        category: "Transit approach",
        image_url: ROUTE_IMAGES.chinatownMrt,
        photo_query: "Chinatown Singapore New Bridge Road",
        coordinate: { lat: 1.285132, lng: 103.843862 },
        confidence: 0.84,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "11 min",
    }),
    demoStep({
      step_index: 4,
      instruction: "Turn left at Exit C onto Pagoda Street",
      distance_text: "55m",
      duration_seconds: 45,
      target_bearing: 127,
      coordinate: { lat: 1.28432, lng: 103.843267 },
      segment_geometry: [[103.843862, 1.285132], [103.843267, 1.28432]],
      landmark: {
        name: "Chinatown MRT Exit C",
        category: "Transit exit",
        image_url: ROUTE_IMAGES.chinatownMrt,
        photo_query: "Chinatown MRT Exit C Singapore",
        coordinate: { lat: 1.28432, lng: 103.843267 },
        confidence: 0.86,
      },
      action_icon: "turn-left",
      is_junction: true,
      eta_remaining: "10 min",
    }),
    demoStep({
      step_index: 5,
      instruction: "Go straight down Pagoda Street shophouses",
      distance_text: "130m",
      duration_seconds: 40,
      target_bearing: 120,
      coordinate: { lat: 1.283831, lng: 103.843525 },
      segment_geometry: [[103.843234, 1.284077], [103.843525, 1.283831]],
      landmark: {
        name: "Pagoda Street shophouses",
        category: "Chinatown street",
        image_url: ROUTE_IMAGES.pagodaStreet,
        photo_query: "Pagoda Street Singapore Chinatown",
        coordinate: { lat: 1.283831, lng: 103.843525 },
        confidence: 0.88,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "9 min",
    }),
    demoStep({
      step_index: 6,
      instruction: "Turn right at Trengganu Street toward food signs",
      distance_text: "65m",
      duration_seconds: 35,
      target_bearing: 210,
      coordinate: { lat: 1.283333, lng: 103.844351 },
      segment_geometry: [[103.844086, 1.283486], [103.844351, 1.283333]],
      landmark: {
        name: "Trengganu Street",
        category: "Food street turn",
        image_url: ROUTE_IMAGES.trengganuStreet,
        photo_query: "Trengganu Street Singapore Chinatown",
        coordinate: { lat: 1.283333, lng: 103.844351 },
        confidence: 0.88,
      },
      action_icon: "turn-right",
      is_junction: true,
      eta_remaining: "8 min",
    }),
    demoStep({
      step_index: 7,
      instruction: "Go straight down Trengganu Street stalls",
      distance_text: "140m",
      duration_seconds: 55,
      target_bearing: 210,
      coordinate: { lat: 1.282942, lng: 103.844128 },
      segment_geometry: [[103.844351, 1.283333], [103.844128, 1.282942]],
      landmark: {
        name: "Trengganu Street food stalls",
        category: "Food street",
        image_url: ROUTE_IMAGES.foodStreet,
        photo_query: "Chinatown Food Street Singapore",
        coordinate: { lat: 1.282942, lng: 103.844128 },
        confidence: 0.84,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "7 min",
    }),
    demoStep({
      step_index: 8,
      instruction: "Go straight past Food Street toward Ann Siang",
      distance_text: "110m",
      duration_seconds: 50,
      target_bearing: 120,
      coordinate: { lat: 1.282054, lng: 103.844614 },
      segment_geometry: [[103.843998, 1.282409], [103.844614, 1.282054]],
      landmark: {
        name: "Chinatown Food Street",
        category: "Street confirmation",
        image_url: ROUTE_IMAGES.foodStreetAnnSiang,
        photo_query: "Chinatown Food Street Singapore",
        coordinate: { lat: 1.282054, lng: 103.844614 },
        confidence: 0.84,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "6 min",
    }),
    demoStep({
      step_index: 9,
      instruction: "Turn right at Ann Siang Road toward Maxwell",
      distance_text: "85m",
      duration_seconds: 50,
      target_bearing: 148,
      coordinate: { lat: 1.281187, lng: 103.845356 },
      segment_geometry: [[103.845208, 1.281603], [103.845356, 1.281187]],
      landmark: {
        name: "Ann Siang Road",
        category: "Hill street turn",
        image_url: ROUTE_IMAGES.annSiang,
        photo_query: "Ann Siang Road Singapore",
        coordinate: { lat: 1.281187, lng: 103.845356 },
        confidence: 0.84,
      },
      action_icon: "turn-right",
      is_junction: true,
      eta_remaining: "4 min",
    }),
    demoStep({
      step_index: 10,
      instruction: "Go straight downhill toward Maxwell roofline",
      distance_text: "115m",
      duration_seconds: 45,
      target_bearing: 161,
      coordinate: { lat: 1.28079, lng: 103.84556 },
      segment_geometry: [[103.845356, 1.281187], [103.84556, 1.28079]],
      landmark: {
        name: "Maxwell Food Centre roofline",
        category: "Destination beacon",
        image_url: ROUTE_IMAGES.maxwellRoofline,
        photo_query: "Maxwell Food Centre Singapore",
        coordinate: { lat: 1.28079, lng: 103.84556 },
        confidence: 0.9,
      },
      action_icon: "straight",
      is_junction: false,
      eta_remaining: "3 min",
    }),
    demoStep({
      step_index: 11,
      instruction: "Turn left after CPF Maxwell",
      distance_text: "55m",
      duration_seconds: 35,
      target_bearing: 229,
      coordinate: { lat: 1.280205, lng: 103.845238 },
      segment_geometry: [[103.845679, 1.280438], [103.845238, 1.280205]],
      landmark: {
        name: "CPF Maxwell",
        category: "Final corner",
        image_url: ROUTE_IMAGES.cpfMaxwell,
        photo_query: "CPF Maxwell Singapore",
        coordinate: { lat: 1.280205, lng: 103.845238 },
        confidence: 0.95,
      },
      action_icon: "turn-left",
      is_junction: true,
      eta_remaining: "1 min",
    }),
    demoStep({
      step_index: 12,
      instruction: "Arrive: enter Maxwell Food Centre",
      distance_text: "35m",
      duration_seconds: 30,
      target_bearing: 0,
      coordinate: { lat: 1.280017, lng: 103.845005 },
      segment_geometry: [[103.845238, 1.280205], [103.845011, 1.280009]],
      landmark: {
        name: "Maxwell Food Centre",
        category: "Destination",
        image_url: ROUTE_IMAGES.maxwellArrive,
        photo_query: "Maxwell Food Centre Singapore",
        coordinate: { lat: 1.2800171758814427, lng: 103.84500533776782 },
        confidence: 0.98,
      },
      action_icon: "arrive",
      is_junction: false,
      eta_remaining: "1 min",
    }),
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
