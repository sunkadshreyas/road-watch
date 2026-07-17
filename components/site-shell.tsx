import Link from "next/link";
import { Camera, Trophy, UserCircle, Wrench } from "lucide-react";

import { logoutAction } from "@/app/actions";

type SiteShellProps = {
  user: {
    name: string;
    role: "RESIDENT" | "GOV";
  } | null;
  children: React.ReactNode;
};

export function SiteShell({ user, children }: SiteShellProps) {
  const navItems =
    user?.role === "GOV"
      ? [
          { href: "/", label: "Overview" },
          { href: "/admin", label: "Review queue" },
          { href: "/rankings", label: "Rankings" },
          { href: "/insights", label: "Insights" },
        ]
      : user?.role === "RESIDENT"
        ? [
            { href: "/", label: "Overview" },
            { href: "/collection", label: "My collection" },
            { href: "/leaderboard", label: "Leaderboard" },
          ]
        : [{ href: "/", label: "Overview" }];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(244,63,94,0.12),_transparent_26%),linear-gradient(180deg,_#f7f3eb_0%,_#eef6f1_44%,_#ece9df_100%)] text-slate-900">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 mb-8 rounded-[2rem] border border-white/70 bg-white/70 px-5 py-4 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.5)] backdrop-blur md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  RoadWatch
                </p>
                <h1 className="font-[family:var(--font-display)] text-2xl font-semibold tracking-tight text-slate-950">
                  RoadWatch
                </h1>
              </Link>
              {user ? (
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 sm:hidden">
                  {user.role === "GOV" ? "Gov label" : "Resident access"}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <nav className="flex flex-wrap gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <Link
                  href="/account"
                  className={
                    user
                      ? "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      : "inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  }
                >
                  <UserCircle className="h-4 w-4" aria-hidden="true" />
                  {user ? "Account" : "Sign in"}
                </Link>
              </div>

              {user ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {user.role === "RESIDENT" ? (
                    <Link
                      href="/report"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
                    >
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      Collect violation
                    </Link>
                  ) : null}
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 sm:flex">
                    {user.role === "GOV" ? (
                      <Wrench className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Trophy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {user.role === "GOV" ? "Gov label" : "Resident access"}
                  </div>
                  <div className="min-w-0 text-left sm:text-right">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                  </div>
                  <form action={logoutAction}>
                    <input type="hidden" name="redirectTo" value="/account" />
                    <button
                      type="submit"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
                  >
                    <UserCircle className="h-4 w-4" aria-hidden="true" />
                    Choose account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-12 text-sm text-slate-500">RoadWatch</footer>
      </div>
    </div>
  );
}
