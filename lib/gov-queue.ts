import type { IssueClusterSummary } from "@/lib/data";

export function comparePendingComplaintClusters(
  left: IssueClusterSummary,
  right: IssueClusterSummary,
): number {
  return (
    right.priorityScore - left.priorityScore ||
    right.severityScore - left.severityScore ||
    new Date(right.lastUpdatedAt).getTime() - new Date(left.lastUpdatedAt).getTime() ||
    left.clusterKey.localeCompare(right.clusterKey)
  );
}

export function sortPendingComplaintClusters(
  clusters: IssueClusterSummary[],
): IssueClusterSummary[] {
  return [...clusters].sort(comparePendingComplaintClusters);
}
