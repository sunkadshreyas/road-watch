import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { severityBandMeta, toneClasses } from "@/lib/constants";
import { getMyComplaintDashboard } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

function stateTone(state: "open" | "monitoring" | "resolved") {
  if (state === "resolved") {
    return toneClasses.good;
  }

  if (state === "monitoring") {
    return toneClasses.warning;
  }

  return toneClasses.danger;
}

export default async function MyComplaintsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/account");
  }

  if (user.role !== "RESIDENT") {
    redirect("/");
  }

  const dashboard = await getMyComplaintDashboard(user.id);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">My complaints</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            Your private complaint trail.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            This page is visible only inside your signed-in account layer. The public road record
            still shows the complaint itself, not who logged it.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/report"
              className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
            >
              Report another issue
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Open account
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Total</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {dashboard.totalCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">Complaints linked privately to your account.</p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Needs action</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-rose-700">
              {dashboard.openCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">Open complaints that still need a government response.</p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Moved forward</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {dashboard.monitoringCount + dashboard.resolvedCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">Complaints that were repaired or are awaiting verification.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-slate-500">Private list</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Complaints you submitted
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Each card shows the complaint photo you submitted, the latest government status, and
            any repair photo attached later by the officer.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {dashboard.complaints.length ? (
            dashboard.complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{complaint.issueLabel}</p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                            severityBandMeta[complaint.severityBand].tone,
                          )}
                        >
                          {complaint.severityLabel}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                            stateTone(complaint.state),
                          )}
                        >
                          {complaint.stateLabel}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {complaint.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>
                          <Link href={`/roads/${complaint.roadSlug}`} className="font-semibold text-slate-700">
                            {complaint.roadName}
                          </Link>
                        </span>
                        <span>{complaint.assetLabel}</span>
                        <span>severity {complaint.severityScore}</span>
                        <span>submitted {formatDate(complaint.submittedAt)}</span>
                      </div>
                    </div>

                    <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Latest government update
                      </p>
                      {complaint.latestRepairStatus ? (
                        <>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">
                              {complaint.latestRepairStatus}
                            </p>
                            {complaint.latestRepairRecordedAt ? (
                              <p className="text-xs text-slate-500">
                                {formatDate(complaint.latestRepairRecordedAt)}
                              </p>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            {complaint.latestRepairNote}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {complaint.latestVerificationLabel ?? "No resident verification yet."}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          No government update has been recorded for this complaint yet.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/roads/${complaint.roadSlug}`}
                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open road record
                      </Link>
                      <Link
                        href={`/report?road=${complaint.roadSlug}`}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Add another complaint
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Your complaint photo
                      </div>
                      <Image
                        src={complaint.evidencePath}
                        alt={`${complaint.issueLabel} complaint on ${complaint.roadName}`}
                        width={1200}
                        height={900}
                        className="aspect-[4/3] h-full w-full object-cover"
                        sizes="(max-width: 1280px) 100vw, 320px"
                      />
                    </div>

                    {complaint.latestRepairProofPath ? (
                      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Repair photo
                        </div>
                        <Image
                          src={complaint.latestRepairProofPath}
                          alt={`${complaint.issueLabel} repair proof on ${complaint.roadName}`}
                          width={1200}
                          height={900}
                          className="aspect-[4/3] h-full w-full object-cover"
                          sizes="(max-width: 1280px) 100vw, 320px"
                        />
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                        No repair photo has been attached yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No complaints are linked to your account yet. You can still submit anonymously while
              signed out, but signing in lets you track your own complaints privately here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
