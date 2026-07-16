# Mobile completion audit

This note maps the Pokemon Go-style violation collection objective to the current
verification evidence.

## Objective evidence

| Requirement | Current evidence |
| --- | --- |
| Residents capture violation photos | `components/live-observation-form.tsx` renders the live capture flow, downsizes frames, and releases camera tracks on restart, cancellation, or failure; `app/actions.ts` validates the data URL and decoded size, rejects reported person detections, and stores new captures as `MANUAL_REVIEW` because browser claims are not authoritative. |
| Capture location and GPS | `app/actions.ts` calls `requireGpsPoint`, verifies proximity on the server, and requires explicit distant-road confirmation; `lib/geo.ts` rejects missing and out-of-range coordinates; road and collection views display GPS chips. |
| Residents view street violations | `/roads/[slug]`, `/report`, and `/collection` render approved public violations plus the signed-in collector's private pending records. Pending records and protected evidence images become public only after a government approval action. |
| Residents upvote and downvote | `voteOnObservationAction` requires a resident account and rejects votes on the resident's own capture; mobile verification checks upvote and downvote controls for residents only. |
| Gamified resident workflow | `/collection` shows level, XP, score, badges, and private collection cards; `/leaderboard` ranks resident collectors; rejected captures remain in private history but are excluded from points, levels, badges, and rankings. |
| Resident RSS subscriptions | `createSubscriptionAction` requires a resident account; `tests/auth.test.ts` proves government accounts are rejected from resident subscription guards; `/account` exposes RSS feed links; `/feeds/subscriptions/[token]` includes observation, vote, repair, and verification events. |
| Government review and repair account | `moderateObservationAction` and `recordRepairAction` require government role; moderation decisions are one-time compare-and-set updates; only cleared observations feed issue clusters, condition, budgets, priorities, and repair queues; `voteOnObservationAction` requires resident role and approved evidence; `tests/auth.test.ts` proves government accounts are rejected from collection/voting guards and residents are rejected from repair guards; repair pages redirect non-government users; mobile verification checks that government views do not expose vote, collect, or resident RSS actions. |
| Mobile view works | `npm run verify:mobile` checks anonymous, resident, and government flows at 360px and 390px against a fresh seeded database, writes screenshots, rejects horizontal overflow, rejects mobile MapLibre controls, and fails on console errors. An independent in-app Browser review covers the resident capture, collection, leaderboard, road, and government repair surfaces. |

## Verification commands

```bash
npm run verify
```

This runs lint, the full Node test suite, a production Next.js build, and the
mobile verification matrix.

```bash
npm run verify:mobile
```

This writes `/tmp/roadwatch-mobile-report.json` and full-page screenshots named
`/tmp/roadwatch-mobile-*.png`.

Without `ROADWATCH_BASE_URL`, the verifier chooses an isolated random loopback
port, creates a fresh migrated and seeded database, and starts the current
working tree. An explicit `ROADWATCH_BASE_URL` opts into checking that server.
The temporary database setup uses `prisma migrate deploy` plus a direct seed and
does not invoke a destructive reset.
Each test-owned Next server also uses a unique ignored build directory and a
generated temporary TypeScript config. This lets verification coexist with a
developer server in the same checkout without sharing a lock or dirtying
`tsconfig.json`.

The mobile report includes:

- `requestedAutomationBackend`
- `automationBackend`
- `automationBackendConstraint`
- `databaseFixture`
- expected and actual check counts
- expected and actual persona counts
- screenshot paths
- layout width measurements
- console error counts
- per-page failures

## Current verification evidence

On 16 July 2026, the repository Playwright verifier completed all 18 checks with
zero failures and zero console errors. The report recorded:

- `requestedAutomationBackend: "playwright"`
- `automationBackend: "playwright"`
- `automationBackendConstraint: null`
- `databaseFixture: "fresh-seed"`
- `mayReuseExistingServer: false`
- `status: "passed"`

The independent in-app Browser review also found no horizontal overflow or
console errors. It confirmed distinct public leaderboard labels, no resident
emails in public rankings, and correct resident and government action boundaries.
See `docs/browser-verification.md` for the checked routes and results.
