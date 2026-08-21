PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Observation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "issueClusterKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severityScore" INTEGER NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "gpsLat" REAL,
    "gpsLng" REAL,
    "evidencePath" TEXT NOT NULL,
    "evidenceCapturedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LIVE_CAMERA',
    "humanCheckStatus" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Observation_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Observation" (
    "createdAt",
    "description",
    "evidenceCapturedAt",
    "evidencePath",
    "gpsLat",
    "gpsLng",
    "humanCheckStatus",
    "id",
    "impactScore",
    "issueClusterKey",
    "issueType",
    "roadId",
    "severityScore",
    "source"
)
SELECT
    "createdAt",
    "description",
    "evidenceCapturedAt",
    "evidencePath",
    "gpsLat",
    "gpsLng",
    "humanCheckStatus",
    "id",
    "impactScore",
    "issueClusterKey",
    "issueType",
    "roadId",
    "severityScore",
    "source"
FROM "Observation";

DROP TABLE "Observation";
ALTER TABLE "new_Observation" RENAME TO "Observation";
CREATE INDEX "Observation_roadId_issueClusterKey_idx" ON "Observation"("roadId", "issueClusterKey");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
