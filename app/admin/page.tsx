import Link from "next/link";
import { ClipboardCheck, MapPinned, Wrench } from "lucide-react";
import { redirect } from "next/navigation";

import { CollectedViolationList } from "@/components/collected-violation-list";
import { getSessionUser } from "@/lib/auth";
import { buildAdminQueue } from "@/lib/admin-queue";
import { getRoadDetail, getWardDashboard } from "@/lib/data";

export default async function AdminPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/account");
  }

  if (user.role !== "GOV") {
    redirect("/");
  }

  const dashboard = await getWardDashboard();
  const roads = await Promise.all(
    dashboard.roads.map((road) => getRoadDetail(road.slug, user.id, true)),
  );
  const queue = buildAdminQueue(
    roads.map((road) => ({
      slug: road.slug,
      name: road.name,
      observations: road.collectedViolations.map((observation) => ({
        id: observation.id,
        issueLabel: observation.issueLabel,
        humanCheckStatus: observation.humanCheckStatus,
      })),
      openClusters: road.issueClusters
        .filter((cluster) => cluster.state === "open")
        .map((cluster) => ({
          clusterKey: cluster.clusterKey,
          issueLabel: cluster.issueLabel,
        })),
    })),
  );
  const pendingViolations = roads.flatMap((road) =>
    road.collectedViolations.filter(
      (observation) => observation.humanCheckStatus === "MANUAL_REVIEW",
    ),
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <MapPinned className="h-4 w-4 text-teal-700" aria-hidden="true" />
          {user.ward.name} · {user.ward.city} · Government workspace
        </p>
        <h2 className="mt-3 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
          Review the ward, road by road.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          This workspace keeps moderation separate from repair tracking. Approve or reject pending
          evidence first, then open a road issue to record a governed repair update.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-sky-200 bg-sky-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Pending review</p>
            <p className="mt-2 text-3xl font-semibold text-sky-950">{queue.pending.length}</p>
          </div>
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Open repair work</p>
            <p className="mt-2 text-3xl font-semibold text-amber-950">{queue.repairs.length}</p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roads in ward</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{roads.length}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-slate-500">Central queue</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Pending moderation across roads
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Every capture starts in manual review. Decisions are compare-and-set, so a second action
            cannot overwrite an already reviewed record.
          </p>
        </div>
        <CollectedViolationList
          violations={pendingViolations}
          canVote={false}
          canModerate
          voteMessage="Moderation queue items do not accept resident votes."
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-slate-500">Repair queue</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Select a road to record repair progress
            </h3>
          </div>
          <Wrench className="hidden h-8 w-8 text-amber-700 sm:block" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {queue.repairs.length ? (
            queue.repairs.map((item) => (
              <Link
                key={`${item.roadSlug}:${item.clusterKey}`}
                href={`/roads/${item.roadSlug}/repairs/${encodeURIComponent(item.clusterKey)}`}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.roadName}
                    </p>
                    <h4 className="mt-2 font-semibold text-slate-950">{item.issueLabel}</h4>
                  </div>
                  <ClipboardCheck className="h-5 w-5 text-amber-700" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm text-slate-600">Open the governed repair lifecycle and audit history.</p>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 md:col-span-2">
              No approved unresolved repairs are waiting in this ward.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="eyebrow text-slate-500">Road selection</p>
        <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
          Open a road workspace
        </h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roads.map((road) => (
            <Link
              key={road.slug}
              href={`/roads/${road.slug}?section=history`}
              className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
            >
              <p className="font-semibold text-slate-950">{road.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {road.openIssueCount} open · {road.publicObservationCount} approved captures
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
