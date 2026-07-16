import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCollectorScore,
  getCollectorBadges,
  getCollectorLevelProgress,
  getLeaderboardWindowStart,
  parseLeaderboardWindow,
  rankCollectorScores,
} from "@/lib/collector-score";

test("collector score awards ten points per submitted violation", () => {
  assert.deepEqual(calculateCollectorScore({ submittedViolationCount: 3 }), {
    submittedViolationCount: 3,
    receivedLikeCount: 0,
    receivedDislikeCount: 0,
    submissionPoints: 30,
    likePoints: 0,
    dislikePenalty: 0,
    totalScore: 30,
  });
});

test("collector score shape already supports future likes and dislikes", () => {
  assert.deepEqual(
    calculateCollectorScore({
      submittedViolationCount: 4,
      receivedLikeCount: 7,
      receivedDislikeCount: 2,
    }),
    {
      submittedViolationCount: 4,
      receivedLikeCount: 7,
      receivedDislikeCount: 2,
      submissionPoints: 40,
      likePoints: 7,
      dislikePenalty: 4,
      totalScore: 43,
    },
  );
});

test("collector score treats invalid or negative counts as zero", () => {
  assert.deepEqual(
    calculateCollectorScore({
      submittedViolationCount: -2,
      receivedLikeCount: Number.NaN,
      receivedDislikeCount: -1,
    }),
    {
      submittedViolationCount: 0,
      receivedLikeCount: 0,
      receivedDislikeCount: 0,
      submissionPoints: 0,
      likePoints: 0,
      dislikePenalty: 0,
      totalScore: 0,
    },
  );
});

test("collector level progress advances through named field ranks", () => {
  assert.deepEqual(getCollectorLevelProgress(0), {
    level: 1,
    title: "Street Scout",
    currentScore: 0,
    currentLevelMinScore: 0,
    nextLevelScore: 50,
    pointsToNextLevel: 50,
    progressPercent: 0,
  });

  assert.deepEqual(getCollectorLevelProgress(74), {
    level: 2,
    title: "Block Ranger",
    currentScore: 74,
    currentLevelMinScore: 50,
    nextLevelScore: 120,
    pointsToNextLevel: 46,
    progressPercent: 34,
  });

  assert.deepEqual(getCollectorLevelProgress(360), {
    level: 5,
    title: "Civic Legend",
    currentScore: 360,
    currentLevelMinScore: 350,
    nextLevelScore: null,
    pointsToNextLevel: 0,
    progressPercent: 100,
  });
});

test("collector badges unlock from collection and voting signals", () => {
  assert.deepEqual(
    getCollectorBadges({
      submittedViolationCount: 0,
      receivedLikeCount: 0,
      receivedDislikeCount: 0,
      resolvedViolationCount: 0,
    }).map((badge) => ({ id: badge.id, earned: badge.earned })),
    [
      { id: "first-catch", earned: false },
      { id: "block-sweep", earned: false },
      { id: "trusted-spotter", earned: false },
      { id: "repair-catalyst", earned: false },
    ],
  );

  assert.deepEqual(
    getCollectorBadges({
      submittedViolationCount: 5,
      receivedLikeCount: 3,
      receivedDislikeCount: 1,
      resolvedViolationCount: 2,
    }).map((badge) => ({ id: badge.id, earned: badge.earned })),
    [
      { id: "first-catch", earned: true },
      { id: "block-sweep", earned: true },
      { id: "trusted-spotter", earned: true },
      { id: "repair-catalyst", earned: true },
    ],
  );
});

test("collector leaderboard sorts by score, collected count, then earliest signup", () => {
  const ranked = rankCollectorScores([
    {
      userId: "late-high",
      publicLabel: "Late high",
      createdAt: "2026-01-03T00:00:00.000Z",
      score: calculateCollectorScore({
        submittedViolationCount: 2,
        receivedLikeCount: 10,
      }),
    },
    {
      userId: "early-tie",
      publicLabel: "Early tie",
      createdAt: "2026-01-01T00:00:00.000Z",
      score: calculateCollectorScore({
        submittedViolationCount: 3,
      }),
    },
    {
      userId: "later-tie",
      publicLabel: "Later tie",
      createdAt: "2026-01-02T00:00:00.000Z",
      score: calculateCollectorScore({
        submittedViolationCount: 3,
      }),
    },
  ]);

  assert.deepEqual(
    ranked.map((entry) => ({
      rank: entry.rank,
      userId: entry.userId,
      totalScore: entry.score.totalScore,
      collected: entry.score.submittedViolationCount,
    })),
    [
      {
        rank: 1,
        userId: "early-tie",
        totalScore: 30,
        collected: 3,
      },
      {
        rank: 2,
        userId: "later-tie",
        totalScore: 30,
        collected: 3,
      },
      {
        rank: 3,
        userId: "late-high",
        totalScore: 30,
        collected: 2,
      },
    ],
  );
});

test("collector leaderboard uses user id as the final deterministic tie key", () => {
  const tiedScore = calculateCollectorScore({ submittedViolationCount: 1 });
  const ranked = rankCollectorScores([
    {
      userId: "z-user",
      publicLabel: "Zed",
      createdAt: "2026-01-01T00:00:00.000Z",
      score: tiedScore,
    },
    {
      userId: "a-user",
      publicLabel: "Alpha",
      createdAt: "2026-01-01T00:00:00.000Z",
      score: tiedScore,
    },
  ]);

  assert.deepEqual(
    ranked.map((entry) => entry.userId),
    ["a-user", "z-user"],
  );
});

test("parseLeaderboardWindow defaults unknown values to all", () => {
  assert.equal(parseLeaderboardWindow(undefined), "all");
  assert.equal(parseLeaderboardWindow("unknown"), "all");
  assert.equal(parseLeaderboardWindow("week"), "week");
  assert.equal(parseLeaderboardWindow("month"), "month");
});

test("getLeaderboardWindowStart returns relative date starts", () => {
  const now = new Date("2026-05-15T12:00:00.000Z");

  assert.equal(getLeaderboardWindowStart("all", now), null);
  assert.equal(
    getLeaderboardWindowStart("week", now)?.toISOString(),
    "2026-05-08T12:00:00.000Z",
  );
  assert.equal(
    getLeaderboardWindowStart("month", now)?.toISOString(),
    "2026-04-15T12:00:00.000Z",
  );
});
