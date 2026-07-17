# RoadWatch V2 Mobile Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the native resident capture game, native-friendly backend contracts, and central government review workflow described in the V2 brief.

**Architecture:** Keep the Next.js application as the government and public web surface. Add a native Expo Router client under `mobile/`, shared server-side domain rules for moderation, clustering, scoring, and repairs, and additive `/api/v1` route handlers. Preserve the demo SQLite path for local tests while adding production-oriented PostgreSQL and private evidence-storage boundaries that fail closed when unconfigured.

**Tech Stack:** Node 22, Next.js 16.2.4, React 19, Prisma 7.8, SQLite for local tests, PostgreSQL adapter boundary, private object-storage boundary, Expo Router, expo-camera, expo-location, expo-secure-store, expo-file-system, expo-haptics, TanStack Query, and Node test runner.

---

### Task 1: Record the migration worklist and reproduce existing flows

**Files:**
- Create: `migration-progress.md`
- Modify: `docs/mobile-completion-audit.md`
- Test/evidence: `tests/repair-submit.test.ts`, `tests/resident-collection.test.ts`

- [ ] Run the current end-to-end resident capture and government repair tests under the supported Node 22 runtime.
- [ ] Record current behavior, known gaps, and the native migration bucket for every existing screen.
- [ ] Preserve unrelated user changes and document any environment blocker.

### Task 2: Harden schema, scoring, and shared domain rules

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/collector-score.ts`, `lib/collection-moderation.ts`, `lib/geo.ts`, `lib/data.ts`
- Create: `lib/domain/`, `lib/idempotency.ts`, `prisma/migrations/*`
- Test: `tests/collector-score.test.ts`, `tests/collection-moderation.test.ts`, new domain tests

- [ ] Write failing tests for fail-closed pending defaults, approved-only visibility, ten-point score ledger semantics, revocation, duplicate clustering, nearest-geometry road matching, and ward authorization.
- [ ] Implement the minimum domain and schema changes to make those tests pass.
- [ ] Preserve legacy web behavior where it does not conflict with the V2 rules.

### Task 3: Add authenticated, idempotent `/api/v1` contracts

**Files:**
- Create: `app/api/v1/**/route.ts`, `lib/api-v1/`, `docs/api-v1.md`, `tests/api-v1.test.ts`
- Modify: `lib/auth.ts`, `prisma/schema.prisma`

- [ ] Define stable request and response schemas, error codes, pagination, rate limits, bearer-token parsing, ward-scoped authorization, and mutation idempotency.
- [ ] Add current-user, roads, nearby approved violations, capture initialization/completion, collection, vote, leaderboard, moderation, and repair endpoints.
- [ ] Keep demo cookie sessions available only for local web tests, and make native endpoints reject missing or invalid bearer credentials.
- [ ] Add contract and IDOR tests before implementation, then run them against an isolated seeded database.

### Task 4: Scaffold the native Expo app and camera-first shell

**Files:**
- Create: `mobile/` Expo project, `mobile/src/app/**`, `mobile/src/screens/**`, `mobile/src/components/**`, `mobile/src/lib/**`, `mobile/app.json`, `mobile/eas.json`
- Test: `mobile/src/**/*.test.ts`, native smoke tests where tooling exists

- [ ] Add the current stable Expo SDK supported by local tooling and verify version-matched official packages.
- [ ] Build native routes for capture, nearby, collection, leaderboard, profile, auth, onboarding, and permission recovery.
- [ ] Make returning authenticated residents with permissions granted land on the full-screen camera route, with a dominant shutter, road status, accuracy, safety state, haptics, accessible labels, and reduced-motion behavior.
- [ ] Add foreground location, motion safety gating, road correction, native bottom-sheet submission, and cleanup on interruption or retake.

### Task 5: Implement offline evidence queue and native API data layer

**Files:**
- Create: `mobile/src/lib/api-client.ts`, `mobile/src/lib/offline-queue.ts`, `mobile/src/lib/auth-storage.ts`, `mobile/src/lib/query-client.ts`, `mobile/src/lib/redaction.ts`
- Test: queue, retry, idempotency, token refresh, and API error tests

- [ ] Store queued evidence and metadata using platform-appropriate local storage with an idempotency key and upload state.
- [ ] Retry after connectivity returns or process restart and prove exactly-once server effects.
- [ ] Purge confirmed local evidence after the documented recovery window.
- [ ] Add sanitized image preparation and explicit manual-review fallback for uncertain redaction.

### Task 6: Add central government moderation and repair workspace

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/pending/page.tsx`, `app/admin/roads/[slug]/page.tsx`, `components/admin/**`, `lib/repair-domain.ts`
- Modify: `app/page.tsx`, `app/roads/[slug]/page.tsx`, `app/actions.ts`
- Test: `tests/admin-workflow.test.ts`, `tests/repair-submit.test.ts`

- [ ] Add a ward-scoped government landing page with road search, central pending queue, separate repair queue, and filters.
- [ ] Enforce compare-and-set moderation with rejection reasons, audit records, and fail-closed authorization.
- [ ] Enforce repair transitions, proof, reopening, concurrency, and append-only audit history.

### Task 7: Add production-boundary adapters and operational documentation

**Files:**
- Create: `lib/storage/`, `lib/database/`, `scripts/migrate-sqlite-to-postgres.mjs`, `docs/operations.md`, `docs/privacy.md`, `docs/deployment.md`
- Modify: `.env.example`, `README.md`, `prisma.config.ts`
- Test: migration and storage validation tests

- [ ] Add PostgreSQL configuration that never silently falls back to SQLite in production.
- [ ] Add private object-storage interface, signed authorized access, file validation, EXIF stripping, redaction pipeline boundaries, and orphan cleanup.
- [ ] Document backup, rehearsal, rollback, retention approval, provider credentials, and deployment blockers.

### Task 8: Full verification, direct push, and evidence report

**Files:**
- Modify: documentation only as required by fresh evidence.

- [ ] Run focused tests after each slice and the complete lint, type, unit, API, migration, web build, and mobile test gate.
- [ ] Run the no-mistakes pipeline on the committed feature branch, resolving material findings without bypassing it.
- [ ] Attempt available Expo Go, internal build, and physical-device checks. Report exact blockers when credentials, signing, device, authority, or legal approval is unavailable.
- [ ] Commit and push directly without opening a pull request. Return a verification table and explicit completion gaps.
