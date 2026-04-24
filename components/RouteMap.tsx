"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import { NavigationRoute, NavStep } from "@/lib/navigation";

type RouteMapProps = {
  route: NavigationRoute;
  currentStep: NavStep;
  previewing: boolean;
};

export default function RouteMap({ route, currentStep, previewing }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      const style = await fetch("/api/map-style").then((response) => {
        if (!response.ok) throw new Error("GrabMaps style unavailable");
        return response.json();
      });

      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [route.origin.coordinate.lng, route.origin.coordinate.lat],
        zoom: 16.2,
        pitch: 55,
        bearing: currentStep.target_bearing,
        attributionControl: { compact: true },
      });

      mapRef.current = map;

      map.on("load", () => {
        map.addSource("route", {
          type: "geojson",
          data: routeLine(route.route_geometry),
        });

        map.addLayer({
          id: "route-shadow",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#08251a",
            "line-opacity": 0.24,
            "line-width": 12,
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#00B14F",
            "line-width": 7,
          },
        });

        new maplibregl.Marker({ color: "#00B14F" })
          .setLngLat([route.origin.coordinate.lng, route.origin.coordinate.lat])
          .addTo(map);
        new maplibregl.Marker({ color: "#ffb000" })
          .setLngLat([route.destination.coordinate.lng, route.destination.coordinate.lat])
          .addTo(map);
      });
    }

    initMap().catch(() => {
      mapRef.current = null;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [currentStep.target_bearing, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const center = currentStep.landmark.coordinate ?? currentStep.coordinate;
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: previewing ? 17.4 : 16.6,
      pitch: 60,
      bearing: currentStep.target_bearing,
      duration: previewing ? 2600 : 900,
      essential: true,
    });
  }, [currentStep, previewing]);

  return (
    <div className="relative h-full min-h-[190px] overflow-hidden bg-[#e8f5ee]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
      <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0b1f17] shadow-sm">
        GrabMaps live view
      </div>
    </div>
  );
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
