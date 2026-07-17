# RoadWatch V2 Backend Security Design

## Scope

This slice hardens the existing Prisma domain and adds read-only native API contracts. It does not change mobile UI, government pages, production authentication, or deployment storage.

## Approved architecture

Scoring remains a server-derived projection. An observation contributes its ten submission points only while its `humanCheckStatus` is `CLEARED`, and `ObservationReceipt.observationId` remains unique. This makes approval and revocation idempotent without introducing a mutable score balance or an event ledger. Likes and dislikes continue to come from persisted observation votes on cleared observations.

The database default for `Observation.humanCheckStatus` becomes `MANUAL_REVIEW`. Public and API read models must filter to `CLEARED`. Existing private web visibility remains unchanged: a collector can see their own pending or rejected capture, and government users can review all captures.

Native API authentication uses an explicit local adapter configured by `ROADWATCH_API_TOKENS_JSON`. The environment value maps opaque bearer tokens to existing user IDs. There is no default token, committed token, cookie fallback, or endpoint that creates credentials. Production authentication remains a documented follow-up.

Every `/api/v1` route uses one response contract:

```json
{ "data": {} }
```

or:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Bearer authentication is required." } }
```

The first protected endpoints are:

- `GET /api/v1/me`
- `GET /api/v1/violations/nearby?lat=<number>&lng=<number>&radiusMeters=<number>`
- `GET /api/v1/leaderboard?window=all|month|week`

Nearby results include only cleared observations, are sorted by distance and recency, and expose public road and violation fields without collector identity. Query validation errors use a stable `INVALID_REQUEST` code. Unexpected errors use `INTERNAL_ERROR` without exposing exception details.

## Alternatives considered

An append-only score event ledger would provide a stronger audit trail, but it adds migration and replay semantics that are not required for this local slice. A mutable score column was rejected because it can drift from moderation and vote state. A durable ledger remains a production follow-up.

## Verification

Tests must first demonstrate the current fail-open schema default, pending-score leak, absent bearer boundary, and absent endpoints. Focused tests then prove the fixes. Final verification includes the repository test suite, lint, and production build under Node.js 22.
