export type GeoPoint = {
  lat: number;
  lng: number;
};

export type NearbyRoadInput = {
  slug: string;
  name: string;
  centerLat: number;
  centerLng: number;
};

export type NearbyRoadResult = NearbyRoadInput & {
  distanceMeters: number;
};

export type ProximityStatus = {
  distanceMeters: number;
  isNearby: boolean;
  label: string;
};

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_NEARBY_THRESHOLD_METERS = 250;

export function requireGpsPoint(lat: number | null, lng: number | null): GeoPoint {
  if (lat == null || lng == null) {
    throw new Error("GPS latitude and longitude are required for every violation capture.");
  }

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("GPS latitude must be between -90 and 90.");
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error("GPS longitude must be between -180 and 180.");
  }

  return {
    lat,
    lng,
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMetersBetweenPoints(left: GeoPoint, right: GeoPoint) {
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const leftLat = toRadians(left.lat);
  const rightLat = toRadians(right.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function rankRoadsByDistance(
  point: GeoPoint,
  roads: NearbyRoadInput[],
): NearbyRoadResult[] {
  return roads
    .map((road) => ({
      ...road,
      distanceMeters: Math.round(
        distanceMetersBetweenPoints(point, {
          lat: road.centerLat,
          lng: road.centerLng,
        }),
      ),
    }))
    .sort((left, right) => {
      if (left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters;
      }

      return left.name.localeCompare(right.name);
    });
}

export function getRoadProximityStatus(
  point: GeoPoint,
  road: NearbyRoadInput,
  thresholdMeters = DEFAULT_NEARBY_THRESHOLD_METERS,
): ProximityStatus {
  const distanceMeters = Math.round(
    distanceMetersBetweenPoints(point, {
      lat: road.centerLat,
      lng: road.centerLng,
    }),
  );
  const isNearby = distanceMeters <= thresholdMeters;

  return {
    distanceMeters,
    isNearby,
    label: isNearby
      ? `Capture is ${distanceMeters} m from the selected road.`
      : `Capture is ${distanceMeters} m from the selected road. Check that the road selection is correct.`,
  };
}
