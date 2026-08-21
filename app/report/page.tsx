import Link from "next/link";
import { MapPin, Radio, Wrench } from "lucide-react";
import { notFound } from "next/navigation";

import { CollectedViolationList } from "@/components/collected-violation-list";
import { DashboardMap } from "@/components/dashboard-map";
import { NearbyRoadPicker } from "@/components/nearby-road-picker";
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
  const road = await getRoadDetail(
    selectedRoadOption.slug,
    user?.id ?? null,
    user?.role === "GOV",
  );
  const displayIssueClusters = road.issueClusters;
  const canSubmitObservation = user?.role !== "GOV";
  const canVoteOnComplaints = user?.role === "RESIDENT";
  const voteMessage = user?.role === "GOV"
    ? "Government accounts cannot vote on violations."
    : "Sign in as a resident to support this issue or flag it as false.";
  const flowLabel = canSubmitObservation && user?.role === "RESIDENT"
    ? "Resident capture"
    : canSubmitObservation
      ? "Anonymous capture"
    : user?.role === "GOV"
      ? "Government repair crew"
      : "Public street view";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {canSubmitObservation || user?.role == null ? (
              <Radio className="h-4 w-4 text-teal-700" aria-hidden="true" />
            ) : (
              <Wrench className="h-4 w-4 text-amber-700" aria-hidden="true" />
            )}
            {flowLabel} · {road.assetLabel}
          </p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
            {road.name}
          </h2>

          {canSubmitObservation ? (
            <NearbyRoadPicker
              roads={roadOptions}
              selectedSlug={selectedRoadOption.slug}
            />
          ) : null}

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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Switch record
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-4 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
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
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="eyebrow text-slate-500">Native capture</p>
        <h3 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
          Capture road issues in the RoadWatch mobile app.
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          The web record remains available for browsing, review, and repair history. Camera and location capture now belong exclusively to the Expo iOS and Android app.
        </p>
        <Link
          href={`/roads/${road.slug}`}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Open full road record
        </Link>
      </section>

      <CollectedViolationList
        violations={road.collectedViolations}
        canVote={canVoteOnComplaints}
        canModerate={user?.role === "GOV"}
        voteMessage={voteMessage}
      />

      <PublicRecordList
        clusters={displayIssueClusters}
      />
    </div>
  );
}
