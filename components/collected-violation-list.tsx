import Image from "next/image";
import { MapPin, ThumbsDown, ThumbsUp } from "lucide-react";

import { moderateObservationAction, voteOnObservationAction } from "@/app/actions";
import { severityBandMeta, toneClasses } from "@/lib/constants";
import type { RoadDetail } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

type CollectedViolation = RoadDetail["collectedViolations"][number];

type CollectedViolationListProps = {
  violations: CollectedViolation[];
  canVote: boolean;
  canModerate?: boolean;
  voteMessage?: string;
};

function stateTone(state: CollectedViolation["state"]) {
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

export function CollectedViolationList({
  violations,
  canVote,
  canModerate = false,
  voteMessage = "Sign in as a resident to confirm or dispute collected violations.",
}: CollectedViolationListProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-slate-500">Collected violations</p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            Individual captures
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Confirm a capture if you see it on this road. Dispute it if it does not exist.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {violations.length ? (
          violations.map((violation) => (
            <div
              key={violation.id}
              className="overflow-hidden rounded-[1.45rem] border border-slate-200 bg-slate-50"
            >
              <Image
                src={violation.evidencePath}
                alt={`${violation.issueLabel} violation on ${violation.roadName}`}
                width={1200}
                height={900}
                unoptimized={violation.evidencePath.startsWith("/api/observations/")}
                className="aspect-[4/3] w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              <div className="space-y-4 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{violation.issueLabel}</p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        severityBandMeta[violation.severityBand].tone,
                      )}
                    >
                      {violation.severityLabel}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        stateTone(violation.state),
                      )}
                    >
                      {violation.stateLabel}
                    </span>
                    {violation.humanCheckStatus === "MANUAL_REVIEW" ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                        Manual review pending
                      </span>
                    ) : null}
                    {violation.humanCheckStatus === "REJECTED" ? (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                        Rejected
                      </span>
                    ) : null}
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {violation.sourceLabel}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {violation.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>severity {violation.severityScore}</span>
                    <span>collected {formatDate(violation.submittedAt)}</span>
                    {violation.isOwnCollection ? <span>your collection</span> : null}
                    {violation.sourceReference ? <span>{violation.sourceReference}</span> : null}
                  </div>
                  <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      GPS {violation.gpsLat.toFixed(5)}, {violation.gpsLng.toFixed(5)}
                    </span>
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-white px-3 py-3">
                  {canModerate && violation.humanCheckStatus === "MANUAL_REVIEW" ? (
                    <form action={moderateObservationAction} className="mb-3 space-y-2">
                      <input type="hidden" name="observationId" value={violation.id} />
                      <input
                        name="moderationReason"
                        placeholder="Reason required when rejecting"
                        aria-label="Moderation reason"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          name="moderationStatus"
                          value="CLEARED"
                          className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                        >
                          Approve capture
                        </button>
                        <button
                          type="submit"
                          name="moderationStatus"
                          value="REJECTED"
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Reject capture
                        </button>
                      </div>
                    </form>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{violation.likeCount} likes</span>
                      <span>{violation.dislikeCount} dislikes</span>
                    </div>

                    {canVote && !violation.isOwnCollection ? (
                      <form action={voteOnObservationAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="observationId" value={violation.id} />
                        <button
                          type="submit"
                          name="voteKind"
                          value="LIKE"
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
                            violation.viewerVote === "LIKE"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                          )}
                        >
                          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                          Upvote
                        </button>
                        <button
                          type="submit"
                          name="voteKind"
                          value="DISLIKE"
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
                            violation.viewerVote === "DISLIKE"
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                          )}
                        >
                          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                          Downvote
                        </button>
                      </form>
                    ) : (
                      <p className="max-w-xs text-xs text-slate-500">
                        {violation.isOwnCollection
                          ? "You cannot vote on a violation you collected."
                          : voteMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 lg:col-span-2">
            No collected violations are attached to this road yet.
          </div>
        )}
      </div>
    </div>
  );
}
