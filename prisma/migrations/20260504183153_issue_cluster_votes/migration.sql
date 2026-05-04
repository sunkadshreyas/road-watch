-- CreateTable
CREATE TABLE "IssueClusterVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadId" TEXT NOT NULL,
    "issueClusterKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IssueClusterVote_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "RoadAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueClusterVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IssueClusterVote_roadId_issueClusterKey_kind_idx" ON "IssueClusterVote"("roadId", "issueClusterKey", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "IssueClusterVote_roadId_issueClusterKey_userId_key" ON "IssueClusterVote"("roadId", "issueClusterKey", "userId");
