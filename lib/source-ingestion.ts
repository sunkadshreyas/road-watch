import { ObservationSource } from "@prisma/client";

import { distanceMetersBetweenPoints, type GeoPoint } from "@/lib/geo";
import { findNearestRoadSegment, segmentRoadGeometry, type LineStringGeometry } from "@/lib/road-segments";
import { prisma } from "@/lib/prisma";
import type { NormalizedSourceEvent, SourceAdapter } from "@/lib/source-adapters";

const DEFAULT_SEGMENT_LENGTH_METERS = 200;
const DEFAULT_MATCH_DISTANCE_METERS = 250;

function parseGeometry(value: string): LineStringGeometry {
  const parsed = JSON.parse(value) as Partial<LineStringGeometry>;
  if (parsed.type !== "LineString" || !Array.isArray(parsed.coordinates)) {
    throw new Error("Road geometry must be a LineString.");
  }

  return {
    type: "LineString",
    coordinates: parsed.coordinates as Array<[number, number]>,
  };
}

export async function ensureRoadSegments(
  roadId: string,
  maximumLengthMeters = DEFAULT_SEGMENT_LENGTH_METERS,
) {
  const road = await prisma.roadAsset.findUnique({
    where: { id: roadId },
    select: { id: true, geometryGeoJson: true },
  });

  if (!road) {
    throw new Error("Road record not found.");
  }

  const geometries = segmentRoadGeometry(parseGeometry(road.geometryGeoJson), maximumLengthMeters);
  const segments = [];

  for (const geometry of geometries) {
    const segment = await prisma.roadSegment.upsert({
      where: {
        roadId_sequence: {
          roadId: road.id,
          sequence: geometry.sequence,
        },
      },
      create: {
        roadId: road.id,
        sequence: geometry.sequence,
        geometryGeoJson: JSON.stringify(geometry.geometry),
        centerLat: geometry.centerLat,
        centerLng: geometry.centerLng,
        lengthMeters: geometry.lengthMeters,
      },
      update: {
        geometryGeoJson: JSON.stringify(geometry.geometry),
        centerLat: geometry.centerLat,
        centerLng: geometry.centerLng,
        lengthMeters: geometry.lengthMeters,
      },
    });

    segments.push(segment);
  }

  return segments;
}

function matchSegment(
  event: NormalizedSourceEvent,
  segments: Awaited<ReturnType<typeof ensureRoadSegments>>,
) {
  const point: GeoPoint = {
    lat: event.latitude,
    lng: event.longitude,
  };
  const segmentGeometries = segments.map((segment) => ({
    sequence: segment.sequence,
    geometry: JSON.parse(segment.geometryGeoJson) as LineStringGeometry,
    centerLat: segment.centerLat,
    centerLng: segment.centerLng,
    lengthMeters: segment.lengthMeters,
  }));
  const nearest = findNearestRoadSegment(point, segmentGeometries);

  if (!nearest) {
    return null;
  }

  const distanceMeters = distanceMetersBetweenPoints(point, {
    lat: nearest.centerLat,
    lng: nearest.centerLng,
  });

  if (distanceMeters > DEFAULT_MATCH_DISTANCE_METERS) {
    return null;
  }

  return segments.find((segment) => segment.sequence === nearest.sequence) ?? null;
}

export async function ingestSourceEvents(
  roadId: string,
  adapter: SourceAdapter,
  options: { maximumSegmentLengthMeters?: number } = {},
) {
  const segments = await ensureRoadSegments(
    roadId,
    options.maximumSegmentLengthMeters ?? DEFAULT_SEGMENT_LENGTH_METERS,
  );
  const events = await adapter.fetchEvents();
  const results = {
    received: events.length,
    stored: 0,
    unmatched: 0,
  };

  for (const event of events) {
    const segment = matchSegment(event, segments);
    if (!segment) {
      results.unmatched += 1;
      continue;
    }

    await prisma.sourceEvent.upsert({
      where: {
        source_sourceKey: {
          source: event.source,
          sourceKey: event.sourceKey,
        },
      },
      create: {
        roadId,
        segmentId: segment.id,
        source: event.source,
        sourceKey: event.sourceKey,
        sourceLabel: event.sourceLabel || adapter.label,
        sourceReference: event.sourceReference,
        sourceNote: event.sourceNote,
        issueType: event.issueType,
        title: event.title,
        description: event.description,
        latitude: event.latitude,
        longitude: event.longitude,
        observedAt: event.observedAt,
        payloadJson: event.payload ? JSON.stringify(event.payload) : null,
      },
      update: {
        segmentId: segment.id,
        sourceLabel: event.sourceLabel || adapter.label,
        sourceReference: event.sourceReference,
        sourceNote: event.sourceNote,
        issueType: event.issueType,
        title: event.title,
        description: event.description,
        latitude: event.latitude,
        longitude: event.longitude,
        observedAt: event.observedAt,
        payloadJson: event.payload ? JSON.stringify(event.payload) : null,
      },
    });

    results.stored += 1;
  }

  return {
    ...results,
    source: adapter.source,
    segmentCount: segments.length,
  };
}

export function sourceEventSourceLabel(source: ObservationSource) {
  if (source === ObservationSource.WEB_SCRAPE) {
    return "Public record";
  }

  if (source === ObservationSource.SATELLITE) {
    return "Satellite imagery";
  }

  return "Live camera";
}
