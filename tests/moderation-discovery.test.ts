import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import {
  govSessionCookie,
  parseFormContaining,
  residentASessionCookie,
  startNextTestServer,
} from "./support/next-test-server";

const liveCameraImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function addFields(formData: FormData, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
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

async function collectPendingCapture(options: {
  server: Awaited<ReturnType<typeof startNextTestServer>>;
  road: { id: string; slug: string; centerLat: number; centerLng: number };
  issueType: string;
  description: string;
}) {
  const reportPath = `/report?road=${options.road.slug}`;
  const reportHtml = await fetch(`${options.server.baseUrl}${reportPath}`, {
    headers: { cookie: residentASessionCookie },
  }).then((response) => response.text());
  const inputs = parseFormContaining(reportHtml, "roadId", options.road.id);
  const response = await submitServerAction({
    baseUrl: options.server.baseUrl,
    path: reportPath,
    cookie: residentASessionCookie,
    hiddenInputs: inputs,
    fields: {
      roadId: options.road.id,
      captureMode: "live-camera",
      imageData: liveCameraImage,
      peopleDetected: "false",
      capturedAt: new Date().toISOString(),
      gpsLat: String(options.road.centerLat),
      gpsLng: String(options.road.centerLng),
      issueType: options.issueType,
      severityScore: "65",
      description: options.description,
    },
  });

  assert.equal(
    response.status,
    200,
    `Expected the collection action to stay inline.\nRecent server output:\n${options.server.serverOutput}`,
  );
  assert.match(await response.text(), /Violation collected/);
}

test(
  "central moderation queue is gov-only and discovers pending captures across roads",
  { timeout: 240_000 },
  async (t) => {
    const server = await startNextTestServer("roadwatch-moderation-discovery-test-");
    const database = new Database(server.dbPath);
    const createdEvidencePaths: string[] = [];

    t.after(async () => {
      database.close();
      await server.stop();

      for (const evidencePath of createdEvidencePaths) {
        await rm(storedEvidencePath(server.repoRoot, evidencePath), { force: true });
      }
    });

    const readRoad = (slug: string) =>
      database
        .prepare('SELECT "id", "slug", "centerLat", "centerLng" FROM "RoadAsset" WHERE "slug" = ?')
        .get(slug) as { id: string; slug: string; centerLat: number; centerLng: number };
    const roadA = readRoad("12th-main-road");
    const roadB = readRoad("cmh-road");

    const descriptionA = `Moderation discovery road A ${Date.now()}`;
    const descriptionB = `Moderation discovery road B ${Date.now()}`;

    await collectPendingCapture({
      server,
      road: roadA,
      issueType: "POTHOLE",
      description: descriptionA,
    });
    await collectPendingCapture({
      server,
      road: roadB,
      issueType: "MISSING_STREET_LIGHT",
      description: descriptionB,
    });

    const readObservation = (description: string) =>
      database
        .prepare(
          'SELECT "id", "evidencePath", "humanCheckStatus" FROM "Observation" WHERE "description" = ?',
        )
        .get(description) as {
        id: string;
        evidencePath: string;
        humanCheckStatus: string;
      };
    const observationA = readObservation(descriptionA);
    const observationB = readObservation(descriptionB);

    createdEvidencePaths.push(observationA.evidencePath, observationB.evidencePath);
    assert.equal(observationA.humanCheckStatus, "MANUAL_REVIEW");
    assert.equal(observationB.humanCheckStatus, "MANUAL_REVIEW");

    const [anonymousResponse, residentResponse, govResponse] = await Promise.all([
      fetch(`${server.baseUrl}/moderation`, { redirect: "manual" }),
      fetch(`${server.baseUrl}/moderation`, {
        headers: { cookie: residentASessionCookie },
        redirect: "manual",
      }),
      fetch(`${server.baseUrl}/moderation`, {
        headers: { cookie: govSessionCookie },
      }),
    ]);

    assert.ok(
      anonymousResponse.status >= 300 && anonymousResponse.status < 400,
      "Anonymous visitors must be redirected away from the moderation queue.",
    );
    assert.match(anonymousResponse.headers.get("location") ?? "", /\/account/);
    assert.ok(
      residentResponse.status >= 300 && residentResponse.status < 400,
      "Resident accounts must be redirected away from the government moderation queue.",
    );
    const residentLocation = residentResponse.headers.get("location") ?? "";

    assert.doesNotMatch(
      residentLocation,
      /\/account/,
      "Resident accounts must be sent to the overview, not the sign-in screen.",
    );
    assert.match(residentLocation, /\/$/);
    assert.equal(govResponse.status, 200);

    const govHtml = await govResponse.text();

    assert.match(govHtml, new RegExp(descriptionA));
    assert.match(govHtml, new RegExp(descriptionB));
    assert.match(govHtml, /12th Main Road/);
    assert.match(govHtml, /CMH Road/);
    assert.match(govHtml, /Approve capture/);
    assert.match(govHtml, /Reject capture/);

    const moderationInputs = parseFormContaining(govHtml, "observationId", observationA.id);
    const approveResponse = await submitServerAction({
      baseUrl: server.baseUrl,
      path: "/moderation",
      cookie: govSessionCookie,
      hiddenInputs: moderationInputs,
      fields: {
        observationId: observationA.id,
        moderationStatus: "CLEARED",
      },
    });

    assert.equal(approveResponse.status, 200);
    assert.equal(
      (
        database
          .prepare('SELECT "humanCheckStatus" FROM "Observation" WHERE "id" = ?')
          .get(observationA.id) as { humanCheckStatus: string }
      ).humanCheckStatus,
      "CLEARED",
    );

    const refreshedGovHtml = await fetch(`${server.baseUrl}/moderation`, {
      headers: { cookie: govSessionCookie },
    }).then((response) => response.text());

    assert.doesNotMatch(
      refreshedGovHtml,
      new RegExp(descriptionA),
      "An approved capture must leave the pending moderation queue.",
    );
    assert.match(
      refreshedGovHtml,
      new RegExp(descriptionB),
      "Still-pending captures on other roads must remain discoverable.",
    );

    const residentAfterApprovalResponse = await fetch(`${server.baseUrl}/moderation`, {
      headers: { cookie: residentASessionCookie },
      redirect: "manual",
    });

    assert.ok(
      residentAfterApprovalResponse.status >= 300 &&
        residentAfterApprovalResponse.status < 400,
      "The moderation queue must stay government-only after decisions are recorded.",
    );
  },
);
