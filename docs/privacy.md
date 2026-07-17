# RoadWatch V2 Privacy Controls

## Resident evidence

Every capture begins as `MANUAL_REVIEW`. Pending and rejected evidence is
visible only to its collector and authorized government users. Public nearby,
road, export, and leaderboard views include approved records only.

Public API nearby responses coarsen coordinates to three decimal places, expose
the capture date rather than the exact timestamp, and return an evidence URL
only for committed seeded public assets. New production evidence must use a
private object-storage derivative after EXIF removal and face and license-plate
redaction. Uncertain redaction must remain in manual review.

## Identity and ranking

Public rankings use aliases and ward scope. Email addresses, exact coordinates,
exact capture times, and resident identities are not public fields. A future
OIDC integration must use native PKCE, short-lived access tokens, refresh
revocation, and platform secure storage. The local `ROADWATCH_API_TOKENS_JSON`
adapter is not a production identity system.

## Collection safety

The native app requests foreground location only. Safety onboarding prohibits
capture while moving, entering traffic, following vehicles, confrontation, and
private-property access. Motion detection is only a safety aid, never proof of
safe behavior.

## Retention and deletion

Retention duration, deletion requests, jurisdictional notices, and pilot
authority must be approved by the authorized pilot owner. This repository does
not claim legal compliance or public deployment approval.
