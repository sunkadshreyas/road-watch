import assert from "node:assert/strict";
import test from "node:test";

import { hasRecentDuplicateCollection } from "@/lib/collection-moderation";

test("hasRecentDuplicateCollection detects same issue nearby in time and location", () => {
  assert.equal(
    hasRecentDuplicateCollection({
      issueType: "POTHOLE",
      capturedAt: "2026-05-13T10:05:00.000Z",
      gpsLat: 12.97561,
      gpsLng: 77.64281,
      candidates: [
        {
          issueType: "POTHOLE",
          capturedAt: "2026-05-13T10:00:00.000Z",
          gpsLat: 12.9756,
          gpsLng: 77.6428,
        },
      ],
    }),
    true,
  );
});

test("hasRecentDuplicateCollection ignores different issue types", () => {
  assert.equal(
    hasRecentDuplicateCollection({
      issueType: "POTHOLE",
      capturedAt: "2026-05-13T10:05:00.000Z",
      gpsLat: 12.97561,
      gpsLng: 77.64281,
      candidates: [
        {
          issueType: "FOOTPATH_BLOCKED",
          capturedAt: "2026-05-13T10:00:00.000Z",
          gpsLat: 12.9756,
          gpsLng: 77.6428,
        },
      ],
    }),
    false,
  );
});

test("hasRecentDuplicateCollection ignores old captures", () => {
  assert.equal(
    hasRecentDuplicateCollection({
      issueType: "POTHOLE",
      capturedAt: "2026-05-13T10:20:00.000Z",
      gpsLat: 12.97561,
      gpsLng: 77.64281,
      candidates: [
        {
          issueType: "POTHOLE",
          capturedAt: "2026-05-13T10:00:00.000Z",
          gpsLat: 12.9756,
          gpsLng: 77.6428,
        },
      ],
    }),
    false,
  );
});

test("hasRecentDuplicateCollection ignores distant captures", () => {
  assert.equal(
    hasRecentDuplicateCollection({
      issueType: "POTHOLE",
      capturedAt: "2026-05-13T10:05:00.000Z",
      gpsLat: 12.97561,
      gpsLng: 77.64281,
      candidates: [
        {
          issueType: "POTHOLE",
          capturedAt: "2026-05-13T10:00:00.000Z",
          gpsLat: 12.9700,
          gpsLng: 77.6500,
        },
      ],
    }),
    false,
  );
});
