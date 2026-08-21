# RoadWatch Production Path

This document describes the planned path from local device testing to a hosted
pilot. The order is intentional: validate the capture experience on real
devices first, then move the application and its data to hosted services.

## Current boundary

The current web application uses Next.js, Prisma, SQLite, and local evidence
files under `public/uploads`. That setup is suitable for local testing and
seeded demonstrations. It is not a durable production deployment.

The native application has camera, foreground GPS, local evidence queuing, and
retry state. The native API currently provides read-only resources. Native
authentication and the capture upload endpoint still need to be connected
before native submissions can reach the server.

The local development path must remain separate from a future hosted path. In
particular, local bearer-token mappings, demo sessions, SQLite, and local file
paths must not silently become the production identity, database, or storage
boundary.

## Stage 1: Test the web application on iOS from this Mac

First, run the current web application on this machine and test it from Safari
on a physical iPhone. This validates the existing capture workflow before the
native upload API is complete.

Start the local server:

```bash
npm run dev
```

Expose the local server through a temporary HTTPS tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Open the generated HTTPS URL in Safari on the iPhone. The tunnel avoids router
configuration and provides an HTTPS origin for camera and location permission
testing. Quick Tunnels are for development only and provide a temporary URL.

Use this stage to verify:

- Safari camera permission and live capture
- Foreground GPS permission and road proximity confirmation
- Report category, severity, description, and evidence submission
- Resident and government account boundaries
- Moderation, repair, verification, and public road history
- Mobile layout, loading behavior, and network failures

SQLite and local uploads remain on the Mac during this stage. The Mac must stay
awake and connected to the internet while the phone is using the tunnel. The
tunnel URL is not a stable application address and must not be shared as a
production endpoint.

## Stage 2: Connect and test the native iOS application

After the Safari workflow is stable, connect the Expo application to the same
Mac-hosted server.

The native path requires these backend additions:

1. A development authentication path for native clients.
2. `POST /api/v1/captures` for evidence submission.
3. Binary or multipart image upload handling.
4. Server-side GPS, road matching, moderation, and validation rules shared
   with the web flow.
5. Durable idempotency-key handling for offline retries.
6. A response that confirms the created observation ID and moderation state.

Configure the native client to use the current tunnel URL as
`EXPO_PUBLIC_API_URL`. Do not commit the tunnel URL or an access token.

The iOS acceptance test is complete when a physical device can:

- Sign in through the development identity boundary
- Request camera and foreground location permissions
- Capture an image while satisfying the stationary safety gate
- Save a capture to the offline queue
- Upload it through the tunnel after connectivity is available
- Retry an interrupted upload without creating a duplicate observation
- Display the server-confirmed pending state
- Read nearby approved observations and the private collection

Native device verification requires an appropriate Expo development build or
internal build, an iOS bundle identifier, signing credentials, and a physical
device. Expo and native package installation must be completed before Metro or
device verification can be claimed.

## Stage 3: Test Android on the same local server

Once iOS succeeds, repeat the same native workflow on a physical Android
device. Keep the Mac-hosted server and HTTPS tunnel unchanged so that device
differences are isolated from backend changes.

The Android acceptance test must cover:

- Camera and foreground location permission recovery
- Android camera lifecycle and app backgrounding
- GPS accuracy and road matching
- Offline queue persistence across process restart
- Upload retry and idempotency behavior
- Private pending evidence and public cleared evidence boundaries
- Android layout and safe-area behavior

Do not begin hosted migration based only on an emulator result. The first
hosted migration should happen after both physical-device flows pass against
the local server.

## Stage 4: Move data services to free hosted services

The recommended personal-pilot architecture is:

| Concern | Initial hosted choice | Migration requirement |
| --- | --- | --- |
| Web and API compute | Vercel Hobby or another free Node host | The app must not depend on a writable local filesystem or long-running process. |
| Relational database | Supabase free PostgreSQL | Replace the SQLite adapter, rehearse migration, and verify backups and restores. |
| Evidence storage | Supabase Storage initially, or Cloudflare R2 as volume grows | Replace local paths with private object keys and controlled access URLs. |
| Authentication | Approved OIDC provider or an equivalent hosted identity service | Remove demo sessions and local token mappings. |
| Rate limiting | Hosted rate-limit state | Protect authentication, upload, and anonymous or device-bound actions. |

Supabase is a practical first hosted data service because its free plan
currently includes PostgreSQL and 1 GB of file storage. Free projects can
pause after inactivity, so this is appropriate for a personal pilot and not an
availability guarantee.

Cloudflare R2 is a possible later evidence-storage option. Its current free
tier includes 10 GB-month of standard storage, 1 million Class A operations,
10 million Class B operations, and free egress. Usage must still be monitored
and access must remain private by default.

Vercel Hobby is suitable only for personal, non-commercial use. It must not be
used as the permanent home for SQLite databases or uploaded evidence. A free
compute provider with an ephemeral filesystem has the same restriction.

Before moving any data, complete the PostgreSQL rehearsal in
`docs/operations.md`. Compare observation counts, moderation states, receipts,
votes, repairs, verification history, and audit records. Take and restore a
backup before cutover.

## Hosted migration order

1. Add database and object-storage interfaces without changing the public
   behavior.
2. Add a PostgreSQL Prisma configuration and run a disposable migration
   rehearsal.
3. Move evidence writes to private object storage while retaining the current
   evidence route contract.
4. Add production authentication and remove demo-only credentials from hosted
   configuration.
5. Add rate limiting, structured audit logging, retention controls, and secret
   management.
6. Deploy the web and API application with no reliance on local writes.
7. Point the native iOS and Android builds at the hosted API.
8. Run the same acceptance tests used against the Mac-hosted server.

## Operational guardrails

- Keep the local SQLite database and seeded evidence available as a disposable
  development fixture.
- Never store production uploads in the application filesystem.
- Do not expose pending evidence or resident identity through public routes.
- Do not treat a temporary tunnel URL as a production domain.
- Keep production authentication, storage credentials, and database URLs out
  of the repository.
- Set usage alerts and hard limits before enabling any provider that can bill
  beyond its free allowance.
- Do not claim production readiness, pilot authority, or public availability
  until identity, storage, retention, backup, and device verification have
  been approved.

## Definition of done for this path

This rollout path is complete when:

1. The web capture flow works from iOS Safari through the Mac-hosted HTTPS
   tunnel.
2. Native capture upload and retry work on a physical iPhone.
3. The same native flow works on a physical Android device.
4. PostgreSQL and private object storage pass migration and restore tests.
5. The hosted deployment works without SQLite or local evidence writes.
6. Both device builds use the hosted API only after the local acceptance suite
   passes.
