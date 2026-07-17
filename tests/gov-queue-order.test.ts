import assert from "node:assert/strict";
import test from "node:test";

import type { IssueClusterSummary } from "@/lib/data";
import { sortPendingComplaintClusters } from "@/lib/gov-queue";

function buildCluster(overrides: Partial<IssueClusterSummary>): IssueClusterSummary {
  return {
    clusterKey: "cluster",
    issueType: "POTHOLE",
    issueLabel: "Pothole",
    severityBand: "MEDIUM",
    severityLabel: "Medium",
    state: "open",
    stateLabel: "Open observation",
    severityScore: 50,
    latestEvidencePath: "/uploads/example.jpg",
    impactScore: 50,
    priorityScore: 50,
    recurrenceCount: 1,
    repairCount: 0,
    estimatedCostInr: 1000,
    wastedSpendInr: 0,
    lastUpdatedAt: "2026-01-01T00:00:00.000Z",
    latestDescription: "Example capture",
    latestRepairId: null,
    latestRepairStatusCode: null,
    latestRepairStatus: null,
    latestRepairNote: null,
    latestRepairProofPath: null,
    latestRepairRecordedAt: null,
    latestRepairCompletedAt: null,
    latestRepairActorLabel: null,
    latestVerificationLabel: null,
    likeCount: 0,
    dislikeCount: 0,
    viewerVote: null,
    ...overrides,
  };
}

test("gov repair queue orders by priority, not by frozen legacy cluster likes", () => {
  const highPriorityNoLikes = buildCluster({
    clusterKey: "high-priority",
    priorityScore: 90,
    likeCount: 0,
  });
  const lowPriorityManyLikes = buildCluster({
    clusterKey: "low-priority",
    priorityScore: 10,
    likeCount: 99,
  });

  const ordered = sortPendingComplaintClusters([
    lowPriorityManyLikes,
    highPriorityNoLikes,
  ]);

  assert.deepEqual(
    ordered.map((cluster) => cluster.clusterKey),
    ["high-priority", "low-priority"],
    "A high-priority cluster with zero legacy likes must outrank a low-priority cluster with many legacy likes.",
  );
});

test("gov repair queue ordering is deterministic when priority, severity, and recency tie", () => {
  const first = buildCluster({ clusterKey: "aaa" });
  const second = buildCluster({ clusterKey: "zzz" });

  const forward = sortPendingComplaintClusters([first, second]).map(
    (cluster) => cluster.clusterKey,
  );
  const reversed = sortPendingComplaintClusters([second, first]).map(
    (cluster) => cluster.clusterKey,
  );

  assert.deepEqual(forward, ["aaa", "zzz"]);
  assert.deepEqual(
    reversed,
    ["aaa", "zzz"],
    "Ordering must not depend on input order when the primary keys tie.",
  );
});

test("gov repair queue falls back to severity then recency before the deterministic tiebreak", () => {
  const highSeverity = buildCluster({
    clusterKey: "b-high-severity",
    priorityScore: 50,
    severityScore: 80,
    lastUpdatedAt: "2026-01-01T00:00:00.000Z",
  });
  const lowSeverityNewer = buildCluster({
    clusterKey: "a-low-severity",
    priorityScore: 50,
    severityScore: 40,
    lastUpdatedAt: "2026-06-01T00:00:00.000Z",
  });

  const ordered = sortPendingComplaintClusters([
    lowSeverityNewer,
    highSeverity,
  ]).map((cluster) => cluster.clusterKey);

  assert.deepEqual(
    ordered,
    ["b-high-severity", "a-low-severity"],
    "With equal priority, higher severity must sort ahead of a more recent but lower-severity cluster.",
  );
});
