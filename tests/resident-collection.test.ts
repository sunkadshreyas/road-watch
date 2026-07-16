import assert from "node:assert/strict";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import {
  govSessionCookie,
  parseFormContaining,
  residentASessionCookie,
  residentBSessionCookie,
  startNextTestServer,
} from "./support/next-test-server";

const liveCameraImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function addFields(formData: FormData, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
}

function visibleText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function storedEvidencePath(repoRoot: string, evidencePath: string) {
  if (evidencePath.startsWith("/api/observations/")) {
    return join(repoRoot, "storage", "observations", evidencePath.split("/").at(-1) ?? "");
  }

  return join(repoRoot, "public", evidencePath.replace(/^\//, ""));
}

async function submitServerAction(options: {
  baseUrl: string;
  path: string;
  cookie: string;
  hiddenInputs: Record<string, string>;
  fields: Record<string, string>;
}) {
  const formData = new FormData();

  addFields(formData, options.hiddenInputs);
  addFields(formData, options.fields);

  return fetch(`${options.baseUrl}${options.path}`, {
    method: "POST",
    headers: {
      cookie: options.cookie,
      origin: options.baseUrl,
    },
    body: formData,
    redirect: "manual",
  });
}

test(
  "resident collection, score, voting, and privacy flows stay consistent",
  { timeout: 120_000 },
  async (t) => {
    const server = await startNextTestServer("roadwatch-collection-test-");
    const database = new Database(server.dbPath);
    const createdEvidencePaths: string[] = [];

    t.after(async () => {
      database.close();
      await server.stop();

      for (const evidencePath of createdEvidencePaths) {
        await rm(storedEvidencePath(server.repoRoot, evidencePath), { force: true });
      }
    });

    const residentA = database
      .prepare('SELECT "id", "email", "publicLabel" FROM "User" WHERE "name" = ?')
      .get("Resident Desk A") as { id: string; email: string; publicLabel: string };
    const residentB = database
      .prepare('SELECT "id", "email", "publicLabel" FROM "User" WHERE "name" = ?')
      .get("Resident Desk B") as { id: string; email: string; publicLabel: string };

    assert.notEqual(
      residentA.publicLabel,
      residentB.publicLabel,
      "Seeded leaderboard identities must use distinct privacy-safe public labels.",
    );
    const road = database
      .prepare('SELECT "id", "slug", "centerLat", "centerLng" FROM "RoadAsset" WHERE "slug" = ?')
      .get("12th-main-road") as {
      id: string;
      slug: string;
      centerLat: number;
      centerLng: number;
    };
    const nonClearedSeedCount = (
      database
        .prepare(
          'SELECT COUNT(*) AS "count" FROM "Observation" WHERE "humanCheckStatus" != ?',
        )
        .get("CLEARED") as { count: number }
    ).count;

    assert.equal(
      nonClearedSeedCount,
      0,
      "Seeded demo observations must be explicitly cleared so the fail-closed default does not hide public records.",
    );

    const observationStorageDir = join(server.repoRoot, "storage", "observations");
    const listStoredEvidence = async () => {
      try {
        return new Set(await readdir(observationStorageDir));
      } catch {
        return new Set<string>();
      }
    };

    const beforeReceiptCount = (
      database
        .prepare('SELECT COUNT(*) AS "count" FROM "ObservationReceipt" WHERE "userId" = ?')
        .get(residentA.id) as { count: number }
    ).count;
    const description = `Fresh collection test ${Date.now()}`;
    const capturedAt = new Date().toISOString();
    const reportPath = `/report?road=${road.slug}`;
    const reportResponse = await fetch(`${server.baseUrl}${reportPath}`, {
      headers: { cookie: residentASessionCookie },
    });
    const reportHtml = await reportResponse.text();

    assert.equal(reportResponse.status, 200);

    const collectionInputs = parseFormContaining(reportHtml, "roadId", road.id);
    const collectionResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: reportPath,
      cookie: residentASessionCookie,
      hiddenInputs: collectionInputs,
      fields: {
        roadId: road.id,
        captureMode: "live-camera",
        imageData: liveCameraImage,
        peopleDetected: "false",
        capturedAt,
        gpsLat: String(road.centerLat),
        gpsLng: String(road.centerLng),
        issueType: "POTHOLE",
        severityScore: "65",
        description,
      },
    });
    const collectionResult = await collectionResponse.text();

    assert.equal(
      collectionResponse.status,
      200,
      `Expected the collection action to stay inline.\nRecent server output:\n${server.serverOutput}`,
    );
    assert.match(collectionResult, /Violation collected/);
    assert.match(collectionResult, /View leaderboard/);

    const createdObservation = database
      .prepare(
        `SELECT o."id", o."evidencePath", o."humanCheckStatus"
         FROM "Observation" o
         INNER JOIN "ObservationReceipt" r ON r."observationId" = o."id"
         WHERE r."userId" = ? AND o."description" = ?`,
      )
      .get(residentA.id, description) as {
      id: string;
      evidencePath: string;
      humanCheckStatus: string;
    };

    assert.ok(createdObservation);
    assert.equal(createdObservation.humanCheckStatus, "MANUAL_REVIEW");
    createdEvidencePaths.push(createdObservation.evidencePath);

    const afterReceiptCount = (
      database
        .prepare('SELECT COUNT(*) AS "count" FROM "ObservationReceipt" WHERE "userId" = ?')
        .get(residentA.id) as { count: number }
    ).count;

    assert.equal(afterReceiptCount, beforeReceiptCount + 1);

    const [anonymousEvidenceResponse, ownerEvidenceResponse, govEvidenceResponse] =
      await Promise.all([
        fetch(`${server.baseUrl}${createdObservation.evidencePath}`),
        fetch(`${server.baseUrl}${createdObservation.evidencePath}`, {
          headers: { cookie: residentASessionCookie },
        }),
        fetch(`${server.baseUrl}${createdObservation.evidencePath}`, {
          headers: { cookie: govSessionCookie },
        }),
      ]);

    assert.equal(anonymousEvidenceResponse.status, 404);
    assert.equal(ownerEvidenceResponse.status, 200);
    assert.equal(govEvidenceResponse.status, 200);

    const [collectionPageResponse, roadPageResponse] = await Promise.all([
      fetch(`${server.baseUrl}/collection`, {
        headers: { cookie: residentASessionCookie },
      }),
      fetch(`${server.baseUrl}/roads/${road.slug}`, {
        headers: { cookie: residentASessionCookie },
      }),
    ]);
    const [collectionPageHtml, roadPageHtml] = await Promise.all([
      collectionPageResponse.text(),
      roadPageResponse.text(),
    ]);

    assert.match(collectionPageHtml, new RegExp(description));
    const collectionPageText = visibleText(collectionPageHtml);

    assert.match(collectionPageText, /Collection \+40/);
    assert.match(collectionPageText, /Likes \+2/);
    assert.match(collectionPageText, /Dislikes -0/);
    assert.match(collectionPageText, /Total 42/);
    assert.match(roadPageHtml, new RegExp(description));
    assert.match(roadPageHtml, /Manual review pending/);
    assert.match(roadPageHtml, /You cannot vote on a violation you collected/);

    const [anonymousPendingResponse, residentBPendingResponse, govPendingResponse, govPendingRepairResponse, pendingExportResponse] =
      await Promise.all([
        fetch(`${server.baseUrl}/roads/${road.slug}`),
        fetch(`${server.baseUrl}/roads/${road.slug}`, {
          headers: { cookie: residentBSessionCookie },
        }),
        fetch(`${server.baseUrl}/roads/${road.slug}`, {
          headers: { cookie: govSessionCookie },
        }),
        fetch(`${server.baseUrl}/roads/${road.slug}?section=history`, {
          headers: { cookie: govSessionCookie },
        }),
        fetch(`${server.baseUrl}/api/roads/${road.slug}/data.json`),
      ]);
    const [anonymousPendingHtml, residentBPendingHtml, govPendingHtml, govPendingRepairHtml, pendingExportJson] =
      await Promise.all([
        anonymousPendingResponse.text(),
        residentBPendingResponse.text(),
        govPendingResponse.text(),
        govPendingRepairResponse.text(),
        pendingExportResponse.text(),
      ]);

    assert.doesNotMatch(anonymousPendingHtml, new RegExp(description));
    assert.doesNotMatch(residentBPendingHtml, new RegExp(description));
    assert.doesNotMatch(govPendingRepairHtml, new RegExp(description));
    assert.doesNotMatch(pendingExportJson, new RegExp(description));
    assert.match(govPendingHtml, new RegExp(description));
    assert.match(govPendingHtml, /Approve capture/);
    assert.match(govPendingHtml, /Reject capture/);

    const moderationInputs = parseFormContaining(
      govPendingHtml,
      "observationId",
      createdObservation.id,
    );
    const moderationResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: `/roads/${road.slug}`,
      cookie: govSessionCookie,
      hiddenInputs: moderationInputs,
      fields: {
        observationId: createdObservation.id,
        moderationStatus: "CLEARED",
      },
    });

    assert.equal(moderationResponse.status, 200);
    assert.equal(
      (
        database
          .prepare('SELECT "humanCheckStatus" FROM "Observation" WHERE "id" = ?')
          .get(createdObservation.id) as { humanCheckStatus: string }
      ).humanCheckStatus,
      "CLEARED",
    );

    const repeatedModerationResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: `/roads/${road.slug}`,
      cookie: govSessionCookie,
      hiddenInputs: moderationInputs,
      fields: {
        observationId: createdObservation.id,
        moderationStatus: "REJECTED",
      },
    });
    const repeatedModerationResult = await repeatedModerationResponse.text();

    assert.match(repeatedModerationResult, /already been reviewed/i);
    assert.equal(
      (
        database
          .prepare('SELECT "humanCheckStatus" FROM "Observation" WHERE "id" = ?')
          .get(createdObservation.id) as { humanCheckStatus: string }
      ).humanCheckStatus,
      "CLEARED",
    );

    const [anonymousClearedHtml, clearedExportJson] = await Promise.all([
      fetch(`${server.baseUrl}/roads/${road.slug}`).then((response) => response.text()),
      fetch(`${server.baseUrl}/api/roads/${road.slug}/data.json`).then((response) =>
        response.text(),
      ),
    ]);

    assert.match(anonymousClearedHtml, new RegExp(description));
    assert.match(clearedExportJson, new RegExp(description));
    assert.equal(
      (await fetch(`${server.baseUrl}${createdObservation.evidencePath}`)).status,
      200,
    );

    const evidenceBeforeDuplicate = await listStoredEvidence();
    const duplicateResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: reportPath,
      cookie: residentASessionCookie,
      hiddenInputs: collectionInputs,
      fields: {
        roadId: road.id,
        captureMode: "live-camera",
        imageData: liveCameraImage,
        peopleDetected: "false",
        capturedAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        gpsLat: String(road.centerLat),
        gpsLng: String(road.centerLng),
        issueType: "POTHOLE",
        severityScore: "65",
        description,
      },
    });
    const duplicateResult = await duplicateResponse.text();
    const duplicateReceiptCount = (
      database
        .prepare('SELECT COUNT(*) AS "count" FROM "ObservationReceipt" WHERE "userId" = ?')
        .get(residentA.id) as { count: number }
    ).count;
    const evidenceAfterDuplicate = await listStoredEvidence();
    const orphanedDuplicateEvidence = [...evidenceAfterDuplicate].filter(
      (name) => !evidenceBeforeDuplicate.has(name),
    );

    assert.equal(duplicateResponse.status, 200);
    assert.match(duplicateResult, /duplicate of a violation/);
    assert.equal(duplicateReceiptCount, afterReceiptCount);
    assert.deepEqual(
      orphanedDuplicateEvidence,
      [],
      "A rejected duplicate submission must remove the evidence file it wrote before the transaction.",
    );

    const rejectedDescription = `Rejected collection test ${Date.now()}`;
    const rejectedCollectionResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: reportPath,
      cookie: residentASessionCookie,
      hiddenInputs: collectionInputs,
      fields: {
        roadId: road.id,
        captureMode: "live-camera",
        imageData: liveCameraImage,
        peopleDetected: "false",
        capturedAt: new Date().toISOString(),
        gpsLat: String(road.centerLat),
        gpsLng: String(road.centerLng),
        issueType: "MISSING_STREET_LIGHT",
        severityScore: "65",
        description: rejectedDescription,
      },
    });
    const rejectedCollectionResult = await rejectedCollectionResponse.text();

    assert.match(rejectedCollectionResult, /Violation collected/);

    const rejectedObservation = database
      .prepare(
        `SELECT o."id", o."evidencePath"
         FROM "Observation" o
         INNER JOIN "ObservationReceipt" receipt ON receipt."observationId" = o."id"
         WHERE receipt."userId" = ? AND o."description" = ?`,
      )
      .get(residentA.id, rejectedDescription) as {
      id: string;
      evidencePath: string;
    };

    createdEvidencePaths.push(rejectedObservation.evidencePath);

    const rejectedGovHtml = await fetch(`${server.baseUrl}/roads/${road.slug}`, {
      headers: { cookie: govSessionCookie },
    }).then((response) => response.text());
    const rejectedModerationInputs = parseFormContaining(
      rejectedGovHtml,
      "observationId",
      rejectedObservation.id,
    );

    await submitServerAction({
      baseUrl: server.baseUrl,
      path: `/roads/${road.slug}`,
      cookie: govSessionCookie,
      hiddenInputs: rejectedModerationInputs,
      fields: {
        observationId: rejectedObservation.id,
        moderationStatus: "REJECTED",
      },
    });

    const [rejectedCollectionHtml, rejectedRepairHtml] = await Promise.all([
      fetch(`${server.baseUrl}/collection`, {
        headers: { cookie: residentASessionCookie },
      }).then((response) => response.text()),
      fetch(`${server.baseUrl}/roads/${road.slug}?section=history`, {
        headers: { cookie: govSessionCookie },
      }).then((response) => response.text()),
    ]);
    const rejectedCollectionText = visibleText(rejectedCollectionHtml);

    assert.match(rejectedCollectionText, new RegExp(rejectedDescription));
    assert.match(rejectedCollectionText, /Rejected/);
    assert.match(rejectedCollectionText, /Collection \+40/);
    assert.match(rejectedCollectionText, /Total 42/);
    assert.doesNotMatch(rejectedRepairHtml, new RegExp(rejectedDescription));

    const distantDescription = `Distant collection test ${Date.now()}`;
    const distantResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: reportPath,
      cookie: residentASessionCookie,
      hiddenInputs: collectionInputs,
      fields: {
        roadId: road.id,
        captureMode: "live-camera",
        imageData: liveCameraImage,
        peopleDetected: "false",
        capturedAt: new Date().toISOString(),
        gpsLat: "0",
        gpsLng: "0",
        issueType: "MISSING_STREET_LIGHT",
        severityScore: "65",
        description: distantDescription,
      },
    });
    const distantResult = await distantResponse.text();
    const incorrectlyCreatedDistantObservation = database
      .prepare(
        'SELECT "evidencePath" FROM "Observation" WHERE "description" = ?',
      )
      .get(distantDescription) as { evidencePath: string } | undefined;

    if (incorrectlyCreatedDistantObservation) {
      createdEvidencePaths.push(incorrectlyCreatedDistantObservation.evidencePath);
    }

    assert.equal(distantResponse.status, 200);
    assert.match(distantResult, /confirm this violation belongs to the selected road/i);
    assert.equal(incorrectlyCreatedDistantObservation, undefined);

    const receiptCountBeforeGovernmentAttempt = (
      database
        .prepare('SELECT COUNT(*) AS "count" FROM "ObservationReceipt" WHERE "userId" = ?')
        .get(residentA.id) as { count: number }
    ).count;
    const governmentCollectionResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: reportPath,
      cookie: govSessionCookie,
      hiddenInputs: collectionInputs,
      fields: {
        roadId: road.id,
        captureMode: "live-camera",
        imageData: liveCameraImage,
        peopleDetected: "false",
        capturedAt: new Date(Date.now() + 60_000).toISOString(),
        gpsLat: String(road.centerLat),
        gpsLng: String(road.centerLng),
        issueType: "BROKEN_FOOTPATH",
        severityScore: "65",
        description: "Government accounts cannot create resident collections.",
      },
    });
    const governmentCollectionResult = await governmentCollectionResponse.text();

    assert.equal(governmentCollectionResponse.status, 200);
    assert.match(
      governmentCollectionResult,
      /Only resident accounts can collect or vote on violations/,
    );
    assert.equal(
      (
        database
          .prepare('SELECT COUNT(*) AS "count" FROM "ObservationReceipt" WHERE "userId" = ?')
          .get(residentA.id) as { count: number }
      ).count,
      receiptCountBeforeGovernmentAttempt,
    );

    const targetObservation = database
      .prepare(
        `SELECT o."id", road."slug"
         FROM "Observation" o
         INNER JOIN "ObservationReceipt" receipt ON receipt."observationId" = o."id"
         INNER JOIN "RoadAsset" road ON road."id" = o."roadId"
         WHERE receipt."userId" = ? AND road."slug" = ?
         LIMIT 1`,
      )
      .get(residentB.id, "cmh-road") as { id: string; slug: string };
    const votePageResponse = await fetch(
      `${server.baseUrl}/roads/${targetObservation.slug}`,
      { headers: { cookie: residentASessionCookie } },
    );
    const votePageHtml = await votePageResponse.text();
    const voteInputs = parseFormContaining(
      votePageHtml,
      "observationId",
      targetObservation.id,
    );

    await submitServerAction({
      baseUrl: server.baseUrl,
      path: `/roads/${targetObservation.slug}`,
      cookie: residentASessionCookie,
      hiddenInputs: voteInputs,
      fields: {
        observationId: targetObservation.id,
        voteKind: "LIKE",
      },
    });

    const likeVote = database
      .prepare(
        'SELECT "kind" FROM "ObservationVote" WHERE "observationId" = ? AND "userId" = ?',
      )
      .get(targetObservation.id, residentA.id) as { kind: string };

    assert.equal(likeVote.kind, "LIKE");

    const likedCollectionResponse = await fetch(`${server.baseUrl}/collection`, {
      headers: { cookie: residentBSessionCookie },
    });
    const likedCollectionHtml = await likedCollectionResponse.text();

    assert.match(visibleText(likedCollectionHtml), /21 XP/);

    await submitServerAction({
      baseUrl: server.baseUrl,
      path: `/roads/${targetObservation.slug}`,
      cookie: residentASessionCookie,
      hiddenInputs: voteInputs,
      fields: {
        observationId: targetObservation.id,
        voteKind: "LIKE",
      },
    });

    const removedVote = database
      .prepare(
        'SELECT "kind" FROM "ObservationVote" WHERE "observationId" = ? AND "userId" = ?',
      )
      .get(targetObservation.id, residentA.id);

    assert.equal(removedVote, undefined);

    await submitServerAction({
      baseUrl: server.baseUrl,
      path: `/roads/${targetObservation.slug}`,
      cookie: residentASessionCookie,
      hiddenInputs: voteInputs,
      fields: {
        observationId: targetObservation.id,
        voteKind: "DISLIKE",
      },
    });

    const dislikeVote = database
      .prepare(
        'SELECT "kind" FROM "ObservationVote" WHERE "observationId" = ? AND "userId" = ?',
      )
      .get(targetObservation.id, residentA.id) as { kind: string };

    assert.equal(dislikeVote.kind, "DISLIKE");

    const [leaderboardResponse, weeklyLeaderboardResponse, govReportResponse] =
      await Promise.all([
        fetch(`${server.baseUrl}/leaderboard`, {
          headers: { cookie: residentASessionCookie },
        }),
        fetch(`${server.baseUrl}/leaderboard?window=week`, {
          headers: { cookie: residentASessionCookie },
        }),
        fetch(`${server.baseUrl}/report`, {
          headers: { cookie: govSessionCookie },
          redirect: "manual",
        }),
      ]);
    const [leaderboardHtml, weeklyLeaderboardHtml] = await Promise.all([
      leaderboardResponse.text(),
      weeklyLeaderboardResponse.text(),
    ]);

    assert.equal(leaderboardResponse.status, 200);
    assert.doesNotMatch(leaderboardHtml, new RegExp(residentA.email));
    assert.doesNotMatch(leaderboardHtml, new RegExp(residentB.email));
    const weeklyLeaderboardText = visibleText(weeklyLeaderboardHtml);

    assert.match(weeklyLeaderboardText, /1 collected/);
    assert.match(weeklyLeaderboardText, /10 Points/);
    assert.equal(govReportResponse.status, 200);

    const govReportHtml = await govReportResponse.text();

    assert.match(
      govReportHtml,
      /Government-labelled accounts review requests instead of creating them/,
    );
    assert.doesNotMatch(govReportHtml, /Capture encounter/);

    const concurrentDescription = `Concurrent collection test ${Date.now()}`;
    const concurrentFields = {
      roadId: road.id,
      captureMode: "live-camera",
      imageData: liveCameraImage,
      peopleDetected: "false",
      capturedAt: new Date().toISOString(),
      gpsLat: String(road.centerLat),
      gpsLng: String(road.centerLng),
      issueType: "VENDOR_ENCROACHMENT",
      severityScore: "65",
      description: concurrentDescription,
    };
    const concurrentResponses = await Promise.all([
      submitServerAction({
        baseUrl: server.baseUrl,
        path: reportPath,
        cookie: residentASessionCookie,
        hiddenInputs: collectionInputs,
        fields: concurrentFields,
      }),
      submitServerAction({
        baseUrl: server.baseUrl,
        path: reportPath,
        cookie: residentASessionCookie,
        hiddenInputs: collectionInputs,
        fields: concurrentFields,
      }),
    ]);
    const concurrentResults = await Promise.all(
      concurrentResponses.map((response) => response.text()),
    );
    const concurrentObservations = database
      .prepare(
        `SELECT o."evidencePath"
         FROM "Observation" o
         INNER JOIN "ObservationReceipt" receipt ON receipt."observationId" = o."id"
         WHERE receipt."userId" = ? AND o."description" = ?`,
      )
      .all(residentA.id, concurrentDescription) as Array<{
      evidencePath: string;
    }>;

    createdEvidencePaths.push(
      ...concurrentObservations.map((observation) => observation.evidencePath),
    );
    assert.equal(concurrentObservations.length, 1);
    assert.equal(
      concurrentResults.filter((result) => result.includes("Violation collected"))
        .length,
      1,
    );
  },
);
