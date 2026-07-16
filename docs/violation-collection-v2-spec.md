# Spec: Violation Collection V2

## Assumptions
1. This remains a Next.js web app, optimized for mobile browser use rather than a native iOS/Android app.
2. The current live camera requirement stays: users collect violations by taking a live photo, not uploading from the gallery.
3. The existing resident and government account roles remain, with residents collecting and voting while government users review and act on records.
4. The app keeps privacy protections from the current MVP: public road records do not expose a resident's email or private identity.
5. Road subscriptions continue to use the existing subscription model, with UI copy expanded from RSS-style feeds to product-facing road updates.
6. Points are computed from persistent events so they can be audited and recalculated, not stored only as a mutable total.

## Objective
Build the next version of RoadWatch around a collection loop inspired by location-based games: residents walk along roads, capture visible civic violations, and build a public collection of verified road issues.

The feature should make three resident workflows feel first-class:

- Collect: take a live photo of a violation while near or on a road, attach it to the road, and receive +10 points.
- Confirm: view violations collected by other users on a road, like if it exists or dislike if it does not.
- Follow: subscribe to a road and receive updates when violations are added, voted on, repaired, or disputed.

The feature should also add a leaderboard where resident scores are calculated as:

- +10 for each submitted violation.
- +1 for each like on the user's submitted violation.
- -2 for each dislike on the user's submitted violation.

## First Persona: Resident Collector

### Persona Summary
The first persona is a resident who regularly walks through their neighborhood and wants visible road problems to be acknowledged. They are not using the app for civic analysis or government workflow. They are using it in short outdoor sessions, usually on a phone, when they notice something wrong on a road or footpath.

### Goals
- Capture a violation quickly before moving on.
- Know which road the violation will be attached to.
- Build a personal collection of submitted violations.
- Earn points for useful submissions.
- See whether other residents confirm or dispute their submissions.

### Motivations
- They want road issues to become visible without filing a long complaint.
- They like a lightweight game loop where useful civic action earns progress.
- They care about their local roads more than city-wide analytics.

### Frictions
- They may be outdoors with poor connectivity.
- They may not know the official road name.
- They may not want to write a long description.
- They may be uncomfortable if the app feels like it exposes their identity.
- They may abandon the flow if camera capture, road selection, or submission takes too long.

### Primary User Story
As a resident collector, I want to take a live photo of a visible violation on a road, submit it with minimal typing, and see it added to my collection with points so that reporting feels quick and rewarding.

### Initial Scope For This Persona
- Mobile-first collection flow from `/report`.
- Road selection using the existing road list, with selected road context shown clearly.
- GPS-assisted nearby road sorting from `/report`.
- Capture-time GPS proximity feedback against the selected road.
- Distant capture confirmation before submit when GPS does not look close to the selected road.
- Post-submit success actions for collection, leaderboard, and collecting another violation.
- Rapid duplicate collection guard for the same resident, issue type, road, time window, and nearby GPS point.
- Live camera capture using the existing `LiveObservationForm`.
- Violation type, optional short description, severity, and GPS capture when available.
- Successful submission creates a collected violation tied to the signed-in resident.
- The resident can see their collected violations and point breakdown on account or collection page.
- A simple leaderboard can be included only after the collector score read model exists.

### Out Of Scope For First Persona Slice
- Government repair workflow changes.
- Push notifications.
- Native mobile background location tracking.
- City-wide analytics.
- Advanced anti-abuse or moderator workflow beyond the implemented approve-or-reject publication gate.
- Rich social profiles, comments, badges, streaks, or teams.

## Tech Stack
- Next.js 16.2.4 with App Router.
- React 19.2.4.
- TypeScript.
- Prisma 7.8.0.
- SQLite through `@prisma/adapter-better-sqlite3`.
- Tailwind CSS 4.
- MapLibre GL for road map UI.
- Existing server actions in `app/actions.ts`.
- Existing Node test runner through `node --import tsx --test`.

Before implementing route or framework behavior, read the relevant Next.js guide in `node_modules/next/dist/docs/` because this repository is on a newer Next.js version with breaking changes.

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Prisma generate: `npm run db:generate`
- Prisma migration: `npm run db:migrate`
- Seed demo data: `npm run db:seed`
- Reset demo database: `npm run db:reset`

