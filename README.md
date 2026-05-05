# RoadWatch

RoadWatch is a civic infrastructure intelligence demo for roads and footpaths.

This MVP is built around one idea: the public record should focus on the asset, not the person who noticed the problem. Residents add anonymous observations to a road or footpath record. Government-labelled users review those complaints, publish repair updates, and attach proof photos. Everyone can see the condition history of the street itself.

## What this demo shows

- Anonymous road and footpath complaints tied to the asset, not to public identity
- Full public record per road: current issues, repair history, verification, community context
- Resident and government personas with separate workflows
- Government repair queue sorted by public support and issue priority
- Private `My complaints` view for residents without exposing reporter identity publicly
- RSS subscriptions, JSON export, and CSV export for planners and media
- Seeded sample ward with road and footpath records, issue photos, and repair proof photos

## Quick start

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
4. Capture a live photo and submit a complaint
5. Open `My complaints` to review your private complaint trail
6. Open the road record to see the complaint in the public record

### Government flow

1. Sign in as `Ward Engineer`
2. Open a road record such as `/roads/100-feet-road?section=history`
3. Review pending complaints sorted by likes first, then priority
4. Open a complaint
5. Record a repair update and attach a repair proof photo

## Main routes

- `/` overview dashboard
- `/report` resident complaint entry flow
- `/my-complaints` resident-only private complaint list
- `/account` demo sign-in and account area
- `/roads/[slug]` road or footpath public record
- `/roads/[slug]/repairs/[clusterKey]` government repair form for a specific complaint
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
```

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma 7
- SQLite with `better-sqlite3`
- MapLibre GL

## Notes

- The demo uses seeded local data and images so it is presentation-ready on a fresh machine.
- Live camera enforcement and person detection are demo-level browser safeguards, not tamper-proof controls.
- Runtime uploads created while testing are ignored from Git; seeded demo assets are committed.

## Export endpoints

- `/api/roads/[slug]/data.json`
- `/api/roads/[slug]/data.csv`
- `/feeds/subscriptions/[token]`
