import { distanceMetersBetweenPoints, type GeoPoint } from "@/lib/geo";

export type DuplicateCollectionCandidate = {
  issueType: string;
  capturedAt: Date | string;
  gpsLat: number | null;
  gpsLng: number | null;
};

export type DuplicateCollectionInput = {
  issueType: string;
  capturedAt: Date | string;
  gpsLat: number | null;
  gpsLng: number | null;
  candidates: DuplicateCollectionCandidate[];
  windowMinutes?: number;
  distanceThresholdMeters?: number;
};

const DEFAULT_WINDOW_MINUTES = 10;
const DEFAULT_DISTANCE_THRESHOLD_METERS = 50;

function toPoint(lat: number | null, lng: number | null): GeoPoint | null {
  if (lat == null || lng == null) {
    return null;
  }

  return { lat, lng };
}

export function hasRecentDuplicateCollection({
  issueType,
  capturedAt,
  gpsLat,
  gpsLng,
  candidates,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
  distanceThresholdMeters = DEFAULT_DISTANCE_THRESHOLD_METERS,
}: DuplicateCollectionInput) {
  const capturedTime = new Date(capturedAt).getTime();
  const point = toPoint(gpsLat, gpsLng);

  return candidates.some((candidate) => {
    if (candidate.issueType !== issueType) {
      return false;
    }

    const candidateTime = new Date(candidate.capturedAt).getTime();
    const elapsedMinutes = Math.abs(capturedTime - candidateTime) / 60_000;

    if (elapsedMinutes > windowMinutes) {
      return false;
    }

    const candidatePoint = toPoint(candidate.gpsLat, candidate.gpsLng);

    if (!point || !candidatePoint) {
      return true;
    }

    return (
      distanceMetersBetweenPoints(point, candidatePoint) <= distanceThresholdMeters
    );
  });
}
