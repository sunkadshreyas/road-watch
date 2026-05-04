import Link from "next/link";

import { DashboardMap } from "@/components/dashboard-map";
import { getSessionUser } from "@/lib/auth";
import { getWardDashboard } from "@/lib/data";
import {
  formatCompactNumber,
  formatDate,
} from "@/lib/utils";

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
      <p className="eyebrow text-slate-500">{label}</p>
      <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
    </div>
  );
}

export default async function Home() {
  const [dashboard, user] = await Promise.all([getWardDashboard(), getSessionUser()]);
  const featuredRoad = dashboard.rankings[0] ?? null;
  const canSubmitObservation = user?.role !== "GOV";
  const canViewInsights = user?.role === "GOV";

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grain-panel stagger-fade overflow-hidden rounded-[2.2rem] border border-slate-200 bg-slate-950 px-6 py-7 text-white panel-inset sm:px-8 sm:py-8">
          <div className="relative z-10">
            <p className="eyebrow text-teal-300">
              {dashboard.ward.name} · {dashboard.ward.city}
            </p>
            <h2 className="mt-4 max-w-3xl font-[family:var(--font-display)] text-5xl font-semibold tracking-tight sm:text-6xl">
              Road intelligence built around what the street is telling us.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              RoadWatch keeps the public record focused on the asset itself: the road, the footpath,
              the repair history, and the issues people can see right now.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {canSubmitObservation ? (
                <Link
                  href="/report"
                  className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
                >
                  Report issue
                </Link>
              ) : null}
              {featuredRoad ? (
                <Link
                  href={`/roads/${featuredRoad.slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open a sample road record
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard
            label="Open issues"
            value={String(dashboard.overview.openIssueCount)}
            note="Current unresolved road and footpath problems across the seeded demo ward."
          />
          <StatCard
            label="Under monitoring"
            value={String(dashboard.overview.monitoringIssueCount)}
            note="Repairs that still need the public to confirm whether they actually held."
          />
          <StatCard
            label="Public records"
            value={String(dashboard.roads.length)}
            note="Seeded roads and footpaths imported as the first ward-scale demo dataset."
          />
          <StatCard
            label="Verified fix rate"
            value={`${dashboard.overview.verifiedFixRate}%`}
            note="Share of public verifications that say a marked repair is still holding up."
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-5 rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-slate-500">Sample ward map</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Seeded OSM road and footpath records
              </h3>
            </div>
            <p className="max-w-sm text-sm text-slate-600">
              The MVP starts with one seeded ward so the customer can see the system end to end before wider rollout.
            </p>
          </div>

          <div id="ward-map">
            <DashboardMap
            roads={dashboard.roads.map((road) => ({
              slug: road.slug,
              name: road.name,
              assetType: road.assetType,
              conditionScore: road.conditionScore,
              openIssueCount: road.openIssueCount,
              geometry: road.geometry,
              centerLat: road.centerLat,
              centerLng: road.centerLng,
            }))}
            boundary={dashboard.ward.boundary}
            center={[dashboard.ward.centerLng, dashboard.ward.centerLat]}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_56px_-30px_rgba(15,23,42,0.38)] backdrop-blur">
            <p className="eyebrow text-slate-500">Observation model</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              What, not who
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                Anonymous observations attach only to a road or footpath record. There is no field for the person who flagged it.
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                Discussions and RSS subscriptions use an account, but those accounts are not exposed as public identity.
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                Camera capture is live-only in this MVP and rejects frames where a person is detected.
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_56px_-30px_rgba(15,23,42,0.38)] backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-slate-500">Road watchlist</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Public road records
              </h3>
            </div>
            {canSubmitObservation ? (
              <Link href="/report" className="text-sm font-semibold text-teal-700">
                Report issue
              </Link>
            ) : null}
          </div>

            <div className="mt-4 space-y-3">
              {dashboard.rankings.slice(0, 4).map((road, index) => (
                <Link
                  key={road.slug}
                  href={`/roads/${road.slug}`}
                  className="flex items-start gap-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-950">{road.name}</h4>
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {road.assetLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{road.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{road.openIssueCount} open issues</span>
                      <span>{road.monitoringIssueCount} under monitoring</span>
                      <span>updated {formatDate(road.latestUpdateAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_56px_-30px_rgba(15,23,42,0.38)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-500">Repeat offenders</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Same road, same problem again
              </h3>
            </div>
            {canViewInsights ? (
              <Link href="/insights" className="text-sm font-semibold text-teal-700">
                Insights
              </Link>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {dashboard.repeatOffenders.slice(0, 4).map((road) => (
              <div
                key={road.slug}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Link href={`/roads/${road.slug}`} className="font-semibold text-slate-950">
                      {road.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      {road.repeatIssueCount} repeat issue clusters · worst signal{" "}
                      {road.worstCluster?.issueLabel ?? "n/a"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-[family:var(--font-display)] text-3xl font-semibold text-rose-700">
                      {road.repeatIssueCount}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Repeat clusters
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_56px_-30px_rgba(15,23,42,0.38)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-500">Latest community signal</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Balanced public context
              </h3>
            </div>
            <Link href="/account" className="text-sm font-semibold text-teal-700">
              Sign in
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {dashboard.latestCommunity.map((entry) => (
              <Link
                key={`${entry.roadSlug}-${entry.title}`}
                href={`/roads/${entry.roadSlug}?section=community&community=${entry.category.toLowerCase()}`}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {entry.category}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{entry.roadName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-[family:var(--font-display)] text-2xl font-semibold text-slate-950">
                      {formatCompactNumber(entry.agreementCount)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Agreement
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
