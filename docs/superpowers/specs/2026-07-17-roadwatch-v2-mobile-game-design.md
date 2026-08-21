# RoadWatch V2 Mobile Game Design

## Goal

Deliver a native Expo resident app with a camera-first capture flow, safe static-violation collection, approved-only nearby views, lightweight server-authoritative game scoring, and a ward leaderboard. Retain the Next.js government and public web application, add native-friendly versioned APIs, and harden moderation and repair workflows.

## Boundaries

The pilot supports only static pedestrian-safe issues: potholes, broken footpaths, missing streetlights, unauthorized parking, vendor encroachment, and blocked footpaths. Moving violations, pursuit, confrontation, trespass, and capture from a moving vehicle are excluded. Pokemon Go is interaction inspiration only, with no copied assets or branding.

## Architecture

The existing Next.js app remains the government and public web surface. A new `mobile/` Expo Router application is a native HTTP client. Shared server-side domain services own moderation, scoring, clustering, repair transitions, and authorization so web mutations and `/api/v1` mutations cannot diverge. SQLite remains a local development path until PostgreSQL credentials and an approved migration window exist, but new safety defaults and storage abstractions must be production-oriented and fail closed.

The mobile app uses native camera, foreground location, secure token storage, local encrypted evidence queue, haptics, native navigation, and a query/mutation layer with retry and offline awareness. The returning resident route is camera-first after authentication, onboarding, and permission exceptions are satisfied.

## Trust and privacy model

Every capture starts in `MANUAL_REVIEW`. Pending and rejected evidence is private and earns zero points. Approval is concurrency-safe, publishes only sanitized derivatives, and grants ten points exactly once. Revocation removes public visibility, points, badges, and rank effects exactly once. Public views expose road-level or coarsened location, sanitized imagery, time ranges, and privacy-safe aliases only. Precise coordinates, exact times, originals, email addresses, and pending evidence remain protected.

Government actions are ward-scoped and append-only audited. Repair status is a governed lifecycle with proof required for `REPAIRED` and support for reopening. Residents cannot moderate or repair.

## Delivery slices

1. Establish repository documentation and migration worklist.
2. Add fail-closed schema defaults, persistent idempotency and score ledger records, and shared domain rules.
3. Add `/api/v1` route handlers with stable errors, bearer-token boundary, pagination, rate limits, and contract tests while preserving demo web sessions for local development.
4. Add the native Expo application and camera-first routes, with an offline queue and API client.
5. Add central government moderation and repair queue surfaces.
6. Add PostgreSQL and private object-storage adapters, migration and operational runbooks, and explicit credential blockers.
7. Run focused tests, full repository gates, red-team checks, and available build/device validation. Report any missing external authority or credential without fabrication.

## Completion evidence

The final report must separate locally verified behavior from unavailable physical-device, provider, signing, legal, or deployment evidence. It must include commands and observed results, migration status, security and privacy findings, internal build identifiers or exact blockers, and direct push status.
