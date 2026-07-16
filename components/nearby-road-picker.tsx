'use client';

import { useMemo, useState } from "react";

import { rankRoadsByDistance, type NearbyRoadResult } from "@/lib/geo";

type RoadOption = {
  id: string;
  slug: string;
  name: string;
  assetLabel: string;
  centerLat: number;
  centerLng: number;
};

type NearbyRoadPickerProps = {
  roads: RoadOption[];
  selectedSlug: string;
};

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function NearbyRoadPicker({
  roads,
  selectedSlug,
}: NearbyRoadPickerProps) {
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "blocked">("idle");
  const [nearbyRoads, setNearbyRoads] = useState<NearbyRoadResult[]>([]);
  const selectedRoad = useMemo(
    () => nearbyRoads.find((road) => road.slug === selectedSlug),
    [nearbyRoads, selectedSlug],
  );
  const nearestRoad = nearbyRoads[0] ?? null;

  function locateRoads() {
    if (!navigator.geolocation) {
      setStatus("blocked");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearbyRoads(
          rankRoadsByDistance(
            {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            roads,
          ),
        );
        setStatus("ready");
      },
      () => {
        setStatus("blocked");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      },
    );
  }

  return (
    <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Find nearby road</p>
          <p className="mt-1 text-sm text-slate-600">
            Use your current location to sort the available road records before collecting.
          </p>
        </div>
        <button
          type="button"
          onClick={locateRoads}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-500"
          disabled={status === "locating"}
        >
          {status === "locating" ? "Locating..." : "Use my location"}
        </button>
      </div>

      {status === "blocked" ? (
        <p className="mt-3 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Location is unavailable. You can still choose the road manually.
        </p>
      ) : null}

      {status === "ready" && nearestRoad ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-[1rem] border border-teal-200 bg-teal-50 px-3 py-3 text-sm text-teal-900">
            Closest match: <span className="font-semibold">{nearestRoad.name}</span>{" "}
            ({formatDistance(nearestRoad.distanceMeters)})
            {selectedRoad ? (
              <span>
                . Selected road is {formatDistance(selectedRoad.distanceMeters)} away.
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {nearbyRoads.slice(0, 3).map((road) => (
              <a
                key={road.slug}
                href={`/report?road=${road.slug}`}
                className={
                  road.slug === selectedSlug
                    ? "rounded-full bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                }
              >
                {road.name} · {formatDistance(road.distanceMeters)}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
