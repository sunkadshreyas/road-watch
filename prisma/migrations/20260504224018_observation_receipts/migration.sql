-- CreateTable
CREATE TABLE "ObservationReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservationReceipt_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ObservationReceipt_observationId_key" ON "ObservationReceipt"("observationId");
CREATE INDEX "ObservationReceipt_userId_createdAt_idx" ON "ObservationReceipt"("userId", "createdAt");

-- Seed private receipts for the local demo accounts without exposing public identity.
INSERT OR IGNORE INTO "ObservationReceipt" ("id", "observationId", "userId", "createdAt")
SELECT lower(hex(randomblob(12))), o.id, u.id, o."createdAt"
FROM "Observation" o
JOIN "RoadAsset" r ON r.id = o."roadId"
JOIN "User" u ON u."email" = 'resident-a@roadwatch.demo'
WHERE r."slug" = '100-feet-road'
  AND o."evidencePath" = '/uploads/seed/100-feet-road-bus-bay-4.jpg';

INSERT OR IGNORE INTO "ObservationReceipt" ("id", "observationId", "userId", "createdAt")
SELECT lower(hex(randomblob(12))), o.id, u.id, o."createdAt"
FROM "Observation" o
JOIN "RoadAsset" r ON r.id = o."roadId"
JOIN "User" u ON u."email" = 'resident-a@roadwatch.demo'
WHERE r."slug" = '100-feet-road'
  AND o."issueClusterKey" = 'median-edge-parking';

INSERT OR IGNORE INTO "ObservationReceipt" ("id", "observationId", "userId", "createdAt")
SELECT lower(hex(randomblob(12))), o.id, u.id, o."createdAt"
FROM "Observation" o
JOIN "RoadAsset" r ON r.id = o."roadId"
JOIN "User" u ON u."email" = 'resident-b@roadwatch.demo'
WHERE r."slug" = 'cmh-road'
  AND o."issueClusterKey" = 'east-corridor-lighting';

INSERT OR IGNORE INTO "ObservationReceipt" ("id", "observationId", "userId", "createdAt")
SELECT lower(hex(randomblob(12))), o.id, u.id, o."createdAt"
FROM "Observation" o
JOIN "RoadAsset" r ON r.id = o."roadId"
JOIN "User" u ON u."email" = 'resident-a@roadwatch.demo'
WHERE r."slug" = 'bazaar-footpath-north'
  AND o."issueClusterKey" = 'school-gate-blockage';

INSERT OR IGNORE INTO "ObservationReceipt" ("id", "observationId", "userId", "createdAt")
SELECT lower(hex(randomblob(12))), o.id, u.id, o."createdAt"
FROM "Observation" o
JOIN "RoadAsset" r ON r.id = o."roadId"
JOIN "User" u ON u."email" = 'resident-b@roadwatch.demo'
WHERE r."slug" = 'metro-footpath-east'
  AND o."issueClusterKey" = 'cart-stack-entrance';
