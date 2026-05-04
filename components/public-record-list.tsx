import Image from "next/image";

import { voteOnIssueClusterAction } from "@/app/actions";
import { severityBandMeta, toneClasses } from "@/lib/constants";
import type { IssueClusterSummary } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

type PublicRecordListProps = {
  roadId: string;
  roadName: string;
  clusters: IssueClusterSummary[];
  canVote: boolean;
  voteMessage?: string;
  eyebrow?: string;
  title?: string;
  emptyMessage?: string;
};

export function PublicRecordList({
  roadId,
  roadName,
  clusters,
  canVote,
  voteMessage = "Sign in as a resident to support this issue or flag it as false.",
  eyebrow = "Public records",
  title = "Current public record",
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
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex flex-col justify-between gap-4">
                  <div>
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
                      <span>{cluster.recurrenceCount} reports</span>
                      <span>{cluster.repairCount} repair updates</span>
                      <span>updated {formatDate(cluster.lastUpdatedAt)}</span>
                    </div>

                    <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4">
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

                    <p className="mt-3 text-xs text-slate-500">
                      {cluster.latestVerificationLabel ?? "No public verification yet"}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{cluster.likeCount} likes</span>
                        <span>{cluster.dislikeCount} dislikes</span>
                      </div>

                      {canVote ? (
                        <form action={voteOnIssueClusterAction} className="flex flex-wrap gap-2">
                          <input type="hidden" name="roadId" value={roadId} />
                          <input type="hidden" name="clusterKey" value={cluster.clusterKey} />
                          <button
                            type="submit"
                            name="voteKind"
                            value="LIKE"
                            className={cn(
                              "rounded-full border px-3 py-2 text-sm font-semibold transition",
                              cluster.viewerVote === "LIKE"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                            )}
                          >
                            Like
                          </button>
                          <button
                            type="submit"
                            name="voteKind"
                            value="DISLIKE"
                            className={cn(
                              "rounded-full border px-3 py-2 text-sm font-semibold transition",
                              cluster.viewerVote === "DISLIKE"
                                ? "border-rose-300 bg-rose-50 text-rose-700"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                            )}
                          >
                            Dislike
                          </button>
                        </form>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {voteMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Complaint photo
                    </div>
                    <Image
                      src={cluster.latestEvidencePath}
                      alt={`${cluster.issueLabel} evidence on ${roadName}`}
                      width={1200}
                      height={900}
                      className="aspect-[4/3] h-full w-full object-cover"
                      sizes="(max-width: 1280px) 100vw, 288px"
                    />
                  </div>

                  {cluster.latestRepairProofPath ? (
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Repair photo
                      </div>
                      <Image
                        src={cluster.latestRepairProofPath}
                        alt={`${cluster.issueLabel} repair proof on ${roadName}`}
                        width={1200}
                        height={900}
                        className="aspect-[4/3] h-full w-full object-cover"
                        sizes="(max-width: 1280px) 100vw, 288px"
                      />
                    </div>
                  ) : null}
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
