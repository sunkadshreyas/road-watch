ALTER TABLE "Ward" ADD COLUMN "authorityLabel" TEXT;
ALTER TABLE "Ward" ADD COLUMN "authoritySource" TEXT;

ALTER TABLE "Observation" ADD COLUMN "sourceLabel" TEXT;
ALTER TABLE "Observation" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "Observation" ADD COLUMN "sourceNote" TEXT;
ALTER TABLE "Observation" ADD COLUMN "submissionDeviceHash" TEXT;

CREATE TABLE "AnonymousSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnonymousSubmission_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoadRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoadRating_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoadRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AnonymousSubmission_observationId_key" ON "AnonymousSubmission"("observationId");
CREATE INDEX "AnonymousSubmission_deviceHash_createdAt_idx" ON "AnonymousSubmission"("deviceHash", "createdAt");
CREATE INDEX "AnonymousSubmission_roadId_createdAt_idx" ON "AnonymousSubmission"("roadId", "createdAt");
CREATE UNIQUE INDEX "RoadRating_roadId_userId_key" ON "RoadRating"("roadId", "userId");
CREATE INDEX "RoadRating_roadId_value_idx" ON "RoadRating"("roadId", "value");
