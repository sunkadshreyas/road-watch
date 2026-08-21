# RoadWatch V2 Deployment Notes

## Web and API

Run the web application with Node.js 22 and a PostgreSQL-backed production
configuration only after the migration rehearsal and backup checks in
`docs/operations.md` pass. Configure a real OIDC provider, private
S3-compatible object storage, rate-limit state, structured audit logging, and
the approved retention policy. Keep `ROADWATCH_API_TOKENS_JSON` limited to local
integration.

## Native internal distribution

The native project is `mobile/`, pinned to Expo SDK 54. The local Metro exports
for Android and iOS are verified, but they are not installable internal builds.
To produce those builds, configure `app.json` bundle identifiers, link an EAS
project, add Apple and Google signing credentials, and obtain explicit cost and
distribution authorization. Then run the version-matched EAS development or
internal profile and install it on a physical iOS and Android device.

## Public release boundary

Do not submit to the App Store or Google Play, migrate production data, incur
paid provider costs, or claim pilot authority until the owner explicitly
approves those actions. Legal, government-authority, geography, and retention
questions must be escalated rather than inferred.
