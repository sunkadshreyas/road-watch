import Image from "next/image";
import Link from "next/link";

import { severityBandMeta, toneClasses } from "@/lib/constants";
import type { IssueClusterSummary } from "@/lib/data";
import { sortPendingComplaintClusters } from "@/lib/gov-queue";
import { cn, formatDate } from "@/lib/utils";

type GovPendingComplaintListProps = {
  roadSlug: string;
  roadName: string;
  clusters: IssueClusterSummary[];
};

export function GovPendingComplaintList({
  roadSlug,
  roadName,
  clusters,
}: GovPendingComplaintListProps) {
  const sortedClusters = sortPendingComplaintClusters(clusters);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-slate-500">Government review</p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            Pending violations
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Open a violation to review its image, history, and submit the repair update from a
          dedicated form. The queue is sorted by repair priority, then by severity.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {sortedClusters.length ? (
          sortedClusters.map((cluster, index) => (
            <Link
              key={cluster.clusterKey}
              href={`/roads/${roadSlug}/repairs/${encodeURIComponent(cluster.clusterKey)}`}
              className="block rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      #{index + 1}
                    </span>
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
                        cluster.state === "monitoring"
                          ? toneClasses.warning
                          : toneClasses.danger,
                      )}
                    >
                      {cluster.stateLabel}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-slate-600">
                    {cluster.latestDescription}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>priority {cluster.priorityScore}</span>
                    <span>severity {cluster.severityScore}</span>
                    <span>{cluster.recurrenceCount} reports</span>
                    <span>updated {formatDate(cluster.lastUpdatedAt)}</span>
                  </div>

                  <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                    {cluster.latestRepairStatus ? (
                      <>
                        <p className="font-semibold text-slate-950">
                          Latest update: {cluster.latestRepairStatus}
                        </p>
                        <p className="mt-2">{cluster.latestRepairNote}</p>
                      </>
                    ) : (
                      <p>No government update has been recorded for this violation yet.</p>
                    )}
                  </div>

                  <div className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    Open repair form
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Violation photo
                  </div>
                  <Image
                    src={cluster.latestEvidencePath}
                    alt={`${cluster.issueLabel} violation on ${roadName}`}
                    width={1200}
                    height={900}
                    unoptimized={cluster.latestEvidencePath.startsWith("/api/observations/")}
                    className="aspect-[4/3] h-full w-full object-cover"
                    sizes="(max-width: 1280px) 100vw, 288px"
                  />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No pending violations remain on this road right now.
          </div>
        )}
      </div>
    </section>
  );
}
