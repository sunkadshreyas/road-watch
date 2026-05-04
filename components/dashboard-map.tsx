'use client';

import maplibregl, { type LngLatBoundsLike } from "maplibre-gl";
import { useEffect, useRef } from "react";

type DashboardMapProps = {
  roads: Array<{
    slug: string;
    name: string;
    assetType: "ROAD" | "FOOTPATH";
    conditionScore: number;
    openIssueCount: number;
    geometry: {
      type: "LineString";
      coordinates: Array<[number, number]>;
    };
    centerLat: number;
    centerLng: number;
  }>;
  boundary: {
    type: "Polygon";
    coordinates: Array<Array<[number, number]>>;
  };
  center: [number, number];
  selectedSlug?: string;
};

function getLineColor(conditionScore: number) {
  if (conditionScore <= 45) {
    return "#b91c1c";
  }

  if (conditionScore <= 65) {
    return "#c2410c";
  }

  if (conditionScore <= 80) {
    return "#b45309";
  }

  return "#0f766e";
}

function getBoundaryBounds(
  boundary: DashboardMapProps["boundary"],
): LngLatBoundsLike {
  const ring = boundary.coordinates[0] ?? [];
  const lngs = ring.map((point) => point[0]);
  const lats = ring.map((point) => point[1]);

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function DashboardMap({
  roads,
  boundary,
  center,
  selectedSlug,
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      center,
      zoom: 14.2,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
      }),
      "top-right",
    );
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.addSource("ward-boundary", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: boundary,
            },
          ],
        },
      });

      map.addSource("road-lines", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addSource("road-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "ward-fill",
        type: "fill",
        source: "ward-boundary",
        paint: {
          "fill-color": "#0f766e",
          "fill-opacity": 0.05,
        },
      });

      map.addLayer({
        id: "ward-outline",
        type: "line",
        source: "ward-boundary",
        paint: {
          "line-color": "#0f766e",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      map.addLayer({
        id: "road-lines-layer",
        type: "line",
        source: "road-lines",
        paint: {
          "line-color": ["get", "stroke"],
          "line-width": ["get", "lineWidth"],
          "line-opacity": 0.92,
        },
      });

      map.addLayer({
        id: "selected-road-layer",
        type: "line",
        source: "road-lines",
        filter: ["==", ["get", "slug"], selectedSlug ?? ""],
        paint: {
          "line-color": "#0f172a",
          "line-width": 8,
          "line-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "road-points-layer",
        type: "circle",
        source: "road-points",
        paint: {
          "circle-color": "#0f172a",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "openIssueCount"],
            0,
            6,
            4,
            11,
          ],
        },
      });

      map.addLayer({
        id: "road-point-labels",
        type: "symbol",
        source: "road-points",
        layout: {
          "text-field": ["get", "openIssueCount"],
          "text-size": 11,
          "text-font": ["Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.on("mouseenter", "road-lines-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "road-lines-layer", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "road-lines-layer", (event) => {
        const slug = event.features?.[0]?.properties?.slug;

        if (typeof slug === "string") {
          window.location.assign(`/roads/${slug}`);
        }
      });

      const roadSource = map.getSource("road-lines") as maplibregl.GeoJSONSource | undefined;
      roadSource?.setData({
        type: "FeatureCollection",
        features: roads.map((road) => ({
          type: "Feature" as const,
          properties: {
            slug: road.slug,
            name: road.name,
            stroke: getLineColor(road.conditionScore),
            lineWidth: road.slug === selectedSlug ? 6 : road.assetType === "FOOTPATH" ? 4 : 5,
          },
          geometry: road.geometry,
        })),
      });

      const pointSource = map.getSource("road-points") as maplibregl.GeoJSONSource | undefined;
      pointSource?.setData({
        type: "FeatureCollection",
        features: roads.map((road) => ({
          type: "Feature" as const,
          properties: {
            slug: road.slug,
            name: road.name,
            openIssueCount: road.openIssueCount,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [road.centerLng, road.centerLat],
          },
        })),
      });

      map.setFilter("selected-road-layer", [
        "==",
        ["get", "slug"],
        selectedSlug ?? "",
      ]);

      map.fitBounds(getBoundaryBounds(boundary), {
        padding: 48,
        duration: 0,
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [boundary, center, roads, selectedSlug]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (!map.isStyleLoaded()) {
      map.once("load", () => {
        map.triggerRepaint();
      });
      return;
    }

    const roadFeatures = {
      type: "FeatureCollection" as const,
      features: roads.map((road) => ({
        type: "Feature" as const,
        properties: {
          slug: road.slug,
          name: road.name,
          stroke: getLineColor(road.conditionScore),
          lineWidth: road.slug === selectedSlug ? 6 : road.assetType === "FOOTPATH" ? 4 : 5,
        },
        geometry: road.geometry,
      })),
    };

    const pointFeatures = {
      type: "FeatureCollection" as const,
      features: roads.map((road) => ({
        type: "Feature" as const,
        properties: {
          slug: road.slug,
          name: road.name,
          openIssueCount: road.openIssueCount,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [road.centerLng, road.centerLat],
        },
      })),
    };

    const roadSource = map.getSource("road-lines") as maplibregl.GeoJSONSource | undefined;
    roadSource?.setData(roadFeatures);

    const pointSource = map.getSource("road-points") as maplibregl.GeoJSONSource | undefined;
    pointSource?.setData(pointFeatures);

    map.setFilter("selected-road-layer", [
      "==",
      ["get", "slug"],
      selectedSlug ?? "",
    ]);

    if (!selectedSlug) {
      map.fitBounds(getBoundaryBounds(boundary), {
        padding: 48,
        duration: 0,
      });
    }
  }, [boundary, roads, selectedSlug]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_22px_60px_-32px_rgba(15,23,42,0.45)]">
      <div ref={containerRef} className="h-[360px] w-full sm:h-[460px]" />
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-700" />
          Poor condition
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
          Watch closely
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
          Holding up
        </span>
        <span className="ml-auto">Base map © OpenStreetMap contributors</span>
      </div>
    </div>
  );
}
