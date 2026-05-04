-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "osmReference" TEXT,
    "boundaryGeoJson" TEXT NOT NULL,
    "centerLat" REAL NOT NULL,
    "centerLng" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wardId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicLabel" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'RESIDENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoadAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wardId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "geometryGeoJson" TEXT NOT NULL,
    "centerLat" REAL NOT NULL,
    "centerLng" REAL NOT NULL,
    "lengthMeters" INTEGER NOT NULL,
    "importanceScore" INTEGER NOT NULL,
    "surfaceLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoadAsset_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Observation" (
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
    "humanCheckStatus" TEXT NOT NULL DEFAULT 'CLEARED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Observation_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepairEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "issueClusterKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "costEstimateInr" INTEGER NOT NULL,
    "recordedById" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairEvent_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepairEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepairVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repairId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairVerification_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepairVerification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "agreementCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityEntry_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issueTypesJson" TEXT NOT NULL,
    "eventTypesJson" TEXT NOT NULL,
    "minSeverity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Ward_slug_key" ON "Ward"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RoadAsset_slug_key" ON "RoadAsset"("slug");

-- CreateIndex
CREATE INDEX "RoadAsset_wardId_assetType_idx" ON "RoadAsset"("wardId", "assetType");

-- CreateIndex
CREATE INDEX "Observation_roadId_issueClusterKey_idx" ON "Observation"("roadId", "issueClusterKey");

-- CreateIndex
CREATE INDEX "RepairEvent_roadId_issueClusterKey_idx" ON "RepairEvent"("roadId", "issueClusterKey");

-- CreateIndex
CREATE INDEX "RepairVerification_repairId_verdict_idx" ON "RepairVerification"("repairId", "verdict");

-- CreateIndex
CREATE INDEX "CommunityEntry_roadId_category_idx" ON "CommunityEntry"("roadId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_token_key" ON "Subscription"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_roadId_userId_key" ON "Subscription"("roadId", "userId");
