-- CreateTable
CREATE TABLE "ObservationVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ObservationVote_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservationVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ObservationVote_observationId_kind_idx" ON "ObservationVote"("observationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationVote_observationId_userId_key" ON "ObservationVote"("observationId", "userId");
