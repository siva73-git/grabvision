"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import maplibregl, { GeoJSONSource, Map } from "maplibre-gl";
import { NavigationRoute, NavStep } from "@/lib/navigation";

const MAP_WIDTH = 900;
const MAP_HEIGHT = 420;

type RouteMapProps = {
  route: NavigationRoute;
  currentStep: NavStep;
  previewing: boolean;
  onCollapse: () => void;
};

export default function RouteMap({ route, currentStep, previewing, onCollapse }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const currentStepRef = useRef(currentStep);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [showFallbackSketch, setShowFallbackSketch] = useState(false);
  const viewport = getStaticMapViewport(route.route_geometry);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) setShowFallbackSketch(true);
    }, 1400);

    async function initMap() {
      setMapFailed(false);
      setShowFallbackSketch(false);
      const style = await fetch("/api/map-style?theme=basic").then((response) => {
        if (!response.ok) throw new Error("GrabMaps style unavailable");
        return response.json();
      });

      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [route.origin.coordinate.lng, route.origin.coordinate.lat],
        zoom: 16,
        pitch: 0,
        bearing: 0,
        attributionControl: { compact: true },
      });

      mapRef.current = map;
      map.on("styleimagemissing", (event) => {
        if (map.hasImage(event.id)) return;
        map.addImage(event.id, {
          width: 1,
          height: 1,
          data: new Uint8Array(4),
        });
      });
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      requestAnimationFrame(() => map.resize());

      const setupRouteLayers = () => {
        if (cancelled) return;
        map.resize();

        addOrUpdateSource(map, "route", routeLine(route.route_geometry));
        addOrUpdateSource(map, "route-cues", cueCollection(route.steps));
        addOrUpdateSource(map, "current-cue", cueFeature(route.steps[0] ?? currentStepRef.current));
        addOrUpdateSource(map, "route-endpoints", endpointCollection(route));

        if (!map.getLayer("route-shadow")) {
          map.addLayer({
            id: "route-shadow",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#ffffff",
              "line-opacity": 0.95,
              "line-width": 13,
            },
          });
        }

        if (!map.getLayer("route-line")) {
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#1677ff",
              "line-width": 7,
            },
          });
        }

        if (!map.getLayer("route-cue-dots")) {
          map.addLayer({
            id: "route-cue-dots",
            type: "circle",
            source: "route-cues",
            paint: {
              "circle-radius": 4,
              "circle-color": "#ffffff",
              "circle-stroke-color": "#1677ff",
              "circle-stroke-width": 2,
            },
          });
        }

        if (!map.getLayer("current-cue-dot")) {
          map.addLayer({
            id: "current-cue-dot",
            type: "circle",
            source: "current-cue",
            paint: {
              "circle-radius": 7,
              "circle-color": "#00B14F",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3,
            },
          });
        }

        if (!map.getLayer("endpoint-dots")) {
          map.addLayer({
            id: "endpoint-dots",
            type: "circle",
            source: "route-endpoints",
            paint: {
              "circle-radius": 8,
              "circle-color": ["get", "color"],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3,
            },
          });
        }

        map.fitBounds(routeBounds(route.route_geometry), {
          padding: { top: 36, right: 40, bottom: 70, left: 40 },
          duration: 0,
          pitch: 0,
          bearing: 0,
        });
        setMapReady(true);
        setShowFallbackSketch(false);
      };

      if (map.loaded() && map.isStyleLoaded()) {
        setupRouteLayers();
      } else {
        map.once("load", setupRouteLayers);
      }

      map.on("error", (event) => {
        console.error(event.error);
      });

      return () => resizeObserver.disconnect();
    }

    let cleanup: (() => void) | undefined;

    initMap()
      .then((dispose) => {
        cleanup = dispose;
      })
      .catch((error) => {
        console.error(error);
        mapRef.current = null;
        setMapReady(false);
        setMapFailed(true);
        setShowFallbackSketch(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      cleanup?.();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentSource = map.getSource("current-cue");
    if (currentSource && "setData" in currentSource) {
      (currentSource as GeoJSONSource).setData(cueFeature(currentStep));
    }

    const center = currentStep.landmark.coordinate ?? currentStep.coordinate;
    if (previewing) {
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: 17,
        pitch: 0,
        bearing: 0,
        duration: 1800,
        essential: true,
      });
      return;
    }

    map.fitBounds(routeBounds(route.route_geometry), {
      padding: { top: 36, right: 40, bottom: 70, left: 40 },
      duration: 600,
      pitch: 0,
      bearing: 0,
    });
  }, [currentStep, mapReady, previewing, route.route_geometry]);

  return (
    <div className="relative h-full min-h-[190px] overflow-hidden bg-[#e8f5ee]">
      <div ref={containerRef} className="absolute inset-0" />
      <GoogleStaticBasemap route={route} currentStep={currentStep} viewport={viewport} />
      <RouteSketch
        route={route}
        currentStep={currentStep}
        viewport={viewport}
        isFallback={mapFailed || (!mapReady && showFallbackSketch)}
      />
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-full bg-white/95 px-2 py-2 text-xs font-black text-[#0b1f17] shadow-sm backdrop-blur">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0b1f17] text-white">
          N
        </span>
        <span className="pr-1">Overhead map</span>
        <button
          type="button"
          onClick={onCollapse}
          className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f5f2]"
          aria-label="Collapse overhead map"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      <div
        className="pointer-events-none absolute bottom-24 right-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/95 text-[#1677ff] shadow-sm transition-transform duration-500"
        style={{ transform: `rotate(${currentStep.target_bearing}deg)` }}
        aria-hidden="true"
      >
        <span className="text-2xl leading-none">↑</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent" />
    </div>
  );
}

