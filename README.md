# RoadWatch

RoadWatch is a civic infrastructure collection game for roads and footpaths.

This MVP turns street maintenance into a Pokemon Go-style resident workflow. Residents sign in, capture live violation photos with GPS, collect sightings, vote on other residents' sightings, and earn points for useful records. Government-labelled users review supported violations, publish repair updates, and attach proof photos. Everyone can see the condition history of the street itself while resident identity stays out of the public record.

## What this demo shows

- Resident-only live capture for road and footpath violations with required GPS
- Full public record per road: approved sightings, upvotes, downvotes, repair history, verification, community context
- Resident and government personas with separate workflows
- Government repair queue sorted by repair priority, then severity
- Central government moderation queue that gates every resident capture before it reaches public records, scores, and repair planning
- Private `Collection` view for residents without exposing collector identity publicly
- Resident-only RSS subscriptions plus JSON and CSV export for planners and media
- Collector scoring and leaderboard for gamified reporting
- Seeded sample ward with road and footpath records, issue photos, and repair proof photos

## First-time setup

These instructions set up the local, seeded demo from a fresh checkout. RoadWatch
uses SQLite for local development, so no separate database server is required.

### Prerequisites

- Node.js 22.x
- npm
- `make` for the recommended one-command setup

### Runtime requirement

RoadWatch requires Node.js 22 because SQLite uses a native Node module. The
repository includes `.nvmrc`, and npm commands stop immediately with recovery
guidance when another Node major is active.

```bash
fnm use
```

If you use `nvm` instead, run `nvm use`. The repository's `.nvmrc` selects the
expected Node version.

The recommended `make demo` command installs dependencies for the active
runtime. If you use the manual setup below, run `npm install` after changing
Node versions so native dependencies are rebuilt.

### Recommended setup

From the repository root, run:

```bash
make demo
```

This creates the local environment file when needed, installs dependencies,
resets and seeds the SQLite database, and starts the Next.js development server.
Open `http://localhost:3000` when the server is ready.

### What `make demo` does

- creates `.env` from `.env.example` if needed
- installs dependencies
- resets the SQLite demo database
- applies migrations
- seeds the sample ward
- starts the Next.js dev server

### Manual setup

If you prefer to run each step yourself:

```bash
fnm use # or: nvm use
cp .env.example .env
npm install
npm run db:reset
npm run dev
```

If you already have a local `.env`, keep it and skip the copy step. The default
configuration uses `file:./dev.db` and `http://localhost:3000`.

## Demo accounts

Use `http://localhost:3000/account` and sign in as one of the seeded profiles:

- `Resident Desk A`
- `Resident Desk B`
- `Ward Engineer`

## Demo walkthrough

### Resident flow

1. Sign in as `Resident Desk A`
2. Open `Report issue`
3. Choose a road or footpath
4. Capture a live GPS-backed photo and collect a violation
5. Open `Collection` to review your private violation trail and points
6. Open the road record to see the sighting in your private pending-review view
7. Upvote or downvote other residents' sightings
8. Subscribe to the road RSS feed for new sightings, votes, repairs, and verification updates

After a government reviewer approves the capture, it becomes visible on the
public road record and in public exports and feeds.

### Government flow

1. Sign in as `Ward Engineer`
2. Open `Moderation` to review the central queue and approve or reject any capture awaiting manual review, or moderate a capture inline on its road record
3. Open a road record such as `/roads/100-feet-road?section=history`
4. Review approved violations sorted by repair priority, then severity
5. Open a repair task
6. Record a repair update and attach a repair proof photo
7. Confirm that government users cannot collect violations, vote, or subscribe to resident RSS feeds

## Main routes

- `/` overview dashboard
- `/report` resident violation collection flow
- `/collection` resident-only private collection list
- `/my-complaints` legacy redirect to `/collection`
- `/account` demo sign-in and account area
- `/roads/[slug]` road or footpath public record
- `/roads/[slug]/repairs/[clusterKey]` government repair form for a specific violation cluster
- `/leaderboard` resident collector leaderboard
- `/moderation` government-only central moderation queue for captures awaiting review
- `/rankings` government-only budget and priority view
- `/insights` government-only repeat-failure and waste view

## Useful commands

```bash
make help
make setup
make demo
make reset-demo
make dev
make lint
make build
make verify
make verify-mobile
```

`make verify` runs lint, tests, the production build, and mobile anonymous/resident/admin verification.