## Project Structure
- `app/` -> Next.js routes, pages, server actions, and API routes.
- `app/report/page.tsx` -> current live observation entry point; should evolve into the collection flow.
- `app/roads/[slug]/page.tsx` -> road detail page; should show collected violations, voting, and subscription status.
- `app/rankings/page.tsx` -> current government road ranking page; do not reuse as the resident leaderboard without resolving route naming.
- `components/` -> reusable client and server components.
- `components/live-observation-form.tsx` -> current camera capture component; likely the base for collection capture.
- `components/public-record-list.tsx` -> current clustered issue display and voting UI.
- `components/subscription-form.tsx` -> existing road subscription UI.
- `lib/data.ts` -> read models for dashboards, roads, rankings, and account pages.
- `prisma/schema.prisma` -> persistent models for users, roads, observations, subscriptions, votes, and future score events if needed.
- `tests/` -> Node test runner tests.
- `docs/` -> product and implementation specs.

## Code Style
Follow the existing server-action style: parse and validate form fields near the action, check authorization before mutation, write through Prisma, and revalidate affected routes.

```ts
export async function voteOnCollectedViolationAction(formData: FormData) {
  const user = await requireResidentUser();
  const observationId = requiredString(formData, "observationId", "Violation");
  const voteKind = parseIssueVoteKind(formData);

  await prisma.observationVote.upsert({
    where: {
      observationId_userId: {
        observationId,
        userId: user.id,
      },
    },
    create: {
      observationId,
      userId: user.id,
      kind: voteKind,
    },
    update: {
      kind: voteKind,
    },
  });

  revalidatePath("/leaderboard");
}
```

Naming conventions:

- Use product language `violation` in resident-facing UI.
- Keep existing database names such as `Observation` where they already represent the same concept, unless a migration is explicitly approved.
- Use `like` and `dislike` in UI, backed by `IssueVoteKind.LIKE` and `IssueVoteKind.DISLIKE` or a dedicated observation vote model.
- Prefer server-side read models in `lib/data.ts` over duplicating Prisma queries in pages.

## Functional Requirements

### First Slice Requirements: Resident Collector
- The signed-in resident can open `/report` as the primary collection screen.
- The resident can choose the road or footpath from existing road records.
- The resident can use current location to rank nearby road or footpath records before collecting.
- The page shows the selected road name, asset type, and nearby record context before capture.
- After live capture, the form shows whether the GPS point is close to the selected road.
- If the GPS point is not close to the selected road, the resident must explicitly confirm the road before submitting.
- After a successful collection, the resident can jump to their collection, the leaderboard, or continue collecting.
- The server blocks a resident from repeatedly collecting the same nearby violation within a short window.
- The resident takes a live camera photo of a visible violation.
- The resident selects a violation type from the existing issue taxonomy unless a new taxonomy is approved.
- The description should be optional or lightweight for the first slice; the UI must not feel like a formal complaint form.
- The app stores GPS latitude and longitude when available.
- The app rejects captures where the current person-detection flow identifies a person in frame.
- The server does not trust browser person-detection output as authoritative clearance. New resident captures use `MANUAL_REVIEW` and expose that state on the public capture card.
- On successful submission, the violation appears in the user's collection and private road view. It appears publicly after government approval.
- The submitting resident earns +10 points once per saved violation.
- The account or collection page shows the resident's collected violations and score breakdown.
- Residents can like or dislike individual collected violations created by other residents.
- The collector score includes +1 per like received and -2 per dislike received.

### Later Slice Requirements

#### Collection Flow
- A resident can open a collection screen from the main navigation or from a selected road page.
- The app shows nearby or selected road context before capture.
- The resident takes a live camera photo of a visible violation.
- The resident selects a violation type from the existing issue taxonomy unless a new taxonomy is approved.
- The app stores GPS latitude and longitude when available.
- The app rejects captures where the current person-detection flow identifies a person in frame.
- On successful submission, the violation appears in the user's collection and private road view. It appears publicly after government approval.
- The submitting resident earns +10 points once per saved violation.

#### Road Violation View
- A road page lists collected violations for that road. Implemented as the primary resident-facing record surface.
- Each violation shows type, photo, description, submit time, vote counts, and current credibility signal. Implemented.
- Residents can like a violation if they see that it exists. Implemented.
- Residents can dislike a violation if they believe it does not exist or is no longer valid. Implemented.
- A resident can have only one active vote per violation. Implemented.
- The original collector cannot vote on their own violation. Implemented with `ObservationVote`.
- Government users can view votes but cannot participate in resident voting. Implemented.
- Cluster-level public records remain as compact grouped summaries, without duplicate voting controls.

