# RoadWatch native resident app

This additive Expo Router project is the camera-first resident client. It does not import Next.js, Prisma, or Server Actions. All server communication goes through the versioned HTTP client in `src/lib/api-client.ts`.

## Local setup

The source is pinned to the Expo SDK 54.0.34 package set recorded by the local Expo manifest. This checkout did not have Expo packages installed, and network installation was unavailable during implementation.

```bash
cd mobile
npm install
cp .env.example .env.local
npm start
```

Set `EXPO_PUBLIC_API_URL` to the deployed Next.js backend origin. It is a public build-time value and must not contain credentials. For the local simulator, start the Next.js app from the repository root on port 3000 and configure the seeded token mapping shown in the root `.env.example`.

For an unsigned local iOS simulator build, set `EXPO_PUBLIC_DEMO_MODE=1`. The first launch still asks for a resident sign-in, using one of the seeded profiles:

- `resident-a@roadwatch.demo`
- `resident-b@roadwatch.demo`

Production builds always use the configured identity provider and SecureStore.

The iOS Simulator has no camera hardware. Set `EXPO_PUBLIC_SIMULATOR_CAMERA=1` together with demo mode to show a labeled simulated road preview and use Expo's generated test photo. Physical devices continue to require a real camera-ready event.

## Verification available without Expo packages

From the repository root:

```bash
PATH="$HOME/.local/share/fnm/node-versions/v22.18.0/installation/bin:$PATH" \
  node --import tsx --test mobile/src/lib/*.test.ts
```

The tests cover camera-first route selection, launch exceptions, versioned bearer requests, mutation idempotency headers, queue deduplication, retry state, and project isolation.

## External blockers

- Package installation is required before TypeScript or Metro can resolve Expo modules.
- Read-only current-user, nearby, and leaderboard routes are available. Auth, private collection, capture upload, and queue completion endpoints are still missing.
- A real identity provider is not configured. The sign-in route expects an `/api/v1/auth/session` bearer-token response.
- Queued evidence is stored in the app sandbox, but file-level encryption and the final retention policy are not configured.
- Bundle identifiers, EAS project linkage, signing credentials, and physical devices are not configured, so no internal build or device verification is claimed.
