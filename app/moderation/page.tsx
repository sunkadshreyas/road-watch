import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { ModerationQueue } from "@/components/moderation-queue";
import { getSessionUser } from "@/lib/auth";
import { getPendingModerationQueue } from "@/lib/data";

export default async function ModerationPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/account");
  }

  if (user.role !== "GOV") {
    redirect("/");
  }

  const queue = await getPendingModerationQueue();

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <ShieldCheck className="h-4 w-4 text-amber-700" aria-hidden="true" />
          Government moderation
        </p>
        <h2 className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
          Review queue
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          Every resident capture waits here until a government-labelled account approves it.
          Nothing publishes to public records, scores, or repair planning until it is cleared.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
            {queue.totalCount} awaiting review
          </span>
          <Link
            href="/rankings"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          >
            Repair rankings
          </Link>
        </div>
      </section>

      <ModerationQueue captures={queue.captures} />
    </div>
  );
}
