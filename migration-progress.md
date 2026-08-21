# RoadWatch Native Migration Progress

This worklist tracks the V2 native resident migration without changing the existing Next.js government and public surfaces.

## Backend and shared domain

- [x] Existing Next.js pages, Server Actions, Prisma models, evidence route, and repair lifecycle inventoried.
- [x] Fail-closed moderation defaults and approval-only scoring are implemented and covered by tests.
- [x] Native-friendly `/api/v1` read contracts are documented and contract-tested. Mutation endpoints remain blocked on the production identity and storage boundary.
- [ ] PostgreSQL and private object-storage adapters are available for production-like rehearsal.
- [ ] SQLite to PostgreSQL rehearsal and rollback procedures are documented.

## Resident screens

- [x] Authentication boundary, first-run safety onboarding, and permission recovery screens. Production OIDC is still an external blocker.
- [x] Camera-first native capture route with foreground GPS, stationary safety gate, and native submission sheet. Server road matching and mutation upload remain to be connected after the production API boundary is approved.
- [x] Native offline evidence queue with exactly-once idempotency and restart recovery.
- [x] Nearby approved unresolved violations for the matched or selected road.
- [x] Collection history with pending, approved, rejected, duplicate, and revoked states.
- [x] Approved-capture score, three fixed badges, privacy-safe ward leaderboard, and ranking opt-out surfaces.
- [x] Profile, privacy, permission recovery, and sign-out.

## Government screens

- [x] Ward-scoped admin landing with road selection.
- [x] Central pending moderation queue across all roads.
- [x] Separate repair queue and road detail workflow.
- [x] Compare-and-set moderation, rejection reasons, repair transition validation, proof requirements, reopening, and append-only audit history.

## Verification

- [x] Existing resident capture and government repair flows reproduced on an approved local loopback test run.
- [x] API, migration, storage-path, privacy, abuse, accessibility, and offline regression coverage available locally.
- [x] Full lint, unit, web build, API integration, migration, and mobile tests.
- [ ] Expo Go or internal build verification.
- [ ] Physical iOS and Android camera and GPS verification.

## External blockers

The repository currently has no approved OIDC provider, PostgreSQL service, private object-storage credentials, EAS signing credentials, target bundle identifiers, or pilot authority and retention approval. These must be supplied before production migration, internal distribution builds, or public deployment can be claimed.
