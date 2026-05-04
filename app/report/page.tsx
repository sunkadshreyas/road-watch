import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardMap } from "@/components/dashboard-map";
import { LiveObservationForm } from "@/components/live-observation-form";
import { PublicRecordList } from "@/components/public-record-list";
import { getSessionUser } from "@/lib/auth";
import { getRoadAssetOptions, getRoadDetail, getWardDashboard } from "@/lib/data";

function readSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ReportIssuePage({
  searchParams,
}: {
  searchParams: Promise<{
    road?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestedRoad = readSearchValue(resolvedSearchParams.road);
  const [roadOptions, user, dashboard] = await Promise.all([
    getRoadAssetOptions(),
    getSessionUser(),
    getWardDashboard(),
  ]);

  if (!roadOptions.length) {
    notFound();
  }

  const selectedRoadOption =
    roadOptions.find((road) => road.slug === requestedRoad) ??
    roadOptions.find((road) => road.assetType === "ROAD") ??
    roadOptions[0];
  const road = await getRoadDetail(selectedRoadOption.slug, user?.id ?? null);
  const displayIssueClusters = road.issueClusters;
  const canSubmitObservation = user?.role !== "GOV";
  const canVoteOnComplaints = user?.role === "RESIDENT";
  const voteMessage = user?.role === "GOV"
    ? "Government accounts cannot vote on complaints."
    : "Sign in as a resident to support this issue or flag it as false.";
  const flowLabel = canSubmitObservation ? "Resident flow" : "Government review";
  const introText = canSubmitObservation
    ? "Capture a live image, describe the issue, and add it directly to this public road record. The observation stays attached to the road or footpath, not to your identity."
    : "Inspect the public record for this road or footpath, review the existing evidence, and continue into the repair workflow. Government-labelled accounts do not create new public observations.";

  const mapPanel = (
    <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <DashboardMap
        roads={dashboard.roads.map((item) => ({
          slug: item.slug,
          name: item.name,
          assetType: item.assetType,
          conditionScore: item.conditionScore,
          openIssueCount: item.openIssueCount,
          geometry: item.geometry,
          centerLat: item.centerLat,
          centerLng: item.centerLng,
        }))}
        boundary={dashboard.ward.boundary}
        center={[dashboard.ward.centerLng, dashboard.ward.centerLat]}
        selectedSlug={road.slug}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">
            {flowLabel} · {road.assetLabel}
          </p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            {road.name}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{introText}</p>

          <form action="/report" className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Road or footpath</span>
              <select
                name="road"
                defaultValue={selectedRoadOption.slug}
                className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
              >
                {roadOptions.map((option) => (
                  <option key={option.id} value={option.slug}>
                    {option.name} · {option.assetLabel}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Switch record
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/roads/${road.slug}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Open full road record
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Open issues</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.openIssueCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Current unresolved issue clusters on this record.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Under monitoring</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.monitoringIssueCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Repairs waiting for the public to confirm whether they held.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Public observations</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.publicObservationCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Anonymous reports already attached to this road or footpath.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Repair updates</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.repairs.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Government updates and public verification activity on this record.
            </p>
          </div>
        </div>
      </section>

      {canSubmitObservation ? (
        <LiveObservationForm roadId={road.id} roadName={road.name} />
      ) : (
        <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Government flow</p>
          <h3 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            Government-labelled accounts review requests instead of creating them.
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Use the road record to inspect public observations, then move to the history tab to
            review pending complaints and open a dedicated repair form for the issue you want to
            update. Sign out or switch to a resident profile if you need to test anonymous issue
            submission.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/roads/${road.slug}?section=history`}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Review pending complaints
            </Link>
            <Link
              href={`/roads/${road.slug}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Open full road record
            </Link>
          </div>
        </section>
      )}

      <PublicRecordList
        roadId={road.id}
        roadName={road.name}
        clusters={displayIssueClusters}
        canVote={canVoteOnComplaints}
        voteMessage={voteMessage}
      />

      {mapPanel}
    </div>
  );
}
