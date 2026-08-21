# RoadWatch V2 Operations Runbook

## Current local path

The checked-in development path uses SQLite and the existing Prisma adapter. It
is suitable for seeded local verification only. Production must not silently
fall back to SQLite, and the current runtime does not claim production
readiness.

## PostgreSQL rehearsal

Before a pilot owner authorizes migration:

1. Provision an isolated PostgreSQL database and set `DATABASE_URL` to its
   `postgresql://` URL.
2. Generate and apply the PostgreSQL Prisma schema in a disposable rehearsal
   environment.
3. Export representative seeded SQLite rows, import them with the migration
   tool when implemented, and compare counts, foreign keys, moderation states,
   receipts, votes, repairs, and audit history.
4. Take and restore a backup, then run the complete API and government workflow
   tests against the restored database.
5. Record the migration owner, timestamp, checksum, validation output, and
   rollback decision before any production cutover.

No PostgreSQL credentials or approved migration window are present in this
workspace, so no production migration was attempted.

## Evidence incident recovery

Keep original evidence private. For a failed upload, remove the staged object
only after the database transaction is known to have rolled back. For an
orphaned object, record the object key and incident ID, verify that no database
row references it, then delete it through the storage provider's controlled
cleanup job. Never paste signed URLs or credentials into logs.

## Moderation incident recovery

Moderation decisions are compare-and-set transitions from `MANUAL_REVIEW`.
Inspect the append-only audit record, identify the ward-scoped actor, and use a
new governed decision or revocation event. Do not edit a historical decision in
place. If a repair fails, reopen the issue and preserve the prior repair proof.

## External blockers

OIDC provider approval, PostgreSQL service credentials, private object-storage
credentials, EAS project and signing credentials, target bundle identifiers,
pilot authority, and retention approval are required before production or
internal distribution claims can be made.
