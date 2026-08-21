import assert from "node:assert/strict";
import test from "node:test";

import { segmentRoadGeometry, findNearestRoadSegment } from "../lib/road-segments";
import { FixtureSourceAdapter } from "../lib/source-adapters";

test("road geometry is split into bounded segments with ordered sequences", () => {
  const segments = segmentRoadGeometry(
    {
      type: "LineString",
      coordinates: [
        [77.6000, 12.9700],
        [77.6040, 12.9700],
      ],
    },
    200,
  );

  assert.ok(segments.length > 1);
  assert.deepEqual(
    segments.map((segment) => segment.sequence),
    segments.map((_segment, index) => index),
  );
  assert.ok(segments.every((segment) => segment.lengthMeters <= 200));
  assert.equal(segments[0]?.geometry.type, "LineString");
});

test("nearest segment matching uses segment centers", () => {
  const segments = segmentRoadGeometry(
    {
      type: "LineString",
      coordinates: [
        [77.6000, 12.9700],
        [77.6080, 12.9700],
      ],
    },
    200,
  );

  const nearest = findNearestRoadSegment(
    { lat: segments[1]!.centerLat, lng: segments[1]!.centerLng },
    segments,
  );

  assert.equal(nearest?.sequence, 1);
});

test("fixture adapters normalize source identity while preserving payload", async () => {
  const adapter = new FixtureSourceAdapter("WEB_SCRAPE", "Municipal fixture", [
    {
      source: "LIVE_CAMERA",
      sourceKey: "complaint-1",
      sourceLabel: "Municipal fixture",
      title: "Open pothole complaint",
      description: "Fixture complaint for ingestion tests.",
      latitude: 12.97,
      longitude: 77.6,
      observedAt: new Date("2026-08-21T00:00:00.000Z"),
      payload: { status: "open" },
    },
  ]);

  const events = await adapter.fetchEvents();
  assert.equal(events[0]?.source, "WEB_SCRAPE");
  assert.equal(events[0]?.sourceKey, "complaint-1");
  assert.deepEqual(events[0]?.payload, { status: "open" });
});
