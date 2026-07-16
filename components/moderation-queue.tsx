import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { moderateObservationAction } from "@/app/actions";
import { severityBandMeta } from "@/lib/constants";
import type { PendingModerationCapture } from "@/lib/data";
import { cn, formatDateTime } from "@/lib/utils";

type ModerationQueueProps = {
  captures: PendingModerationCapture[];
};

export function ModerationQueue({ captures }: ModerationQueueProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-slate-500">Awaiting review</p>
          <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            Pending captures across every road
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Approve a capture to publish it, or reject it to keep it out of public records and scores.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {captures.length ? (
          captures.map((capture) => (
            <div
              key={capture.id}
              className="overflow-hidden rounded-[1.45rem] border border-slate-200 bg-slate-50"
            >
              <Image
                src={capture.evidencePath}
                alt={`${capture.issueLabel} capture on ${capture.roadName}`}
                width={1200}
                height={900}
                unoptimized={capture.evidencePath.startsWith("/api/observations/")}
                className="aspect-[4/3] w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              <div className="space-y-4 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{capture.issueLabel}</p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        severityBandMeta[capture.severityBand].tone,
                      )}
                    >
                      {capture.severityLabel}
                    </span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Manual review pending
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {capture.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <Link
                      href={`/roads/${capture.roadSlug}`}
                      className="font-semibold text-slate-700"
                    >
                      {capture.roadName} · {capture.assetLabel}
                    </Link>
                    <span>severity {capture.severityScore}</span>
                    <span>collected {formatDateTime(capture.submittedAt)}</span>
                    {capture.collectorLabel ? (
                      <span>by {capture.collectorLabel}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      GPS {capture.gpsLat.toFixed(5)}, {capture.gpsLng.toFixed(5)}
                    </span>
                  </div>
                </div>

                <form
                  action={moderateObservationAction}
                  className="flex flex-wrap gap-2"
                >
                  <input type="hidden" name="observationId" value={capture.id} />
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
                </form>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 lg:col-span-2">
            No captures are waiting for review right now.
          </div>
        )}
      </div>
    </div>
  );
}
