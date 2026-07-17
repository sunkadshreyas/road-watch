import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RepairUpdateForm } from "@/components/repair-actions";
import { getSessionUser } from "@/lib/auth";
import { severityBandMeta, toneClasses } from "@/lib/constants";
import { getRoadDetail } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

export default async function RepairIssuePage({
  params,
}: {
  params: Promise<{
    slug: string;
    clusterKey: string;
  }>;
}) {
  const { slug, clusterKey } = await params;
  const user = await getSessionUser();

  if (user?.role !== "GOV") {
    redirect(`/roads/${slug}?section=history`);
  }

  const road = await getRoadDetail(slug, user.id, true).catch(() => notFound());
  const cluster = road.issueClusters.find((item) => item.clusterKey === clusterKey);

  if (!cluster) {
    notFound();
  }

  if (cluster.state !== "open") {
    redirect(`/roads/${slug}?section=history`);
  }

  const repairHistory = road.repairs.filter((repair) => repair.clusterKey === cluster.clusterKey);
  const stateTone = toneClasses.danger;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Government repair workflow</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            {cluster.issueLabel}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Review the violation evidence, then record the repair update for this specific issue on{" "}
            {road.name}.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/roads/${road.slug}?section=history`}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Back to pending violations
            </Link>
            <Link
              href={`/roads/${road.slug}`}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open road record
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Severity</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]",
                  severityBandMeta[cluster.severityBand].tone,
                )}
              >
                {cluster.severityLabel}
              </span>
              <span className="text-sm text-slate-500">score {cluster.severityScore}</span>
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Current status</p>
            <div className="mt-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]",
                  stateTone,
                )}
              >
                {cluster.stateLabel}
              </span>
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Public signal</p>
            <p className="mt-2 text-sm text-slate-600">
              {cluster.likeCount} likes · {cluster.dislikeCount} dislikes
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Reports linked</p>
            <p className="mt-2 text-sm text-slate-600">
              {cluster.recurrenceCount} violation{cluster.recurrenceCount === 1 ? "" : "s"} ·
              updated {formatDate(cluster.lastUpdatedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="eyebrow text-slate-500">Violation evidence</p>
            <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
              <Image
                src={cluster.latestEvidencePath}
                alt={`${cluster.issueLabel} violation on ${road.name}`}
                width={1200}
                height={900}
                unoptimized={cluster.latestEvidencePath.startsWith("/api/observations/")}
                className="aspect-[4/3] h-full w-full object-cover"
                sizes="(max-width: 1280px) 100vw, 640px"
              />
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{cluster.latestDescription}</p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="eyebrow text-slate-500">Earlier repair updates</p>
            <div className="mt-4 space-y-3">
              {repairHistory.length ? (
                repairHistory.map((repair) => (
                  <div
                    key={repair.id}
                    className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{repair.statusLabel}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(repair.recordedAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{repair.note}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Updated by {repair.recordedByLabel}.
                    </p>
                    {repair.proofImagePath ? (
                      <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white">
                        <Image
                          src={repair.proofImagePath}
                          alt={`${cluster.issueLabel} repair proof on ${road.name}`}
                          width={1200}
                          height={900}
                          className="aspect-[4/3] h-full w-full object-cover"
                          sizes="(max-width: 1280px) 100vw, 640px"
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No repair updates are recorded for this violation yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Repair form</p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            Update this violation
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            If you mark the violation as repaired, upload proof so residents can see the work and
            verify whether it held.
          </p>
          <div className="mt-5">
            <RepairUpdateForm roadId={road.id} cluster={cluster} />
          </div>
        </div>
      </section>
    </div>
  );
}
