import assert from "node:assert/strict";
import test from "node:test";

import { buildApiCollection } from "../lib/api-v1-data";

test("API collection awards points only to approved captures", () => {
  const result = buildApiCollection([
    {
      id: "receipt-1",
      observation: {
        id: "observation-1",
        issueType: "POTHOLE",
        description: "Pothole beside the bus stop.",
        evidencePath: "/uploads/seed/pothole.jpg",
        evidenceCapturedAt: new Date("2026-08-01T09:00:00.000Z"),
        gpsLat: 12.9756,
        gpsLng: 77.6428,
        humanCheckStatus: "CLEARED",
        road: { name: "100 Feet Road" },
        votes: [{ kind: "LIKE" }],
      },
    },
    {
      id: "receipt-2",
      observation: {
        id: "observation-2",
        issueType: "BROKEN_FOOTPATH",
        description: "Broken paving slabs.",
        evidencePath: "/uploads/seed/footpath.jpg",
        evidenceCapturedAt: new Date("2026-08-02T09:00:00.000Z"),
        gpsLat: 12.9746,
        gpsLng: 77.6453,
        humanCheckStatus: "MANUAL_REVIEW",
        road: { name: "CMH Road" },
        votes: [{ kind: "DISLIKE" }],
      },
    },
  ]);

  assert.equal(result.approvedPoints, 10);
  assert.deepEqual(result.items.map((item) => item.points), [10, 0]);
  assert.equal(result.items[1]?.reviewStatus, "MANUAL_REVIEW");
});
