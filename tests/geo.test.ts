import assert from "node:assert/strict";
import test from "node:test";

import {
  distanceMetersBetweenPoints,
  getRoadProximityStatus,
  rankRoadsByDistance,
  requireGpsPoint,
} from "@/lib/geo";

test("distanceMetersBetweenPoints returns zero for the same point", () => {
  assert.equal(
    distanceMetersBetweenPoints(
      { lat: 12.9756, lng: 77.6428 },
      { lat: 12.9756, lng: 77.6428 },
    ),
    0,
  );
});

test("rankRoadsByDistance sorts roads nearest first", () => {
  const ranked = rankRoadsByDistance(
    { lat: 12.9757, lng: 77.6429 },
    [
      {
        slug: "far",
        name: "Far Road",
        centerLat: 12.9709,
        centerLng: 77.6468,
      },
      {
        slug: "near",
        name: "Near Road",
        centerLat: 12.9756,
        centerLng: 77.6428,
      },
    ],
  );

  assert.equal(ranked[0]?.slug, "near");
  assert.ok(ranked[0].distanceMeters < ranked[1].distanceMeters);
});

test("rankRoadsByDistance breaks equal distances by name", () => {
  const ranked = rankRoadsByDistance(
    { lat: 12, lng: 77 },
    [
      {
        slug: "b",
        name: "Beta Road",
        centerLat: 12,
        centerLng: 77,
      },
      {
        slug: "a",
        name: "Alpha Road",
        centerLat: 12,
        centerLng: 77,
      },
    ],
  );

  assert.deepEqual(
    ranked.map((road) => road.slug),
    ["a", "b"],
  );
});

test("getRoadProximityStatus marks nearby captures", () => {
  const status = getRoadProximityStatus(
    { lat: 12.97561, lng: 77.64281 },
    {
      slug: "100-feet-road",
      name: "100 Feet Road",
      centerLat: 12.9756,
      centerLng: 77.6428,
    },
  );

  assert.equal(status.isNearby, true);
  assert.match(status.label, /selected road/);
});

test("getRoadProximityStatus warns on distant captures", () => {
  const status = getRoadProximityStatus(
    { lat: 12.9756, lng: 77.6428 },
    {
      slug: "old-madras-service-lane",
      name: "Old Madras Service Lane",
      centerLat: 12.9000,
      centerLng: 77.7000,
    },
    250,
  );

  assert.equal(status.isNearby, false);
  assert.match(status.label, /Check that the road selection is correct/);
});

test("requireGpsPoint rejects missing capture coordinates", () => {
  assert.throws(
    () => requireGpsPoint(null, 77.6428),
    /GPS latitude and longitude are required/,
  );
  assert.throws(
    () => requireGpsPoint(12.9756, null),
    /GPS latitude and longitude are required/,
  );
});

test("requireGpsPoint rejects coordinates outside valid GPS ranges", () => {
  assert.throws(
    () => requireGpsPoint(90.0001, 77.6428),
    /GPS latitude must be between -90 and 90/,
  );
  assert.throws(
    () => requireGpsPoint(-90.0001, 77.6428),
    /GPS latitude must be between -90 and 90/,
  );
  assert.throws(
    () => requireGpsPoint(12.9756, 180.0001),
    /GPS longitude must be between -180 and 180/,
  );
  assert.throws(
    () => requireGpsPoint(12.9756, -180.0001),
    /GPS longitude must be between -180 and 180/,
  );
});

test("requireGpsPoint returns valid capture coordinates", () => {
  assert.deepEqual(requireGpsPoint(12.9756, 77.6428), {
    lat: 12.9756,
    lng: 77.6428,
  });
});
