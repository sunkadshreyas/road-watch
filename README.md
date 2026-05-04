# RoadWatch

RoadWatch is a local MVP for a public road and footpath intelligence platform.

The product model is asset-first:

- Observations attach to a road or footpath record, not to a person.
- Repair history is tracked publicly, including whether a fix actually held.
- Community discussion, appreciation, and solutions live alongside the road record.
- RSS subscriptions, CSV export, and JSON preview make the data usable for residents, planners, and media.

## MVP scope

- Seeded sample ward using OSM-style geometry
- Mobile-friendly web UI
- Anonymous live-camera observations with GPS metadata
- Client-side person detection gate before submission
- Government-labelled repair updates
- Public repair verification
- Account-only discussions and RSS subscriptions
- Rankings, insights, and per-road data export views

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma 7
- SQLite with the `better-sqlite3` Prisma adapter
- MapLibre GL

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Generate the Prisma client:

```bash
npm run db:generate
```

3. Apply migrations:

```bash
npx prisma migrate dev --name init
```

4. Seed the sample ward:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo accounts

Use the account page to switch into seeded demo profiles:

- `Resident Desk A`
- `Resident Desk B`
- `Ward Engineer`

Observations remain anonymous even when a user is signed in. Accounts are only used for:

- discussions
- appreciation notes
- solution proposals
- RSS subscriptions
- government-labelled repair updates
- repair verification

## Useful scripts

```bash
npm run lint
npm run build
npm run db:generate
npm run db:seed
npm run db:reset
```

## Main routes

- `/` overview dashboard
- `/rankings` budget and priority view
- `/insights` repeat-failure and repair-quality view
- `/account` demo sign-in and saved subscriptions
- `/roads/[slug]` road or footpath record

## Export routes

- `/api/roads/[slug]/data.json`
- `/api/roads/[slug]/data.csv`
- `/feeds/subscriptions/[token]`
