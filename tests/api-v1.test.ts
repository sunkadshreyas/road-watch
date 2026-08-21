import assert from "node:assert/strict";
import test from "node:test";

import Database from "better-sqlite3";

import {
  residentASessionCookie,
  startNextTestServer,
} from "./support/next-test-server";

const residentAId = "cmosvmckd0001a0x96kzti3b5";
const residentToken = "roadwatch-local-resident-test-token";

type JsonRecord = Record<string, unknown>;

async function jsonBody(response: Response) {
  return (await response.json()) as JsonRecord;
}

function bearerHeaders(token = residentToken) {
  return {
    authorization: `Bearer ${token}`,
  };
}

function leaderboardScore(payload: JsonRecord, userId: string) {
  const data = payload.data as {
    entries: Array<{
      userId: string;
      score: { totalScore: number };
    }>;
  };
  const entry = data.entries.find((candidate) => candidate.userId === userId);

  assert.ok(entry, `Expected leaderboard entry for ${userId}.`);
  return entry.score.totalScore;
}

test("native API v1 uses bearer auth and approved-only read contracts", { timeout: 120_000 }, async (t) => {
  const previousTokenBindings = process.env.ROADWATCH_API_TOKENS_JSON;
  process.env.ROADWATCH_API_TOKENS_JSON = JSON.stringify({
    [residentToken]: residentAId,
  });

  let server: Awaited<ReturnType<typeof startNextTestServer>>;

  try {
    server = await startNextTestServer("roadwatch-api-v1-test-");
  } finally {
    if (previousTokenBindings == null) {
      delete process.env.ROADWATCH_API_TOKENS_JSON;
    } else {
      process.env.ROADWATCH_API_TOKENS_JSON = previousTokenBindings;
    }
  }

  const database = new Database(server.dbPath);

  t.after(async () => {
    database.close();
    await server.stop();
  });

  await t.test("rejects missing, cookie-only, malformed, and unknown credentials consistently", async () => {
    const responses = await Promise.all([
      fetch(`${server.baseUrl}/api/v1/me`),
      fetch(`${server.baseUrl}/api/v1/me`, {
        headers: { cookie: residentASessionCookie },
      }),
      fetch(`${server.baseUrl}/api/v1/me`, {
        headers: { authorization: "Basic resident" },
      }),
      fetch(`${server.baseUrl}/api/v1/me`, {
        headers: bearerHeaders("unknown-local-token"),
      }),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("www-authenticate"), 'Bearer realm="roadwatch-api"');
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
      assert.deepEqual(await jsonBody(response), {
        error: {
          code: "UNAUTHORIZED",
          message: "Bearer authentication is required.",
        },
      });
    }
  });

  await t.test("returns the authenticated current user without private email", async () => {
    const response = await fetch(`${server.baseUrl}/api/v1/me`, {
      headers: bearerHeaders(),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const payload = await jsonBody(response);
    const data = payload.data as {
      user: {
        id: string;
        name: string;
        publicLabel: string;
        role: string;
        ward: { slug: string; name: string; city: string };
        email?: string;
      };
    };

    assert.deepEqual(Object.keys(payload), ["data"]);
    assert.equal(data.user.id, residentAId);
    assert.equal(data.user.name, "Resident Desk A");
    assert.equal(data.user.publicLabel, "Street Scout A");
    assert.equal(data.user.role, "RESIDENT");
    assert.equal(data.user.ward.slug, "ward-94-demo");
    assert.equal(data.user.email, undefined);
  });

  await t.test("returns stable validation errors for invalid nearby and leaderboard queries", async () => {
    const responses = await Promise.all([
      fetch(`${server.baseUrl}/api/v1/violations/nearby?lat=91&lng=77`, {
        headers: bearerHeaders(),
      }),
      fetch(`${server.baseUrl}/api/v1/leaderboard?window=year`, {
        headers: bearerHeaders(),
      }),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 400);
      assert.deepEqual(await jsonBody(response), {
        error: {
          code: "INVALID_REQUEST",
          message: "Query parameters are invalid.",
        },
      });
    }
  });

  await t.test("nearby and leaderboard reads award and revoke one approved capture exactly once", async () => {
    const road = database
      .prepare('SELECT "id", "centerLat", "centerLng" FROM "RoadAsset" WHERE "slug" = ?')
      .get("100-feet-road") as {
      id: string;
      centerLat: number;
      centerLng: number;
    };
    const observationId = `api-v1-observation-${Date.now()}`;
    const description = `API approval transition ${Date.now()}`;
    const now = new Date().toISOString();

    database
      .prepare(
        `INSERT INTO "Observation" (
          "id", "roadId", "issueType", "issueClusterKey", "description",
          "severityScore", "impactScore", "gpsLat", "gpsLng", "evidencePath",
          "evidenceCapturedAt", "source", "humanCheckStatus", "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        observationId,
        road.id,
        "POTHOLE",
        observationId,
        description,
        65,
        65,
        road.centerLat,
        road.centerLng,
        "/uploads/seed/100-feet-road-bus-bay-1.jpg",
        now,
        "LIVE_CAMERA",
        "MANUAL_REVIEW",
        now,
      );
    database
      .prepare(
        `INSERT INTO "ObservationReceipt" ("id", "observationId", "userId", "createdAt")
         VALUES (?, ?, ?, ?)`,
      )
      .run(`api-v1-receipt-${Date.now()}`, observationId, residentAId, now);

    const nearbyPath = `/api/v1/violations/nearby?lat=${road.centerLat}&lng=${road.centerLng}&radiusMeters=500`;
    const baselineLeaderboard = await fetch(`${server.baseUrl}/api/v1/leaderboard`, {
      headers: bearerHeaders(),
    }).then(async (response) => {
      assert.equal(response.status, 200);
      return jsonBody(response);
    });
    const baselineScore = leaderboardScore(baselineLeaderboard, residentAId);
    const pendingNearby = await fetch(`${server.baseUrl}${nearbyPath}`, {
      headers: bearerHeaders(),
    }).then(jsonBody);
    const pendingViolations = (pendingNearby.data as { violations: Array<{ id: string }> })
      .violations;

    assert.equal(pendingViolations.some((violation) => violation.id === observationId), false);
    const pendingLeaderboard = await fetch(`${server.baseUrl}/api/v1/leaderboard`, {
      headers: bearerHeaders(),
    }).then(jsonBody);
    assert.equal(leaderboardScore(pendingLeaderboard, residentAId), baselineScore);

    database
      .prepare('UPDATE "Observation" SET "humanCheckStatus" = ? WHERE "id" = ?')
      .run("CLEARED", observationId);

    const approvedNearby = await fetch(`${server.baseUrl}${nearbyPath}`, {
      headers: bearerHeaders(),
    }).then(jsonBody);
    const approvedViolations = (
      approvedNearby.data as {
        violations: Array<{
          id: string;
          distanceMeters: number;
          description: string;
        }>;
      }
    ).violations;
    const approvedLeaderboard = await fetch(`${server.baseUrl}/api/v1/leaderboard`, {
      headers: bearerHeaders(),
    }).then(jsonBody);
    const repeatedApprovedLeaderboard = await fetch(
      `${server.baseUrl}/api/v1/leaderboard`,
      { headers: bearerHeaders() },
    ).then(jsonBody);

    assert.equal(
      approvedViolations.some(
        (violation) =>
          violation.id === observationId &&
          violation.description === description &&
          violation.distanceMeters === 0,
      ),
      true,
    );
    assert.deepEqual(
      approvedViolations.map((violation) => violation.distanceMeters),
      approvedViolations
        .map((violation) => violation.distanceMeters)
        .toSorted((left, right) => left - right),
    );
    assert.equal(leaderboardScore(approvedLeaderboard, residentAId), baselineScore + 10);
    assert.equal(
      leaderboardScore(repeatedApprovedLeaderboard, residentAId),
      baselineScore + 10,
    );

    database
      .prepare('UPDATE "Observation" SET "humanCheckStatus" = ? WHERE "id" = ?')
      .run("REJECTED", observationId);

    const revokedNearby = await fetch(`${server.baseUrl}${nearbyPath}`, {
      headers: bearerHeaders(),
    }).then(jsonBody);
    const revokedLeaderboard = await fetch(`${server.baseUrl}/api/v1/leaderboard`, {
      headers: bearerHeaders(),
    }).then(jsonBody);
    const repeatedRevokedLeaderboard = await fetch(
      `${server.baseUrl}/api/v1/leaderboard`,
      { headers: bearerHeaders() },
    ).then(jsonBody);

    assert.equal(
      (revokedNearby.data as { violations: Array<{ id: string }> }).violations.some(
        (violation) => violation.id === observationId,
      ),
      false,
    );
    assert.equal(leaderboardScore(revokedLeaderboard, residentAId), baselineScore);
    assert.equal(leaderboardScore(repeatedRevokedLeaderboard, residentAId), baselineScore);
  });
});
