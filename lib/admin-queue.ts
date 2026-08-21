export type AdminQueueRoad = {
  slug: string;
  name: string;
  observations: Array<{
    id: string;
    issueLabel: string;
    humanCheckStatus: "CLEARED" | "REJECTED" | "MANUAL_REVIEW";
  }>;
  openClusters: Array<{
    clusterKey: string;
    issueLabel: string;
  }>;
};

export type AdminPendingItem = {
  observationId: string;
  issueLabel: string;
  roadSlug: string;
  roadName: string;
};

export type AdminRepairItem = {
  clusterKey: string;
  issueLabel: string;
  roadSlug: string;
  roadName: string;
};

export function buildAdminQueue(roads: AdminQueueRoad[]) {
  const pending: AdminPendingItem[] = [];
  const repairs: AdminRepairItem[] = [];

  for (const road of roads) {
    for (const observation of road.observations) {
      if (observation.humanCheckStatus === "MANUAL_REVIEW") {
        pending.push({
          observationId: observation.id,
          issueLabel: observation.issueLabel,
          roadSlug: road.slug,
          roadName: road.name,
        });
      }
    }

    for (const cluster of road.openClusters) {
      repairs.push({
        clusterKey: cluster.clusterKey,
        issueLabel: cluster.issueLabel,
        roadSlug: road.slug,
        roadName: road.name,
      });
    }
  }

  return {
    pending: pending.sort((left, right) =>
      `${left.roadName}:${left.issueLabel}`.localeCompare(`${right.roadName}:${right.issueLabel}`),
    ),
    repairs: repairs.sort((left, right) =>
      `${left.roadName}:${left.issueLabel}`.localeCompare(`${right.roadName}:${right.issueLabel}`),
    ),
  };
}
