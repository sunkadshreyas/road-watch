import Image from "next/image";
import Link from "next/link";
import { MapPin, Trophy } from "lucide-react";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { severityBandMeta, toneClasses } from "@/lib/constants";
import { getMyComplaintDashboard, type CollectedCaptureState } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

function stateTone(state: CollectedCaptureState) {
  if (state === "resolved") {
    return toneClasses.good;
  }

  if (state === "monitoring") {
    return toneClasses.warning;
  }

  if (state === "pending" || state === "rejected") {
    return toneClasses.neutral;
  }

  return toneClasses.danger;
}

export default async function CollectionPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/account");
  }

  if (user.role !== "RESIDENT") {
    redirect("/");
  }

  const dashboard = await getMyComplaintDashboard(user.id);
  const levelProgress = dashboard.levelProgress;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="eyebrow text-slate-500">My collection</p>
        <h2 className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
          Violations you collected
        </h2>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/report"
            className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            Collect violation
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          >
            Account
          </Link>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Level {levelProgress.level}
              </p>
              <p className="mt-1 font-[family:var(--font-display)] text-2xl font-semibold text-slate-950">
                {levelProgress.title}
              </p>
            </div>
            <p className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-amber-200">
              {levelProgress.currentScore} XP
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-amber-100">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Collection",
              value: `+${dashboard.score.submissionPoints}`,
              note: `${dashboard.score.submittedViolationCount} captures`,
            },
            {
              label: "Likes",
              value: `+${dashboard.score.likePoints}`,
              note: `${dashboard.score.receivedLikeCount} received`,
            },
            {
              label: "Dislikes",
              value: `-${dashboard.score.dislikePenalty}`,
              note: `${dashboard.score.receivedDislikeCount} received`,
            },
            {
              label: "Total",
              value: String(dashboard.score.totalScore),
              note: "Current score",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="eyebrow text-slate-500">{item.label}</p>
              <p className="mt-1 font-[family:var(--font-display)] text-2xl font-semibold text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-slate-500">Private list</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Your collected violations
            </h3>
          </div>
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
                        {complaint.humanCheckStatus === "MANUAL_REVIEW" ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                            Manual review pending
                          </span>
                        ) : null}
                        {complaint.humanCheckStatus === "REJECTED" ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                            Rejected
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {complaint.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <Link href={`/roads/${complaint.roadSlug}`} className="font-semibold text-slate-700">
                          {complaint.roadName}
                        </Link>
                        <span>{formatDate(complaint.submittedAt)}</span>
                      </div>
                      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          GPS {complaint.gpsLat.toFixed(5)}, {complaint.gpsLng.toFixed(5)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/roads/${complaint.roadSlug}`}
                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open street
                      </Link>
                      <Link
                        href={`/report?road=${complaint.roadSlug}`}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Collect another
                      </Link>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                    <Image
                      src={complaint.evidencePath}
                      alt={`${complaint.issueLabel} violation on ${complaint.roadName}`}
                      width={1200}
                      height={900}
                      unoptimized={complaint.evidencePath.startsWith("/api/observations/")}
                      className="aspect-[4/3] h-full w-full object-cover"
                      sizes="(max-width: 1280px) 100vw, 320px"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No violations are linked to your account yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
