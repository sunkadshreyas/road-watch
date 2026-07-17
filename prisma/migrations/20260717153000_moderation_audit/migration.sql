-- CreateTable
CREATE TABLE "ModerationAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "newState" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationAudit_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ModerationAudit_observationId_createdAt_idx" ON "ModerationAudit"("observationId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAudit_actorUserId_createdAt_idx" ON "ModerationAudit"("actorUserId", "createdAt");
