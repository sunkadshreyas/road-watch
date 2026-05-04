import Link from "next/link";

import { loginAsDemoUserAction } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { getAccountDashboard, getDemoUsers } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AccountPage() {
  const [user, demoUsers] = await Promise.all([getSessionUser(), getDemoUsers()]);

  if (!user) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Sign in</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            Sign in to the private account layer without exposing public identity.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Accounts exist only to manage subscriptions, issue voting, discussions, and government-labelled repair updates. Observations themselves remain anonymous and detached from these profiles.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_22px_60px_-34px_rgba(15,23,42,0.52)]">
          <p className="eyebrow text-teal-300">How the MVP handles access</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <p>Resident demo accounts can discuss roads, appreciate good fixes, propose solutions, and save RSS feeds.</p>
            <p>Resident accounts can also like a public issue record to support it or dislike it when it appears false.</p>
            <p>The government-labelled account can mark repairs as scheduled, in progress, or repaired.</p>
            <p>No public screen reveals the underlying account identity. Only role labels appear.</p>
          </div>
        </section>

        <section className="lg:col-span-2 rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Choose a seeded profile</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {demoUsers.map((demoUser) => (
              <form
                key={demoUser.id}
                action={loginAsDemoUserAction}
                className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="userId" value={demoUser.id} />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {demoUser.role === "GOV" ? "Gov label" : "Resident"}
                  </p>
                  <h3 className="font-semibold text-slate-950">{demoUser.name}</h3>
                  <p className="text-sm text-slate-600">{demoUser.email}</p>
                  <p className="text-sm text-slate-500">{demoUser.wardName}</p>
                </div>
                <button
                  type="submit"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Sign in as {demoUser.role === "GOV" ? "officer" : "resident"}
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
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">Account</p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            {account.user.name}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            This account is used only for managing your private complaint list, road subscriptions, issue voting, community participation, and, when applicable, government-labelled repair updates.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Role</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {account.user.role === "GOV" ? "Gov" : "Resident"}
            </p>
            <p className="mt-2 text-sm text-slate-600">{account.user.publicLabel}</p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Subscriptions</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {account.subscriptions.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">Saved RSS feeds for road records you follow.</p>
          </div>
          {account.user.role === "RESIDENT" ? (
            <Link
              href="/my-complaints"
              className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur transition hover:border-slate-300 hover:bg-white"
            >
              <p className="eyebrow text-slate-500">My complaints</p>
              <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
                {account.complaintsCount}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Privately review the complaints you submitted without exposing them as your public identity.
              </p>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-500">Saved feeds</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                RSS subscriptions
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {account.subscriptions.length ? (
              account.subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <Link href={`/roads/${subscription.roadSlug}`} className="font-semibold text-slate-950">
                        {subscription.roadName}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">
                        Minimum severity {subscription.minSeverity} · {subscription.eventTypes.join(", ")}
                      </p>
                    </div>
                    <code className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-200">
                      {subscription.feedUrl}
                    </code>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No RSS subscriptions yet. Save one from a road record page.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-500">Community activity</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Your discussion trail
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {account.discussions.length ? (
              account.discussions.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
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
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{formatDate(entry.createdAt)}</p>
                      <p>{entry.agreementCount} agreement</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{entry.body}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No community entries yet. Join a road discussion or add an appreciation note.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
