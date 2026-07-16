# RoadWatch

RoadWatch is a civic infrastructure collection game for roads and footpaths.

This MVP turns street maintenance into a Pokemon Go-style resident workflow. Residents sign in, capture live violation photos with GPS, collect sightings, vote on other residents' sightings, and earn points for useful records. Government-labelled users review supported violations, publish repair updates, and attach proof photos. Everyone can see the condition history of the street itself while resident identity stays out of the public record.

## What this demo shows

- Resident-only live capture for road and footpath violations with required GPS
- Full public record per road: approved sightings, upvotes, downvotes, repair history, verification, community context
- Resident and government personas with separate workflows
- Government repair queue sorted by resident support and issue priority
- Private `Collection` view for residents without exposing collector identity publicly
- Resident-only RSS subscriptions plus JSON and CSV export for planners and media
- Collector scoring and leaderboard for gamified reporting
- Seeded sample ward with road and footpath records, issue photos, and repair proof photos

## Quick start

### Runtime requirement

RoadWatch requires Node.js 22 because SQLite uses a native Node module. The
repository includes `.nvmrc`, and npm commands stop immediately with recovery
guidance when another Node major is active.

```bash
fnm use
npm install
```

After changing Node versions, run `npm install` again so native dependencies are
built for the active runtime.

### One command

Run the full demo setup and start the app:

```bash
make demo
```

Then open `http://localhost:3000`.

### What `make demo` does

- creates `.env` from `.env.example` if needed
- installs dependencies
- resets the SQLite demo database
- applies migrations
- seeds the sample ward
- starts the Next.js dev server

## Manual setup

If you prefer to run each step yourself:

```bash
cp .env.example .env
npm install
npm run db:reset
npm run dev
```

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
2. Open a road record and approve or reject any capture awaiting manual review
3. Open a road record such as `/roads/100-feet-road?section=history`
4. Review approved violations sorted by resident support, then priority
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

## Notes

- The demo uses seeded local data and images so it is presentation-ready on a fresh machine.
- Live camera enforcement and person detection are demo-level browser safeguards, not tamper-proof controls. New resident captures are stored as `MANUAL_REVIEW`; only the collector and government reviewers can read the pending record or image. Approval publishes it to road pages, exports, and feeds.
- Rejected captures remain visible in the collector's private history but do not earn points, unlock badges, affect leaderboards, or enter government repair priorities and budgets.
- The server validates GPS coordinate ranges, enforces proximity confirmation, uses server time for duplicate detection, and writes each observation with its ownership receipt in one transaction.
- Restarting or failing camera setup stops every acquired media track before another session can begin.
- Runtime uploads created while testing are ignored from Git; seeded demo assets are committed.

## Export endpoints

- `/api/roads/[slug]/data.json`
- `/api/roads/[slug]/data.csv`
- `/feeds/subscriptions/[token]`
