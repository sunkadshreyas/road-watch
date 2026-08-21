import Link from "next/link";

import { getSessionUser } from "@/lib/auth";
import { getCollectorLeaderboard } from "@/lib/data";
import { parseLeaderboardWindow, type LeaderboardWindow } from "@/lib/collector-score";

const leaderboardWindowLabels: Record<LeaderboardWindow, string> = {
  all: "All time",
  month: "This month",
  week: "This week",
};

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
      <p className="eyebrow text-slate-500">{label}</p>
      <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
    </div>
  );
}

function readSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    window?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const window = parseLeaderboardWindow(readSearchValue(resolvedSearchParams.window));
  const [user, leaderboard] = await Promise.all([
    getSessionUser(),
    getCollectorLeaderboard(window),
  ]);
  const currentUserEntry = user
    ? leaderboard.entries.find((entry) => entry.userId === user.id)
    : null;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Leaderboard</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            Top resident collectors.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Scores use collected violations, likes received, and dislikes received. Public labels
            are shown here; private names and emails stay out of the ranking. Current view:{" "}
            {leaderboardWindowLabels[leaderboard.window].toLowerCase()}.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/report"
              className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
            >
              Collect violation
            </Link>
            <Link
              href="/collection"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              My collection
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["all", "month", "week"] as LeaderboardWindow[]).map((option) => (
              <Link
                key={option}
                href={option === "all" ? "/leaderboard" : `/leaderboard?window=${option}`}
                className={
                  leaderboard.window === option
                    ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                }
              >
                {leaderboardWindowLabels[option]}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard
            label="Collectors"
            value={String(leaderboard.totals.residentCount)}
            note="Resident profiles included in this ward leaderboard."
          />
          <StatCard
            label="Collected"
            value={String(leaderboard.totals.collectedViolationCount)}
            note="Violations linked to resident collections."
          />
          <StatCard
            label="Likes"
            value={String(leaderboard.totals.likeCount)}
            note="Confirmations received on individual violations."
          />
          <StatCard
            label="Dislikes"
            value={String(leaderboard.totals.dislikeCount)}
            note="Disputes received on individual violations."
          />
        </div>
      </section>

      {currentUserEntry ? (
        <section className="rounded-[1.6rem] border border-teal-200 bg-teal-50 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow text-teal-700">Your rank</p>
              <p className="mt-1 text-sm text-teal-900">
                {currentUserEntry.publicLabel} is ranked #{currentUserEntry.rank} with{" "}
                {currentUserEntry.score.totalScore} points.
              </p>
            </div>
            <Link href="/collection" className="text-sm font-semibold text-teal-800">
              Open collection
            </Link>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/82 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="eyebrow text-slate-500">Resident ranking</p>
          <p className="mt-1 text-sm text-slate-600">
            {leaderboardWindowLabels[leaderboard.window]} score window.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {leaderboard.entries.length ? (
            leaderboard.entries.map((entry) => (
              <div
                key={entry.userId}
                className="grid gap-4 px-5 py-5 lg:grid-cols-[72px_1fr_auto] lg:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {entry.rank}
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-slate-950">{entry.publicLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{entry.score.submittedViolationCount} collected</span>
                    <span>{entry.score.receivedLikeCount} likes</span>
                    <span>{entry.score.receivedDislikeCount} dislikes</span>
                    <span>collection +{entry.score.submissionPoints}</span>
                    <span>likes +{entry.score.likePoints}</span>
                    <span>dislikes -{entry.score.dislikePenalty}</span>
                  </div>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
                    {entry.score.totalScore}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Points
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">
              No resident collectors yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
