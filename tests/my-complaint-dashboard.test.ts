import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLUSTER_KEY = "regression-resolved-cluster";
const OBSERVED_AT = new Date("2026-01-01T00:00:00.000Z");
const REPAIRED_AT = new Date("2026-02-01T00:00:00.000Z");
const VERIFIED_AT = new Date("2026-02-02T00:00:00.000Z");
const PENDING_AT = new Date("2026-03-01T00:00:00.000Z");
const REJECTED_AT = new Date("2026-04-01T00:00:00.000Z");

test(
  "resident dashboard clusters and moderation default stay derived from cleared captures",
  { timeout: 120_000 },
  async (t) => {
    const repoRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), "roadwatch-dashboard-test-"));
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
    const { getMyComplaintDashboard } = await import("@/lib/data");

    t.after(async () => {
      await prisma.$disconnect();
      await rm(tempDir, { recursive: true, force: true });
    });

    const ward = await prisma.ward.create({
      data: {
        slug: "regression-ward",
        name: "Regression Ward",
        city: "Testville",
        summary: "Ward used for dashboard regression coverage.",
        boundaryGeoJson: "{}",
        centerLat: 12.97,
        centerLng: 77.64,
      },
    });
    const [owner, otherResident, government] = await Promise.all([
      prisma.user.create({
        data: {
          wardId: ward.id,
          email: "owner@regression.test",
          name: "Regression Owner",
          publicLabel: "Collector Owner",
          role: "RESIDENT",
        },
      }),
      prisma.user.create({
        data: {
          wardId: ward.id,
          email: "other@regression.test",
          name: "Regression Other",
          publicLabel: "Collector Other",
          role: "RESIDENT",
        },
      }),
      prisma.user.create({
        data: {
          wardId: ward.id,
          email: "gov@regression.test",
          name: "Regression Gov",
          publicLabel: "Ward Desk",
          role: "GOV",
        },
      }),
    ]);
    const road = await prisma.roadAsset.create({
      data: {
        wardId: ward.id,
        slug: "regression-road",
        name: "Regression Road",
        assetType: "ROAD",
        osmId: "regression-1",
        summary: "Road used for dashboard regression coverage.",
        geometryGeoJson: '{"type":"LineString","coordinates":[[77.64,12.97],[77.641,12.971]]}',
        centerLat: 12.97,
        centerLng: 77.64,
        lengthMeters: 400,
        importanceScore: 5,
        surfaceLabel: "Asphalt",
      },
    });

    const clearedObservation = await prisma.observation.create({
      data: {
        roadId: road.id,
        issueType: "POTHOLE",
        issueClusterKey: CLUSTER_KEY,
        description: "Owner cleared pothole capture",
        severityScore: 80,
        impactScore: 80,
        gpsLat: 12.97,
        gpsLng: 77.64,
        evidencePath: "/uploads/regression/cleared.jpg",
        evidenceCapturedAt: OBSERVED_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "CLEARED",
        createdAt: OBSERVED_AT,
      },
    });
    await prisma.observationReceipt.create({
      data: { observationId: clearedObservation.id, userId: owner.id },
    });
    const repair = await prisma.repairEvent.create({
      data: {
        roadId: road.id,
        issueClusterKey: CLUSTER_KEY,
        status: "REPAIRED",
        note: "Resurfaced and sealed.",
        costEstimateInr: 12_000,
        recordedById: government.id,
        completedAt: REPAIRED_AT,
        createdAt: REPAIRED_AT,
      },
    });
    await prisma.repairVerification.create({
      data: {
        repairId: repair.id,
        createdById: otherResident.id,
        verdict: "FIX_HELD",
        note: "Confirmed the patch is holding.",
        createdAt: VERIFIED_AT,
      },
    });

    const resolvedDashboard = await getMyComplaintDashboard(owner.id);
    const resolvedComplaint = resolvedDashboard.complaints.find(
      (complaint) => complaint.clusterKey === CLUSTER_KEY,
    );

    assert.equal(resolvedDashboard.resolvedCount, 1);
    assert.equal(resolvedComplaint?.state, "resolved");
    assert.equal(resolvedComplaint?.stateLabel, "Repair verified by community");

    const pendingObservation = await prisma.observation.create({
      data: {
        roadId: road.id,
        issueType: "POTHOLE",
        issueClusterKey: CLUSTER_KEY,
        description: "Other resident pending capture at same spot",
        severityScore: 70,
        impactScore: 70,
        gpsLat: 12.97,
        gpsLng: 77.64,
        evidencePath: "/uploads/regression/pending.jpg",
        evidenceCapturedAt: PENDING_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "MANUAL_REVIEW",
        createdAt: PENDING_AT,
      },
    });
    await prisma.observationReceipt.create({
      data: { observationId: pendingObservation.id, userId: otherResident.id },
    });
    const rejectedObservation = await prisma.observation.create({
      data: {
        roadId: road.id,
        issueType: "POTHOLE",
        issueClusterKey: CLUSTER_KEY,
        description: "Other resident rejected capture at same spot",
        severityScore: 60,
        impactScore: 60,
        gpsLat: 12.97,
        gpsLng: 77.64,
        evidencePath: "/uploads/regression/rejected.jpg",
        evidenceCapturedAt: REJECTED_AT,
        source: "LIVE_CAMERA",
        humanCheckStatus: "REJECTED",
        createdAt: REJECTED_AT,
      },
    });
    await prisma.observationReceipt.create({
      data: { observationId: rejectedObservation.id, userId: otherResident.id },
    });

    const dashboardAfterNoise = await getMyComplaintDashboard(owner.id);
    const complaintAfterNoise = dashboardAfterNoise.complaints.find(
      (complaint) => complaint.clusterKey === CLUSTER_KEY,
    );

    assert.equal(
      dashboardAfterNoise.resolvedCount,
      1,
      "A pending or rejected capture from another resident must not reopen a resolved cluster.",
    );
    assert.equal(dashboardAfterNoise.openCount, 0);
    assert.equal(complaintAfterNoise?.state, "resolved");
    assert.equal(complaintAfterNoise?.stateLabel, "Repair verified by community");

    const defaultedObservation = await prisma.observation.create({
      data: {
        roadId: road.id,
        issueType: "POTHOLE",
        issueClusterKey: "regression-default-check",
        description: "Capture created without an explicit moderation status",
        severityScore: 50,
        impactScore: 50,
        gpsLat: 12.97,
        gpsLng: 77.64,
        evidencePath: "/uploads/regression/defaulted.jpg",
        evidenceCapturedAt: OBSERVED_AT,
        source: "LIVE_CAMERA",
      },
    });
    const storedDefault = await prisma.observation.findUniqueOrThrow({
      where: { id: defaultedObservation.id },
    });

    assert.equal(
      storedDefault.humanCheckStatus,
      "MANUAL_REVIEW",
      "Omitting humanCheckStatus must fail closed to MANUAL_REVIEW, not publish immediately.",
    );
  },
);
