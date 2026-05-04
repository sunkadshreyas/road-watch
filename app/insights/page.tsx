import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { getWardDashboard } from "@/lib/data";
import { formatCurrencyInr } from "@/lib/utils";

export default async function InsightsPage() {
  const user = await getSessionUser();

  if (user?.role !== "GOV") {
    redirect("/");
  }

  const dashboard = await getWardDashboard();

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Insights</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            Waste becomes visible when the same fix keeps coming back.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Repeat repairs are not just a maintenance story. They are evidence about quality, sequencing, and whether the right intervention was chosen in the first place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Repeat waste exposure</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-rose-700">
              {formatCurrencyInr(dashboard.overview.repeatWasteInr)}
            </p>
            <p className="mt-2 text-sm text-slate-600">Repairs already consumed on roads where problems still returned.</p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Fixes holding</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {dashboard.overview.verifiedFixRate}%
            </p>
            <p className="mt-2 text-sm text-slate-600">Ward-level average of verified repair outcomes.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-500">Repeat issues panel</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Roads where rework is the story
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dashboard.repeatOffenders.map((road) => (
              <div
                key={road.slug}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={`/roads/${road.slug}?section=history`} className="font-semibold text-slate-950">
                      {road.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      {road.repeatIssueCount} repeating clusters
                      {road.worstCluster
                        ? ` · worst pattern: ${road.worstCluster.issueLabel}`
                        : ""}
                    </p>
                    {road.worstCluster ? (
                      <p className="mt-2 text-sm text-slate-500">
                        {road.worstCluster.latestDescription}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-[family:var(--font-display)] text-3xl font-semibold text-rose-700">
                      {formatCurrencyInr(road.repeatWasteInr)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Estimated wasted spend
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="eyebrow text-slate-500">Repair quality snapshot</p>
            <div className="mt-4 space-y-3">
              {dashboard.roads
                .slice()
                .sort((left, right) => left.verifiedFixRate - right.verifiedFixRate)
                .map((road) => (
                  <div
                    key={road.slug}
                    className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Link href={`/roads/${road.slug}?section=history`} className="font-semibold text-slate-950">
                          {road.name}
                        </Link>
                        <p className="text-sm text-slate-600">
                          {road.openIssueCount} open · {road.monitoringIssueCount} monitoring
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                          {road.verifiedFixRate}%
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Verified hold rate
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_22px_60px_-34px_rgba(15,23,42,0.52)]">
            <p className="eyebrow text-teal-300">Reading the signal</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold">
              Poor roads and poor repairs are different things.
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The MVP exposes both. One road can be bad because it is neglected. Another can be bad because it keeps receiving shallow fixes that do not survive.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
