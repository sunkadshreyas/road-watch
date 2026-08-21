import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminQueue } from "../lib/admin-queue";

test("admin queue groups pending moderation and approved repair work by road", () => {
  const queue = buildAdminQueue([
    {
      slug: "main-road",
      name: "Main Road",
      observations: [
        { id: "pending-1", issueLabel: "Pothole", humanCheckStatus: "MANUAL_REVIEW" },
        { id: "approved-1", issueLabel: "Blocked footpath", humanCheckStatus: "CLEARED" },
      ],
      openClusters: [{ clusterKey: "blocked-footpath", issueLabel: "Blocked footpath" }],
    },
    {
      slug: "quiet-road",
      name: "Quiet Road",
      observations: [{ id: "rejected-1", issueLabel: "Pothole", humanCheckStatus: "REJECTED" }],
      openClusters: [],
    },
  ]);

  assert.deepEqual(queue.pending.map((item) => item.observationId), ["pending-1"]);
  assert.deepEqual(queue.repairs.map((item) => item.clusterKey), ["blocked-footpath"]);
  assert.equal(queue.pending[0]?.roadSlug, "main-road");
  assert.equal(queue.repairs[0]?.roadName, "Main Road");
});
