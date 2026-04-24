"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
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
  void previewing;
  const viewport = getStaticMapViewport(route.route_geometry);

  return (
      <div className="relative h-full min-h-[190px] overflow-hidden bg-[#e8f5ee]">
      <GoogleStaticBasemap route={route} currentStep={currentStep} viewport={viewport} />
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
    theme: "grab-green-aligned-v5",
    path: route.route_geometry.map(([lng, lat]) => `${lng},${lat}`).join(";"),
    center: `${viewport.center.lat},${viewport.center.lng}`,
    zoom: String(viewport.zoom),
    origin: `${route.origin.coordinate.lat},${route.origin.coordinate.lng}`,
    destination: `${route.destination.coordinate.lat},${route.destination.coordinate.lng}`,
    current: `${current.lat},${current.lng}`,
  });

  if (imageFailed) {
    return <RouteOverlay route={route} currentStep={currentStep} viewport={viewport} showGrid />;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/google-static-map?${params.toString()}`}
        alt="Styled route basemap"
        className="absolute inset-0 h-full w-full object-fill"
        onError={() => setImageFailed(true)}
      />
      <RouteOverlay route={route} currentStep={currentStep} viewport={viewport} />
    </>
  );
}

function RouteOverlay({
  route,
  currentStep,
  viewport,
  showGrid = false,
}: {
  route: NavigationRoute;
  currentStep: NavStep;
  viewport: StaticMapViewport;
  showGrid?: boolean;
}) {
  const projectedRoute = projectCoordinates(route.route_geometry, viewport);
  const currentPoint = projectCoordinateToViewport(
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
      point: projectCoordinateToViewport([coordinate.lng, coordinate.lat], viewport),
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
      {showGrid && [180, 360, 540, 720].map((position) => (
        <g key={position} opacity="0.28">
          <line x1={position} y1="40" x2={position} y2="380" stroke="#8ab9a1" strokeWidth="2" />
          <line x1="40" y1={position / 2} x2="860" y2={position / 2} stroke="#8ab9a1" strokeWidth="2" />
        </g>
      ))}
      <path d={projectedRoute.path} fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
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

type StaticMapViewport = {
  center: { lat: number; lng: number };
  zoom: number;
};

function projectCoordinates(coordinates: [number, number][], viewport: StaticMapViewport) {
  const points = coordinates.map((coordinate) => projectCoordinateToViewport(coordinate, viewport));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return {
    path,
    start: points[0] ?? { x: 80, y: 80 },
    end: points.at(-1) ?? { x: 820, y: 340 },
  };
}

function getStaticMapViewport(coordinates: [number, number][]): StaticMapViewport {
  const mercatorPoints = coordinates.map(([lng, lat]) => mercatorPoint(lng, lat));
  const minX = Math.min(...mercatorPoints.map((point) => point.x));
  const maxX = Math.max(...mercatorPoints.map((point) => point.x));
  const minY = Math.min(...mercatorPoints.map((point) => point.y));
  const maxY = Math.max(...mercatorPoints.map((point) => point.y));
  const center = latLngFromMercator((minX + maxX) / 2, (minY + maxY) / 2);
  const zoomX = Math.log2((MAP_WIDTH - 170) / Math.max((maxX - minX) * 256, 0.000001));
  const zoomY = Math.log2((MAP_HEIGHT - 120) / Math.max((maxY - minY) * 256, 0.000001));
  const zoom = Math.max(0, Math.min(20, Math.floor(Math.min(zoomX, zoomY))));

  return { center, zoom };
}

function projectCoordinateToViewport([lng, lat]: [number, number], viewport: StaticMapViewport) {
  const point = mercatorPoint(lng, lat);
  const center = mercatorPoint(viewport.center.lng, viewport.center.lat);
  const worldSize = 256 * 2 ** viewport.zoom;

  return {
    x: (point.x - center.x) * worldSize + MAP_WIDTH / 2,
    y: (point.y - center.y) * worldSize + MAP_HEIGHT / 2,
  };
}

function mercatorPoint(lng: number, lat: number) {
  const sinLat = Math.sin((Math.max(Math.min(lat, 85.05112878), -85.05112878) * Math.PI) / 180);

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
