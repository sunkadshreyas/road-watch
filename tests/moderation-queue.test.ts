import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CAPTURED_AT = new Date("2026-01-01T00:00:00.000Z");
const PENDING_A_AT = new Date("2026-03-01T00:00:00.000Z");
const PENDING_B_AT = new Date("2026-03-02T00:00:00.000Z");

test(
  "pending moderation queue discovers manual-review captures across every road",
  { timeout: 120_000 },
  async (t) => {
    const repoRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), "roadwatch-moderation-queue-test-"));
    const dbPath = join(tempDir, "dev.db");
    const databaseUrl = `file:${dbPath}`;

    await writeFile(dbPath, "");
    await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      maxBuffer: 10 * 1024 * 1024,
    });

    process.env.DATABASE_URL = databaseUrl;
    const { prisma } = await import("@/lib/prisma");
    const { getPendingModerationQueue } = await import("@/lib/data");

    t.after(async () => {
      await prisma.$disconnect();
      await rm(tempDir, { recursive: true, force: true });
    });

    const ward = await prisma.ward.create({
      data: {
        slug: "moderation-ward",
        name: "Moderation Ward",
        city: "Testville",
        summary: "Ward used for moderation-queue regression coverage.",
        boundaryGeoJson: "{}",
        centerLat: 12.97,
        centerLng: 77.64,
      },
    });
    const collector = await prisma.user.create({
      data: {
        wardId: ward.id,
        email: "collector@moderation.test",
        name: "Moderation Collector",
        publicLabel: "Collector Owl",
        role: "RESIDENT",
      },
    });
    const [roadA, roadB] = await Promise.all([
      prisma.roadAsset.create({
        data: {
          wardId: ward.id,
          slug: "moderation-road-a",
          name: "Moderation Road A",
          assetType: "ROAD",
          osmId: "moderation-a",
          summary: "First road used for moderation-queue coverage.",
          geometryGeoJson:
            '{"type":"LineString","coordinates":[[77.64,12.97],[77.641,12.971]]}',
          centerLat: 12.97,
          centerLng: 77.64,
          lengthMeters: 400,
          importanceScore: 5,
          surfaceLabel: "Asphalt",
        },
      }),
      prisma.roadAsset.create({
        data: {
          wardId: ward.id,
          slug: "moderation-road-b",
          name: "Moderation Road B",
          assetType: "FOOTPATH",
          osmId: "moderation-b",
          summary: "Second road used for moderation-queue coverage.",
          geometryGeoJson:
            '{"type":"LineString","coordinates":[[77.65,12.98],[77.651,12.981]]}',
          centerLat: 12.98,
          centerLng: 77.65,
          lengthMeters: 300,
          importanceScore: 4,
          surfaceLabel: "Paver",
        },
      }),
    ]);

    const clearedOnRoadA = await prisma.observation.create({
      data: {
        roadId: roadA.id,
        issueType: "POTHOLE",
        issueClusterKey: "moderation-cleared",
        description: "Already published capture on road A",
        severityScore: 80,
        impactScore: 80,
        gpsLat: 12.97,
        gpsLng: 77.64,
        evidencePath: "/uploads/moderation/cleared.jpg",
        evidenceCapturedAt: CAPTURED_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "CLEARED",
        createdAt: CAPTURED_AT,
      },
    });
    await prisma.observation.create({
      data: {
        roadId: roadA.id,
        issueType: "POTHOLE",
        issueClusterKey: "moderation-rejected",
        description: "Already rejected capture on road A",
        severityScore: 60,
        impactScore: 60,
        gpsLat: 12.97,
        gpsLng: 77.64,
        evidencePath: "/uploads/moderation/rejected.jpg",
        evidenceCapturedAt: CAPTURED_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "REJECTED",
        createdAt: CAPTURED_AT,
      },
    });
    const pendingOnRoadA = await prisma.observation.create({
      data: {
        roadId: roadA.id,
        issueType: "POTHOLE",
        issueClusterKey: "moderation-pending-a",
        description: "Pending capture on road A",
        severityScore: 70,
        impactScore: 70,
        gpsLat: 12.9701,
        gpsLng: 77.6402,
        evidencePath: "/uploads/moderation/pending-a.jpg",
        evidenceCapturedAt: PENDING_A_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "MANUAL_REVIEW",
        createdAt: PENDING_A_AT,
      },
    });
    await prisma.observationReceipt.create({
      data: { observationId: pendingOnRoadA.id, userId: collector.id },
    });
    const pendingOnRoadB = await prisma.observation.create({
      data: {
        roadId: roadB.id,
        issueType: "FOOTPATH_BLOCKED",
        issueClusterKey: "moderation-pending-b",
        description: "Pending capture on road B",
        severityScore: 50,
        impactScore: 50,
        gpsLat: 12.9801,
        gpsLng: 77.6502,
        evidencePath: "/uploads/moderation/pending-b.jpg",
        evidenceCapturedAt: PENDING_B_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "MANUAL_REVIEW",
        createdAt: PENDING_B_AT,
      },
    });
    await prisma.observationReceipt.create({
      data: { observationId: pendingOnRoadB.id, userId: collector.id },
    });

    const queue = await getPendingModerationQueue();

    assert.equal(
      queue.totalCount,
      2,
      "The queue must surface only manual-review captures, not cleared or rejected ones.",
    );
    const queuedIds = queue.captures.map((capture) => capture.id);

    assert.deepEqual(
      queuedIds,
      [pendingOnRoadA.id, pendingOnRoadB.id],
      "Pending captures must be discovered across every road, oldest first.",
    );
    assert.ok(
      !queuedIds.includes(clearedOnRoadA.id),
      "Cleared captures must not appear in the moderation queue.",
    );

    const roadSlugs = new Set(queue.captures.map((capture) => capture.roadSlug));

    assert.ok(
      roadSlugs.has("moderation-road-a") && roadSlugs.has("moderation-road-b"),
      "The queue must span multiple roads, not a single road.",
    );

    const captureA = queue.captures.find((capture) => capture.id === pendingOnRoadA.id);

    assert.equal(captureA?.roadName, "Moderation Road A");
    assert.equal(captureA?.collectorLabel, "Collector Owl");
    assert.equal(captureA?.issueLabel, "Pothole");

    const decision = await prisma.observation.updateMany({
      where: { id: pendingOnRoadA.id, humanCheckStatus: "MANUAL_REVIEW" },
      data: { humanCheckStatus: "CLEARED" },
    });

    assert.equal(decision.count, 1);

    const queueAfterApproval = await getPendingModerationQueue();

    assert.equal(
      queueAfterApproval.totalCount,
      1,
      "An approved capture must leave the pending moderation queue.",
    );
    assert.deepEqual(
      queueAfterApproval.captures.map((capture) => capture.id),
      [pendingOnRoadB.id],
      "Only still-pending captures must remain after a decision.",
    );
  },
);
