# RoadWatch V2 Backend Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make moderation and scoring fail closed, then expose three stable bearer-protected read contracts for a future native client.

**Architecture:** Keep scores derived from unique receipts and persisted moderation state. Add a shared `/api/v1` authentication and response boundary backed only by explicit local environment configuration, then build focused route handlers over existing Prisma read models.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Prisma 7, SQLite, Zod, Node test runner, Playwright-compatible Next test server.

---

### Task 1: Reproduce and specify fail-closed moderation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260717000000_fail_closed_observations/migration.sql`
- Test: `tests/moderation-safety.test.ts`

- [ ] Write tests that inspect the Prisma schema and deployed SQLite table default, then assert that an observation created without a status becomes `MANUAL_REVIEW`.
- [ ] Run the focused test under Node.js 22 and verify it fails because the current default is `CLEARED`.
- [ ] Change the Prisma default and add a migration that recreates the SQLite table safely with `MANUAL_REVIEW` as the default.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Make score projections approval-only

**Files:**
- Modify: `lib/data.ts`
- Modify: `app/actions.ts`
- Test: `tests/resident-collection.test.ts`
- Test: `tests/moderation-safety.test.ts`

- [ ] Add tests showing that pending and rejected captures contribute zero submission points and cleared captures contribute exactly ten points.
- [ ] Add repeat-read and moderation-transition assertions so approval cannot count more than once and revocation removes only one award.
- [ ] Run the focused tests and verify they fail against the current non-rejected filter and immediate `+10` success message.
- [ ] Filter personal and leaderboard scores to `CLEARED` observations and change capture success copy to describe pending review rather than an awarded score.
- [ ] Re-run the focused tests and verify approval-only scoring passes.

### Task 3: Add a stable native API boundary

**Files:**
- Create: `lib/api-v1.ts`
- Modify: `.env.example`
- Modify: `tests/support/next-test-server.ts`
- Test: `tests/api-v1.test.ts`

- [ ] Add unit and Next-server tests for missing, malformed, unknown, and configured bearer tokens. Assert cookies alone never authenticate `/api/v1`.
- [ ] Assert stable `{ data }` and `{ error: { code, message } }` envelopes, JSON content type, `Cache-Control: private, no-store`, and `WWW-Authenticate: Bearer` on 401 responses.
- [ ] Run the tests and verify they fail because no native API boundary exists.
- [ ] Implement strict bearer parsing, fail-closed environment parsing, existing-user lookup, and shared success and error helpers.
- [ ] Re-run the boundary tests and verify they pass.

### Task 4: Add protected read endpoints

**Files:**
- Create: `app/api/v1/me/route.ts`
- Create: `app/api/v1/violations/nearby/route.ts`
- Create: `app/api/v1/leaderboard/route.ts`
- Create: `lib/api-v1-data.ts`
- Test: `tests/api-v1.test.ts`

- [ ] Add failing contract tests for current-user identity, cleared-only nearby results, distance ordering, invalid coordinates, radius limits, and leaderboard windows.
- [ ] Run the tests and verify each route is missing.
- [ ] Implement the three handlers using the shared bearer boundary and focused Prisma read helpers.
- [ ] Re-run API tests and verify the stable contracts and approved-only visibility.

### Task 5: Verify and hand off

**Files:**
- Modify only files required by verification findings.

- [ ] Run focused security and API tests under Node.js 22.
- [ ] Run the complete Node test suite under Node.js 22.
- [ ] Run `npm run lint` under Node.js 22.
- [ ] Run `npm run build` under Node.js 22.
- [ ] Run `git diff --check`, inspect every changed file, and report unrelated worktree files without staging them.