function addOrUpdateSource(map: Map, id: string, data: GeoJSON.Feature | GeoJSON.FeatureCollection) {
  const source = map.getSource(id);
  if (source && "setData" in source) {
    (source as GeoJSONSource).setData(data);
    return;
  }

  map.addSource(id, {
    type: "geojson",
    data,
  });
}

function cueCollection(steps: NavStep[]) {
  return {
    type: "FeatureCollection" as const,
    features: steps.map(cueFeature),
  };
}

function cueFeature(step: NavStep) {
  const coordinate = step.landmark.coordinate ?? step.coordinate;

  return {
    type: "Feature" as const,
    properties: {
      step_index: step.step_index,
      instruction: step.instruction,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [coordinate.lng, coordinate.lat],
    },
  };
}

function endpointCollection(route: NavigationRoute) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { color: "#00B14F" },
        geometry: {
          type: "Point" as const,
          coordinates: [route.origin.coordinate.lng, route.origin.coordinate.lat],
        },
      },
      {
        type: "Feature" as const,
        properties: { color: "#ffb000" },
        geometry: {
          type: "Point" as const,
          coordinates: [route.destination.coordinate.lng, route.destination.coordinate.lat],
        },
      },
    ],
  };
}

function routeLine(coordinates: [number, number][]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
}

function routeBounds(coordinates: [number, number][]) {
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ] as [[number, number], [number, number]];
}

type StaticMapViewport = {
  center: { lat: number; lng: number };
  zoom: number;
};

