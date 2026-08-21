CREATE TABLE "RoadSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "geometryGeoJson" TEXT NOT NULL,
    "centerLat" REAL NOT NULL,
    "centerLng" REAL NOT NULL,
    "lengthMeters" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoadSegment_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SourceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "segmentId" TEXT,
    "source" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceReference" TEXT,
    "sourceNote" TEXT,
    "issueType" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SourceEvent_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SourceEvent_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "RoadSegment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Observation" ADD COLUMN "segmentId" TEXT REFERENCES "RoadSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "RoadSegment_roadId_sequence_key" ON "RoadSegment"("roadId", "sequence");
CREATE INDEX "RoadSegment_roadId_centerLat_centerLng_idx" ON "RoadSegment"("roadId", "centerLat", "centerLng");
CREATE UNIQUE INDEX "SourceEvent_source_sourceKey_key" ON "SourceEvent"("source", "sourceKey");
CREATE INDEX "SourceEvent_roadId_observedAt_idx" ON "SourceEvent"("roadId", "observedAt");
CREATE INDEX "SourceEvent_segmentId_observedAt_idx" ON "SourceEvent"("segmentId", "observedAt");
CREATE INDEX "Observation_segmentId_createdAt_idx" ON "Observation"("segmentId", "createdAt");
