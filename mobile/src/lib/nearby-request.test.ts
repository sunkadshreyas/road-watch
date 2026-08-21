import assert from "node:assert/strict";
import test from "node:test";

import { buildNearbyViolationsPath } from "./nearby-request";

test("nearby request matches the versioned API query contract", () => {
  assert.equal(
    buildNearbyViolationsPath({
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 1200,
    }),
    "/violations/nearby?lat=12.9716&lng=77.5946&radiusMeters=1200",
  );
});

test("nearby request rejects out-of-range coordinates", () => {
  assert.throws(
    () =>
      buildNearbyViolationsPath({
        latitude: 91,
        longitude: 77.5946,
        radiusMeters: 1200,
      }),
    /latitude/i,
  );
});
