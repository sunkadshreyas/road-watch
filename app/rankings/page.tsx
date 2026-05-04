import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { getWardDashboard } from "@/lib/data";
import { formatCurrencyInr } from "@/lib/utils";

export default async function RankingsPage() {
  const user = await getSessionUser();

  if (user?.role !== "GOV") {
    redirect("/");
  }

  const dashboard = await getWardDashboard();

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Rankings</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            Where the budget should go next.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Priority is driven by impact, severity, corridor importance, recurrence, and whether repairs actually held.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Ward need</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {formatCurrencyInr(dashboard.overview.totalBudgetNeedInr)}
            </p>
            <p className="mt-2 text-sm text-slate-600">Current heuristic allocation required for unresolved issues.</p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Average condition</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {dashboard.overview.averageConditionScore}
            </p>
            <p className="mt-2 text-sm text-slate-600">Current ward health score derived from issue and repair history.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/82 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="eyebrow text-slate-500">Ranked road records</p>
          </div>
          <div className="divide-y divide-slate-100">
            {dashboard.rankings.map((road, index) => (
              <div key={road.slug} className="grid gap-4 px-5 py-5 lg:grid-cols-[72px_1fr_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {road.assetLabel}
                    </p>
                    <p className="font-semibold text-slate-950">Priority {road.priorityScore}</p>
                  </div>
                </div>

                <div>
                  <Link href={`/roads/${road.slug}`} className="font-semibold text-slate-950">
                    {road.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">{road.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{road.openIssueCount} open</span>
                    <span>{road.monitoringIssueCount} monitoring</span>
                    <span>condition {road.conditionScore}</span>
                    <span>verified fix {road.verifiedFixRate}%</span>
                  </div>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                    {formatCurrencyInr(road.budgetNeedInr)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Estimated need
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="eyebrow text-slate-500">Budget estimator</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Issue-type allocation
            </h3>
            <div className="mt-4 space-y-3">
              {dashboard.issueBudgetBreakdown.map((item) => (
                <div
                  key={item.issueType}
                  className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{item.label}</p>
                      <p className="text-sm text-slate-600">
                        {item.openIssueCount} active clusters
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-950">
                        {formatCurrencyInr(item.totalBudgetNeedInr)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_22px_60px_-34px_rgba(15,23,42,0.52)]">
            <p className="eyebrow text-teal-300">Why this matters</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold">
              A ranking people can interrogate
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Rankings are not based on lobbying volume. They are based on recurring evidence, road importance, and whether money spent actually resolved the issue.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
