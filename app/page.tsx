import Link from "next/link";
import { Camera, MapPin } from "lucide-react";

import { DashboardMap } from "@/components/dashboard-map";
import { getSessionUser } from "@/lib/auth";
import { getWardDashboard } from "@/lib/data";

export default async function Home() {
  const [dashboard, user] = await Promise.all([getWardDashboard(), getSessionUser()]);
  const featuredRoad = dashboard.rankings[0] ?? null;
  const isResident = user?.role === "RESIDENT";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <MapPin className="h-4 w-4 text-teal-700" aria-hidden="true" />
            {dashboard.ward.name} · {dashboard.ward.city}
          </p>
          <h2 className="mt-3 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
            Catch road violations nearby.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Capture a live GPS-tagged photo, check violations on a street, vote on sightings,
            and follow repairs through RSS.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {isResident ? (
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Collect violation
              </Link>
            ) : (
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Choose account
              </Link>
            )}

            {featuredRoad ? (
              <Link
                href={`/roads/${featuredRoad.slug}`}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                View street
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-4 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
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
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-slate-500">Streets</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Open road records
            </h3>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {dashboard.rankings.slice(0, 4).map((road) => (
            <Link
              key={road.slug}
              href={`/roads/${road.slug}`}
              className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-950">{road.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">{road.assetLabel}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {road.openIssueCount} open
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
