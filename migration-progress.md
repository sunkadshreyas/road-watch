# RoadWatch Native Migration Progress

This worklist tracks the V2 native resident migration without changing the existing Next.js government and public surfaces.

## Backend and shared domain

- [x] Existing Next.js pages, Server Actions, Prisma models, evidence route, and repair lifecycle inventoried.
- [ ] Fail-closed moderation defaults and approval-only scoring are implemented and covered by tests.
- [ ] Native-friendly `/api/v1` contracts are documented and contract-tested.
- [ ] PostgreSQL and private object-storage adapters are available for production-like rehearsal.
- [ ] SQLite to PostgreSQL rehearsal and rollback procedures are documented.

## Resident screens

- [ ] Authentication and first-run safety onboarding.
- [ ] Camera-first native capture route with foreground GPS, stationary safety gate, road geometry matching, correction, and native submission sheet.
- [ ] Native offline evidence queue with exactly-once idempotency and restart recovery.
- [ ] Nearby approved unresolved violations for the matched or selected road.
- [ ] Collection history with pending, approved, rejected, duplicate, and revoked states.
- [ ] Approved-capture score, three fixed badges, privacy-safe ward leaderboard, and ranking opt-out.
- [ ] Profile, privacy, permission recovery, and sign-out.

## Government screens

- [ ] Ward-scoped admin landing with road search and selection.
- [ ] Central pending moderation queue across all roads with filtering.
- [ ] Separate repair queue and road detail workflow.
- [ ] Compare-and-set moderation, repair transition validation, proof requirements, reopening, and append-only audit history.

## Verification

- [x] Existing resident capture and government repair flows reproduced on an approved local loopback test run.
- [ ] API, migration, storage, privacy, abuse, accessibility, and offline adversarial tests.
- [ ] Full lint, unit, web build, API integration, migration, and mobile tests.
- [ ] Expo Go or internal build verification.
- [ ] Physical iOS and Android camera and GPS verification.

## External blockers

The repository currently has no approved OIDC provider, PostgreSQL service, private object-storage credentials, EAS signing credentials, target bundle identifiers, or pilot authority and retention approval. These must be supplied before production migration, internal distribution builds, or public deployment can be claimed.
