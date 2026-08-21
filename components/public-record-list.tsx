import { severityBandMeta, toneClasses } from "@/lib/constants";
import type { IssueClusterSummary } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

type PublicRecordListProps = {
  clusters: IssueClusterSummary[];
  eyebrow?: string;
  title?: string;
  emptyMessage?: string;
};

export function PublicRecordList({
  clusters,
  eyebrow = "Issue clusters",
  title = "Grouped road record",
  emptyMessage = "No public issue records are attached to this road right now.",
}: PublicRecordListProps) {
  const sortedClusters = [...clusters].sort((left, right) => {
    const stateWeight = { open: 0, monitoring: 1, resolved: 2 };

    return (
      stateWeight[left.state] - stateWeight[right.state] ||
      new Date(right.lastUpdatedAt).getTime() - new Date(left.lastUpdatedAt).getTime()
    );
  });

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-slate-500">{eyebrow}</p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            {title}
          </h3>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {sortedClusters.length ? (
          sortedClusters.map((cluster) => (
            <div
              key={cluster.clusterKey}
              className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{cluster.issueLabel}</p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        severityBandMeta[cluster.severityBand].tone,
                      )}
                    >
                      {cluster.severityLabel}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        cluster.state === "resolved"
                          ? toneClasses.good
                          : cluster.state === "monitoring"
                            ? toneClasses.warning
                            : toneClasses.danger,
                      )}
                    >
                      {cluster.stateLabel}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">{cluster.latestDescription}</p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>severity {cluster.severityScore}</span>
                    <span>{cluster.recurrenceCount} captures</span>
                    <span>{cluster.repairCount} repair updates</span>
                    <span>updated {formatDate(cluster.lastUpdatedAt)}</span>
                    <span>{cluster.likeCount} legacy cluster likes</span>
                    <span>{cluster.dislikeCount} legacy cluster dislikes</span>
                    <span>{cluster.sourceCount ?? 0} evidence source{cluster.sourceCount === 1 ? "" : "s"}</span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Sources: {(cluster.sourceLabels ?? []).join(", ") || "Not specified"}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    {cluster.latestVerificationLabel ?? "No public repair verification yet"}
                  </p>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4 lg:w-72">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Latest government update
                  </p>
                  {cluster.latestRepairStatus ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950">
                          {cluster.latestRepairStatus}
                        </p>
                        {cluster.latestRepairRecordedAt ? (
                          <p className="text-xs text-slate-500">
                            {formatDate(cluster.latestRepairRecordedAt)}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {cluster.latestRepairNote}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {cluster.latestRepairProofPath
                          ? "Repair photo attached."
                          : "No repair photo uploaded yet."}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No repair update yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
