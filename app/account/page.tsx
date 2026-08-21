import Link from "next/link";
import { Radio, Rss, Trophy, Wrench } from "lucide-react";

import { loginAsDemoUserAction } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { getAccountDashboard, getDemoUsers } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AccountPage() {
  const [user, demoUsers] = await Promise.all([getSessionUser(), getDemoUsers()]);

  if (!user) {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Sign in</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
            Choose account
          </h2>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="grid gap-4 md:grid-cols-3">
            {demoUsers.map((demoUser) => (
              <form
                key={demoUser.id}
                action={loginAsDemoUserAction}
                className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="userId" value={demoUser.id} />
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {demoUser.role === "GOV" ? (
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {demoUser.role === "GOV" ? "Gov repair crew" : "Resident collector"}
                </p>
                <h3 className="mt-2 font-semibold text-slate-950">{demoUser.name}</h3>
                <button
                  type="submit"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Sign in
                </button>
              </form>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const account = await getAccountDashboard(user.id);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="eyebrow text-slate-500">Account</p>
        <h2 className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
          {account.user.name}
        </h2>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          {account.user.role === "GOV" ? "Gov" : "Resident"}
        </p>

        {account.user.role === "RESIDENT" ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/collection"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              My collection
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Leaderboard
            </Link>
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="eyebrow text-slate-500">Subscribed roads</p>

        <div className="mt-4 space-y-3">
          {account.subscriptions.length ? (
            account.subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <Link href={`/roads/${subscription.roadSlug}`} className="font-semibold text-slate-950">
                  {subscription.roadName}
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={subscription.feedUrl}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Rss className="h-4 w-4" aria-hidden="true" />
                    Open RSS
                  </a>
                  <Link
                    href={`/roads/${subscription.roadSlug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Radio className="h-4 w-4" aria-hidden="true" />
                    Street feed
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No road subscriptions yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="eyebrow text-slate-500">Community activity</p>
        <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
          Your discussion trail
        </h3>

        <div className="mt-4 space-y-3">
          {account.discussions.length ? (
            account.discussions.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {entry.category}
                    </p>
                    <Link
                      href={`/roads/${entry.roadSlug}?section=community&community=${entry.category.toLowerCase()}`}
                      className="mt-1 block font-semibold text-slate-950"
                    >
                      {entry.title}
                    </Link>
                    <p className="mt-2 text-sm text-slate-600">{entry.body}</p>
                  </div>
                  <div className="text-xs text-slate-500 sm:text-right">
                    <p>{formatDate(entry.createdAt)}</p>
                    <p>{entry.agreementCount} agreement</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No community entries yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
