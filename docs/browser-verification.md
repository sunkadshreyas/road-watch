# In-app Browser verification

RoadWatch received an independent in-app Browser review on 16 July 2026 using a
freshly migrated and seeded SQLite database.

## Resident checks

At 390px and 360px widths, `/report?road=100-feet-road` showed the selected road,
GPS guidance, camera start control, disabled submission before capture, private
collection link, leaderboard link, and individual voting controls. The page had
no horizontal overflow, no mobile MapLibre controls, and no console errors.

At 360px, `/collection` showed the resident score, three GPS-backed private
captures, and no private email address. `/leaderboard` showed distinct
privacy-safe labels (`Street Scout A` and `Street Scout B`), scores of 32 and 18,
no private email address, no horizontal overflow, and no console errors.

## Government checks

At 360px, `/roads/100-feet-road` showed the government repair workflow while
hiding upvote, downvote, and resident RSS subscription actions.

`/roads/metro-footpath-east/repairs/cart-stack-entrance` showed the repair form
with Scheduled, In progress, and Repaired statuses. It exposed no voting controls,
had no horizontal overflow, and produced no console errors.

## Automated companion evidence

`npm run verify:mobile` separately checks nine routes at two mobile widths for 18
total checks. Its JSON report and full-page screenshots are written under `/tmp`
and use a fresh seeded database when the verifier starts its own server.

## Final follow-up

After the moderation and protected-evidence changes, a second in-app Browser
pass checked the government road view and resident collection on the final
working tree. Navigation and role boundaries remained intact, the collection
loaded every image successfully, and neither checked page had horizontal
overflow. The final automated mobile run repeated all 18 checks at 360px and
390px with zero console errors.
