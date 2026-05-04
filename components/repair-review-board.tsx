import Image from "next/image";

import {
  severityBandMeta,
  toneClasses,
  type SeverityBand,
} from "@/lib/constants";
import type { IssueClusterSummary } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

import { RepairUpdateForm, RepairVerificationForm } from "@/components/repair-actions";

type RepairReviewBoardProps = {
  roadId: string;
  roadName: string;
  clusters: IssueClusterSummary[];
  userRole: "RESIDENT" | "GOV" | null;
};

const severityOrder: SeverityBand[] = ["HIGH", "MEDIUM", "LOW"];

function sortClusters(left: IssueClusterSummary, right: IssueClusterSummary) {
  return (
    right.severityScore - left.severityScore ||
    new Date(right.lastUpdatedAt).getTime() - new Date(left.lastUpdatedAt).getTime()
  );
}

export function RepairReviewBoard({
  roadId,
  roadName,
  clusters,
  userRole,
}: RepairReviewBoardProps) {
  const groups = severityOrder
    .map((band) => ({
      band,
      label: severityBandMeta[band].label,
      tone: severityBandMeta[band].tone,
      clusters: clusters.filter((cluster) => cluster.severityBand === band).sort(sortClusters),
    }))
    .filter((group) => group.clusters.length > 0);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-slate-500">
            {userRole === "GOV" ? "Government review" : "Complaint and repair history"}
          </p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            Complaint queue by severity
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Each card stays attached to one road issue. The before image, latest status, and latest
          repair proof remain visible together.
        </p>
      </div>

      <div className="mt-5 space-y-6">
        {groups.length ? (
          groups.map((group) => (
            <div key={group.band} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]",
                    group.tone,
                  )}
                >
                  {group.label} severity
                </span>
                <p className="text-sm text-slate-500">
                  {group.clusters.length} complaint{group.clusters.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="space-y-4">
                {group.clusters.map((cluster) => {
                  const stateTone =
                    cluster.state === "resolved"
                      ? toneClasses.good
                      : cluster.state === "monitoring"
                        ? toneClasses.warning
                        : toneClasses.danger;
                  const canVerifyRepair =
                    cluster.latestRepairId != null &&
                    cluster.latestRepairStatusCode === "REPAIRED";

                  return (
                    <article
                      key={cluster.clusterKey}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="space-y-4">
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
                                stateTone,
                              )}
                            >
                              {cluster.stateLabel}
                            </span>
                          </div>

                          <p className="text-sm leading-7 text-slate-600">
                            {cluster.latestDescription}
                          </p>

                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>severity {cluster.severityScore}</span>
                            <span>{cluster.recurrenceCount} reports</span>
                            <span>{cluster.repairCount} repair updates</span>
                            <span>{cluster.likeCount} likes</span>
                            <span>{cluster.dislikeCount} dislikes</span>
                            <span>updated {formatDate(cluster.lastUpdatedAt)}</span>
                          </div>

                          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
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
                                  {cluster.latestRepairActorLabel
                                    ? `Updated by ${cluster.latestRepairActorLabel}.`
                                    : "Government update recorded."}{" "}
                                  {cluster.latestRepairProofPath
                                    ? "Repair photo attached."
                                    : "No repair photo uploaded yet."}
                                </p>
                              </>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">
                                No repair update has been recorded for this complaint yet.
                              </p>
                            )}
                          </div>

                          {userRole === "GOV" ? (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">
                                Update this complaint
                              </p>
                              <RepairUpdateForm roadId={roadId} cluster={cluster} />
                            </div>
                          ) : canVerifyRepair ? (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">
                                Has this repair held?
                              </p>
                              {userRole ? (
                                <RepairVerificationForm repairId={cluster.latestRepairId!} />
                              ) : (
                                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                                  Sign in through the demo account page to verify whether this
                                  repair actually held.
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-4">
                          <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                            <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Complaint photo
                            </div>
                            <Image
                              src={cluster.latestEvidencePath}
                              alt={`${cluster.issueLabel} complaint on ${roadName}`}
                              width={1200}
                              height={900}
                              className="aspect-[4/3] h-full w-full object-cover"
                              sizes="(max-width: 1280px) 100vw, 320px"
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
                                sizes="(max-width: 1280px) 100vw, 320px"
                              />
                            </div>
                          ) : cluster.latestRepairStatus ? (
                            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                              No repair photo has been uploaded for the latest government update yet.
                            </div>
                          ) : (
                            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                              No repair proof is attached to this complaint yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No complaint history has been recorded on this road yet.
          </div>
        )}
      </div>
    </section>
  );
}
