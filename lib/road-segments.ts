import { distanceMetersBetweenPoints, type GeoPoint } from "@/lib/geo";

export type LineStringGeometry = {
  type: "LineString";
  coordinates: Array<[number, number]>;
};

export type RoadSegmentGeometry = {
  sequence: number;
  geometry: LineStringGeometry;
  centerLat: number;
  centerLng: number;
  lengthMeters: number;
};

function toGeoPoint(coordinate: [number, number]): GeoPoint {
  return {
    lat: coordinate[1],
    lng: coordinate[0],
  };
}

function interpolate(
  start: [number, number],
  end: [number, number],
  ratio: number,
): [number, number] {
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function buildCumulativeDistances(coordinates: Array<[number, number]>) {
  const distances = [0];

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = toGeoPoint(coordinates[index - 1]);
    const current = toGeoPoint(coordinates[index]);
    distances.push(distances[index - 1] + distanceMetersBetweenPoints(previous, current));
  }

  return distances;
}

function coordinateAtDistance(
  coordinates: Array<[number, number]>,
  cumulativeDistances: number[],
  targetDistance: number,
): [number, number] {
  if (targetDistance <= 0) {
    return coordinates[0];
  }

  const totalDistance = cumulativeDistances.at(-1) ?? 0;
  if (targetDistance >= totalDistance) {
    return coordinates.at(-1) ?? coordinates[0];
  }

  for (let index = 1; index < cumulativeDistances.length; index += 1) {
    if (cumulativeDistances[index] >= targetDistance) {
      const previousDistance = cumulativeDistances[index - 1];
      const segmentDistance = cumulativeDistances[index] - previousDistance;
      const ratio = segmentDistance === 0 ? 0 : (targetDistance - previousDistance) / segmentDistance;
      return interpolate(coordinates[index - 1], coordinates[index], ratio);
    }
  }

  return coordinates.at(-1) ?? coordinates[0];
}

export function segmentRoadGeometry(
  geometry: LineStringGeometry,
  maximumLengthMeters = 200,
): RoadSegmentGeometry[] {
  if (geometry.coordinates.length < 2) {
    return [];
  }

  if (!Number.isFinite(maximumLengthMeters) || maximumLengthMeters <= 0) {
    throw new Error("Segment length must be greater than zero.");
  }

  const cumulativeDistances = buildCumulativeDistances(geometry.coordinates);
  const totalDistance = cumulativeDistances.at(-1) ?? 0;
  if (totalDistance === 0) {
    return [];
  }

  const boundaries: number[] = [0];
  for (let distance = maximumLengthMeters; distance < totalDistance; distance += maximumLengthMeters) {
    boundaries.push(distance);
  }
  boundaries.push(totalDistance);

  return boundaries.slice(0, -1).map((startDistance, sequence) => {
    const endDistance = boundaries[sequence + 1];
    const start = coordinateAtDistance(geometry.coordinates, cumulativeDistances, startDistance);
    const end = coordinateAtDistance(geometry.coordinates, cumulativeDistances, endDistance);
    const center = interpolate(start, end, 0.5);

    return {
      sequence,
      geometry: {
        type: "LineString",
        coordinates: [start, end],
      },
      centerLat: center[1],
      centerLng: center[0],
      lengthMeters: Math.round(endDistance - startDistance),
    };
  });
}

export function findNearestRoadSegment(
  point: GeoPoint,
  segments: readonly RoadSegmentGeometry[],
): RoadSegmentGeometry | null {
  let nearest: RoadSegmentGeometry | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const segment of segments) {
    const distance = distanceMetersBetweenPoints(point, {
      lat: segment.centerLat,
      lng: segment.centerLng,
    });

    if (distance < nearestDistance) {
      nearest = segment;
      nearestDistance = distance;
    }
  }

  return nearest;
}
