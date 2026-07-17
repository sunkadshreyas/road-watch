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
        humanCheckStatus: "CLEARED",
        road: { name: "100 Feet Road" },
      },
    },
    {
      id: "receipt-2",
      observation: {
        id: "observation-2",
        issueType: "BROKEN_FOOTPATH",
        humanCheckStatus: "MANUAL_REVIEW",
        road: { name: "CMH Road" },
      },
    },
  ]);

  assert.equal(result.approvedPoints, 10);
  assert.deepEqual(result.items.map((item) => item.points), [10, 0]);
  assert.equal(result.items[1]?.reviewStatus, "MANUAL_REVIEW");
});