`make verify-mobile` checks the mobile anonymous, resident, and government flows at 360px and 390px widths, including resident account RSS links and government account restrictions. It writes screenshots to `/tmp/roadwatch-mobile-*.png` and writes `/tmp/roadwatch-mobile-report.json`. By default it creates a fresh seeded database and starts the current working tree on an isolated random loopback port. Set `ROADWATCH_BASE_URL` only when you intentionally want to verify an existing server.

Mobile verification covers this matrix:

| Persona | Routes | Checks |
| --- | --- | --- |
| Anonymous | `/roads/100-feet-road` | Can view collected violations, cannot capture, vote, or subscribe |
| Resident | `/roads/100-feet-road`, `/report`, `/collection`, `/leaderboard`, `/account` | Can collect, vote, see GPS evidence, view levels/badges, and open RSS feed links |
| Government | `/roads/100-feet-road`, `/roads/metro-footpath-east/repairs/cart-stack-entrance`, `/account` | Can access repair workflows, cannot vote, collect, or use resident RSS actions |

Each route is checked at 360px and 390px widths, for 18 mobile checks total.

Mobile verification can be pointed at another target or output directory:

```bash
ROADWATCH_BASE_URL=http://localhost:3001 \
ROADWATCH_SCREENSHOT_DIR=/tmp/roadwatch-mobile \
ROADWATCH_MOBILE_REPORT=/tmp/roadwatch-mobile/report.json \
npm run verify:mobile
```

See [docs/mobile-completion-audit.md](docs/mobile-completion-audit.md) for the
objective-to-evidence audit. See
[docs/browser-verification.md](docs/browser-verification.md) for the independent
in-app Browser review.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma 7
- SQLite with `better-sqlite3`
- MapLibre GL
- Expo SDK 54 native resident app under `mobile/`

## Notes

- The demo uses seeded local data and images so it is presentation-ready on a fresh machine.
- Live camera enforcement and person detection are demo-level browser safeguards, not tamper-proof controls. New resident captures are stored as `MANUAL_REVIEW`; only the collector and government reviewers can read the pending record or image. Approval publishes it to road pages, exports, and feeds.
- Only cleared captures earn points, unlock badges, affect leaderboards, or enter government repair priorities and budgets. Pending captures appear in the collector's private history but do not score until a reviewer clears them, and rejected captures stay in that history without ever scoring.
- The server validates GPS coordinate ranges, enforces proximity confirmation, uses server time for duplicate detection, and writes each observation with its ownership receipt in one transaction.
- Restarting or failing camera setup stops every acquired media track before another session can begin.
- Runtime uploads created while testing are ignored from Git; seeded demo assets are committed.

## Export endpoints

- `/api/roads/[slug]/data.json`
- `/api/roads/[slug]/data.csv`
- `/feeds/subscriptions/[token]`

## Native resident app

The additive Expo app lives under `mobile/`. Returning residents with a valid
session, completed safety onboarding, and camera and foreground-location
permissions open directly on the native capture route. Nearby, collection,
leaderboard, profile, permission recovery, and offline queue helpers are native
routes, not WebView screens.

```bash
cd mobile
npm install
npm test
npm run typecheck
npx expo export --platform android
npx expo export --platform ios
```

The exports validate Metro bundling. Internal device builds still require
bundle identifiers, EAS or local signing credentials, and physical iOS and
Android devices. The native app does not claim device verification until those
inputs exist.

Government users can open `/admin` for ward road selection, a central pending
moderation queue, and a separate repair queue. Moderation remains separate from
the repair lifecycle, and approved captures are the only records used for
public nearby views and game scoring.

## Local native API adapter

The read-only `/api/v1` routes require an `Authorization: Bearer` header and do
not accept the demo web cookie. For local integration, set
`ROADWATCH_API_TOKENS_JSON` to a JSON object that maps locally managed opaque
tokens to existing user IDs. Tokens must contain at least 16 characters. The
adapter has no default token and fails closed when the variable is unset or a
mapping does not match.

This environment adapter is for local development only. It does not issue,
rotate, hash, or persist credentials, and must be replaced by a production
identity provider before deployment.

Protected routes:

- `/api/v1/me`
- `/api/v1/me/collection`
- `/api/v1/violations/nearby?lat=<latitude>&lng=<longitude>&radiusMeters=<radius>`
- `/api/v1/leaderboard?window=all|month|week`
- `/api/v1/auth/session` returns an explicit provider-configuration blocker
  until an approved OIDC provider is connected.

Successful responses use `{ "data": ... }`. Errors use
`{ "error": { "code": "...", "message": "..." } }`.