#### Road Subscriptions
- A signed-in user can subscribe to a road. Implemented.
- Subscriptions notify or expose updates for new violations, vote changes, repair updates, and disputed violations. Implemented through RSS feed items, including observation-level vote updates.
- The existing subscription feed route can remain the first delivery mechanism. Implemented.
- Account pages should show subscribed roads and available feed links. Implemented.

#### Leaderboard
- Add a resident-facing leaderboard route, preferably `/leaderboard`. Implemented as `/leaderboard`.
- Display residents ordered by score. Implemented.
- Show rank, public label, total score, collected violation count, received likes, and received dislikes. Implemented.
- Do not expose private emails. Implemented.
- Score formula: `10 * submittedViolationCount + receivedLikeCount - 2 * receivedDislikeCount`. Implemented.
- Scores should update after creating a violation or voting. Implemented through server-rendered read model and route revalidation.
- Ties should have deterministic ordering, such as score descending, collected count descending, then earliest user creation date. Implemented.
- Leaderboard supports all-time, monthly, and weekly score windows. Implemented.

#### Account Collection
- The account page should show the signed-in resident's collected violations and point breakdown. Implemented.
- The existing `my-complaints` page can be renamed or reframed as "My collection" if route compatibility is acceptable. Implemented as canonical `/collection`, with `/my-complaints` redirecting for compatibility.

## Testing Strategy
- Unit tests cover score calculation, including posts, likes, dislikes, invalid counts, levels, badges, score windows, and deterministic tie ordering.
- End-to-end Server Action tests cover collection creation, duplicate prevention, government approval, protected evidence access, repair submission, and vote transitions through rendered Next.js forms.
- Duplicate tests cover forged capture timestamps and concurrent submissions. The action uses server time and keeps the duplicate check, observation write, and ownership receipt in one transaction.
- Moderation tests prove pending captures and protected image bytes are visible only to their collector and government reviewers, government decisions are one-time, approved captures become public, and rejected captures lose score and never enter repair calculations.
- Authorization tests cover resident and government role guards. End-to-end checks confirm government users cannot collect and original collectors cannot vote on their own capture.
- Read-model checks confirm collection score changes, weekly leaderboard behavior, distinct privacy-safe public labels, and absence of resident emails.
- Mobile verification covers 18 anonymous, resident, and government checks at 360px and 390px against a fresh seeded database.
- The default mobile verifier uses an isolated random port so a stale process on port 3000 cannot satisfy the repository gate.
- Fresh test and mobile databases use non-destructive migration deployment plus seeding instead of database reset.
- Independent in-app Browser verification covers resident capture, collection, leaderboard, road, and government repair surfaces.
- `npm run verify` runs lint, the full test suite, production build, and mobile verification.

## Implementation Plan: Resident Collector Slice

### Current App Leverage
- `Observation` already represents a collected road violation with evidence, issue type, road, GPS, and capture timestamp.
- `ObservationReceipt` already links a resident user to a submitted observation. For the first slice, this is sufficient to identify the collector without changing the database schema.
- `createObservationAction` already blocks government submissions, requires live camera capture, writes evidence images, stores GPS, creates an observation, and creates an observation receipt for resident users.
- `/report` already lets the user choose a road and submit a live observation.
- `/collection` and `/account` have account-oriented surfaces around the resident's collection. `/my-complaints` remains as a compatibility redirect.

### Data Strategy
- Avoid a migration for the first slice.
- Treat `ObservationReceipt` as the collector ownership record.
- Calculate first-slice score as `observationReceipts.length * 10`.
- Add a pure utility for collector scoring now so likes and dislikes can be added later without rewriting UI contracts.
- Read collection data through `lib/data.ts`, not directly in pages.

### UX Strategy
- Keep `/report` as the first collection route so existing navigation and deep links keep working.
- Reword resident-facing UI from "report issue" and "complaint" toward "collect violation" and "my collection".
- Keep the form lightweight: the first slice may still store `description`, but UI should present it as a short note instead of a formal complaint narrative.
- Show selected road context clearly before camera capture.
- Use `/collection` as the personal collection page, with `/my-complaints` retained as a redirect.

### Implementation Order
1. Add score calculation and collection read-model tests.
2. Add or update `lib/data.ts` read models for resident collection summary.
3. Reframe `/report` copy and form labels for the collector workflow.
4. Reframe `/collection` and account collection UI around "My collection" with point totals.
5. Update navigation and links so resident users see the collection language.
6. Run tests, lint, and build.

### Risks And Mitigations
- Risk: The current schema only awards +10 because likes/dislikes are cluster-level, not individual observation-level.
  Mitigation: Keep first-slice score as post-only and leave observation-level voting for the later slice.
