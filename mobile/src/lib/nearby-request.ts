type NearbyRequestInput = {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
};

export function buildNearbyViolationsPath({
  latitude,
  longitude,
  radiusMeters = 1_000,
}: NearbyRequestInput): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Nearby latitude must be between -90 and 90.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Nearby longitude must be between -180 and 180.");
  }

  if (
    !Number.isInteger(radiusMeters) ||
    radiusMeters < 50 ||
    radiusMeters > 5_000
  ) {
    throw new Error("Nearby radius must be an integer from 50 to 5000 meters.");
  }

  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radiusMeters: String(radiusMeters),
  });

  return `/violations/nearby?${query.toString()}`;
}
