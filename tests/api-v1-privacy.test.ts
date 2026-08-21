import assert from "node:assert/strict";
import test from "node:test";

import { coarsenPublicPoint, isUnresolvedObservation } from "../lib/api-v1-data";

test("public API points are deliberately coarsened", () => {
  assert.deepEqual(coarsenPublicPoint({ lat: 12.975678, lng: 77.642812 }), {
    lat: 12.976,
    lng: 77.643,
  });
});

test("public nearby results exclude observations with a held repair", () => {
  assert.equal(
    isUnresolvedObservation({
      observationCreatedAt: "2026-01-01T00:00:00.000Z",
      latestRepair: {
        status: "REPAIRED",
        completedAt: "2026-01-02T00:00:00.000Z",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      latestVerification: { verdict: "FIX_HELD", createdAt: "2026-01-03T00:00:00.000Z" },
    }),
    false,
  );
});

test("public nearby results retain open and monitoring repairs", () => {
  assert.equal(
    isUnresolvedObservation({
      observationCreatedAt: "2026-01-01T00:00:00.000Z",
      latestRepair: {
        status: "IN_PROGRESS",
        completedAt: null,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      latestVerification: null,
    }),
    true,
  );
});