- Risk: Making description optional may conflict with current server validation.
  Mitigation: Either keep a short required note in UI for this slice or update validation with a default generated note and tests.
- Risk: Route renaming can break existing links.
  Mitigation: Make `/collection` canonical and keep `/my-complaints` as a compatibility redirect.
- Risk: The app is on Next.js 16 with changed conventions.
  Mitigation: Read relevant `node_modules/next/dist/docs/` pages before changing route behavior or server action patterns.

## Task List: Resident Collector Slice

- [x] Task: Add collector score utility
  - Acceptance: A pure function returns `postCount * 10` for the first slice and exposes a shape that can later include likes and dislikes.
  - Verify: `npm test`
  - Files: `lib/collector-score.ts`, `tests/collector-score.test.ts`

- [x] Task: Add resident collection read model
  - Acceptance: `lib/data.ts` can return a signed-in resident's collected observations, total collected count, and first-slice score.
  - Verify: `npm test`
  - Files: `lib/data.ts`, `tests/resident-collection.test.ts`

- [x] Task: Reframe `/report` as collect flow
  - Acceptance: Resident-facing copy says "collect violation" or equivalent, selected road context is clear, and the form still submits through `createObservationAction`.
  - Verify: `npm run lint`
  - Files: `app/report/page.tsx`, `components/live-observation-form.tsx`

- [x] Task: Make collection note lightweight
  - Acceptance: The UI asks for a short note rather than a formal description, while server validation remains explicit and tested.
  - Verify: `npm test`
  - Files: `components/live-observation-form.tsx`, `app/actions.ts`, relevant tests if validation changes

- [x] Task: Add "My collection" surface
  - Acceptance: The resident can view collected violations with photo, road, violation type, submitted date, and point total.
  - Verify: `npm run lint`
  - Files: `app/collection/page.tsx`, `app/my-complaints/page.tsx`, `app/account/page.tsx`, `lib/data.ts`, optional new component in `components/`

- [x] Task: Update resident navigation language
  - Acceptance: Primary resident links use collection language while government-specific language remains intact.
  - Verify: `npm run lint`
  - Files: `components/site-shell.tsx`, relevant page links

- [x] Task: End-to-end verification
  - Acceptance: Tests, lint, and production build pass.
  - Verify: `npm test`, `npm run lint`, `npm run build`
  - Files: no required source changes unless verification exposes issues

## Boundaries
- Always: preserve privacy of resident identity in public views.
- Always: keep live camera capture and person-frame rejection unless explicitly changed.
- Always: revalidate road, account, and leaderboard views after relevant mutations.
- Always: add tests for score and voting behavior before or alongside implementation.
- Ask first: changing the database provider away from SQLite.
- Ask first: adding push notifications, native mobile capabilities, background GPS tracking, or paid mapping services.
- Ask first: renaming existing routes such as `/rankings` or `/my-complaints`.
- Ask first: changing the issue taxonomy or adding moderation states beyond existing human-check status.
- Never: expose user emails on public leaderboards.
- Never: allow vote totals to be updated without preserving one-vote-per-user semantics.
- Never: store secrets or API keys in the repository.

## Success Criteria
- A resident can submit a live camera violation and see it attached to the selected road.
- The submitted violation appears in the resident's personal collection.
- Other residents can like or dislike the violation, one vote per resident.
- The collector's score follows the exact formula: +10 per post, +1 per like, -2 per dislike.
- The leaderboard displays public resident labels and correct sorted scores.
- Road subscription UI lets users subscribe and view update feed links for a road.
- Government users can inspect collected violations but cannot collect or vote.
- `npm test`, `npm run lint`, and `npm run build` pass after implementation.

## Open Questions
1. Should scoring be based on individual violations or current issue clusters? The requested behavior sounds like individual collected violations, while the current app votes on issue clusters.
2. Should a user be able to remove or edit their collected violation? If yes, should points be reversed immediately?
3. Should dislikes represent "does not exist" only, or also "has been fixed"? The latter may overlap with the existing repair verification workflow.
4. Should the collection flow require proximity to the road based on GPS, or is choosing a road manually acceptable for the web MVP?
5. Should the leaderboard be ward-local only, city-wide, or global across all wards?
6. Should the app show real-time point changes, or is server-rendered refresh after actions acceptable for V2?
7. Should the existing `/rankings` route remain government-only road budget rankings while `/leaderboard` becomes resident scoring?