function GoogleStaticBasemap({
  route,
  currentStep,
  viewport,
}: {
  route: NavigationRoute;
  currentStep: NavStep;
  viewport: StaticMapViewport;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const current = currentStep.landmark.coordinate ?? currentStep.coordinate;
  const params = new URLSearchParams({
    path: route.route_geometry.map(([lng, lat]) => `${lng},${lat}`).join(";"),
    center: `${viewport.center.lat},${viewport.center.lng}`,
    zoom: String(viewport.zoom),
    origin: `${route.origin.coordinate.lat},${route.origin.coordinate.lng}`,
    destination: `${route.destination.coordinate.lat},${route.destination.coordinate.lng}`,
    current: `${current.lat},${current.lng}`,
  });

  if (imageFailed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/google-static-map?${params.toString()}`}
      alt="Top-down walking route basemap"
      className="absolute inset-0 z-[1] h-full w-full object-fill"
      onError={() => setImageFailed(true)}
    />
  );
}

function RouteSketch({
  route,
  currentStep,
  viewport,
  isFallback,
}: {
  route: NavigationRoute;
  currentStep: NavStep;
  viewport: StaticMapViewport;
  isFallback: boolean;
}) {
  const projectedRoute = projectCoordinates(route.route_geometry, viewport);
  const currentPoint = projectCoordinate(
    [
      (currentStep.landmark.coordinate ?? currentStep.coordinate).lng,
      (currentStep.landmark.coordinate ?? currentStep.coordinate).lat,
    ],
    viewport,
  );
  const cuePoints = route.steps.map((step) => {
    const coordinate = step.landmark.coordinate ?? step.coordinate;
    return {
      key: step.step_index,
      point: projectCoordinate([coordinate.lng, coordinate.lat], viewport),
      active: step.step_index === currentStep.step_index,
    };
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={projectedRoute.path} fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" opacity={isFallback ? 1 : 0.95} />
      <path d={projectedRoute.path} fill="none" stroke="#1677ff" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      {cuePoints.map(({ key, point, active }) => (
        <circle
          key={key}
          cx={point.x}
          cy={point.y}
          r={active ? 10 : 6}
          fill={active ? "#00B14F" : "#ffffff"}
          stroke={active ? "#ffffff" : "#1677ff"}
          strokeWidth="4"
        />
      ))}
      <circle cx={projectedRoute.start.x} cy={projectedRoute.start.y} r="11" fill="#00B14F" stroke="#ffffff" strokeWidth="4" />
      <circle cx={projectedRoute.end.x} cy={projectedRoute.end.y} r="11" fill="#ffb000" stroke="#ffffff" strokeWidth="4" />
      <g transform={`translate(${currentPoint.x} ${currentPoint.y}) rotate(${currentStep.target_bearing})`}>
        <path d="M 0 -24 L 15 16 L 0 8 L -15 16 Z" fill="#0b1f17" stroke="#ffffff" strokeWidth="4" />
      </g>
    </svg>
  );
}

function projectCoordinates(coordinates: [number, number][], viewport: StaticMapViewport) {
  const points = coordinates.map((coordinate) => projectCoordinate(coordinate, viewport));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return {
    path,
    start: points[0] ?? { x: 80, y: 80 },
    end: points.at(-1) ?? { x: 820, y: 340 },
  };
}

function getStaticMapViewport(coordinates: [number, number][]): StaticMapViewport {
  const points = coordinates.map(([lng, lat]) => mercatorPoint(lng, lat));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const center = latLngFromMercator((minX + maxX) / 2, (minY + maxY) / 2);
  const zoomX = Math.log2((MAP_WIDTH - 170) / Math.max((maxX - minX) * 256, 0.000001));
  const zoomY = Math.log2((MAP_HEIGHT - 120) / Math.max((maxY - minY) * 256, 0.000001));
  const zoom = Math.max(0, Math.min(20, Math.floor(Math.min(zoomX, zoomY))));

  return { center, zoom };
}

function projectCoordinate(
  [lng, lat]: [number, number],
  viewport: StaticMapViewport,
) {
  const point = mercatorPoint(lng, lat);
  const center = mercatorPoint(viewport.center.lng, viewport.center.lat);
  const worldSize = 256 * 2 ** viewport.zoom;

  return {
    x: (point.x - center.x) * worldSize + MAP_WIDTH / 2,
    y: (point.y - center.y) * worldSize + MAP_HEIGHT / 2,
  };
}

function mercatorPoint(lng: number, lat: number) {
  const clampedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI),
  };
}

function latLngFromMercator(x: number, y: number) {
  const lng = x * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

  return { lat, lng };
}
