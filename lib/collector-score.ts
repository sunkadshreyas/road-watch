export type CollectorScoreInput = {
  submittedViolationCount: number;
  receivedLikeCount?: number;
  receivedDislikeCount?: number;
};

export type CollectorScoreBreakdown = {
  submittedViolationCount: number;
  receivedLikeCount: number;
  receivedDislikeCount: number;
  submissionPoints: number;
  likePoints: number;
  dislikePenalty: number;
  totalScore: number;
};

export type CollectorLevelProgress = {
  level: number;
  title: string;
  currentScore: number;
  currentLevelMinScore: number;
  nextLevelScore: number | null;
  pointsToNextLevel: number;
  progressPercent: number;
};

export type CollectorBadgeInput = {
  submittedViolationCount: number;
  receivedLikeCount?: number;
  receivedDislikeCount?: number;
  resolvedViolationCount?: number;
};

export type CollectorBadge = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
};

export type CollectorLeaderboardInput = {
  userId: string;
  publicLabel: string;
  createdAt: Date | string;
  score: CollectorScoreBreakdown;
};

export type CollectorLeaderboardEntry = CollectorLeaderboardInput & {
  rank: number;
};

export type LeaderboardWindow = "all" | "month" | "week";

const SUBMISSION_POINTS = 10;
const LIKE_POINTS = 1;
const DISLIKE_PENALTY = 2;

const collectorLevels = [
  { level: 1, title: "Street Scout", minScore: 0 },
  { level: 2, title: "Block Ranger", minScore: 50 },
  { level: 3, title: "Ward Hunter", minScore: 120 },
  { level: 4, title: "Fix Champion", minScore: 250 },
  { level: 5, title: "Civic Legend", minScore: 350 },
] as const;

function normalizeCount(value: number | undefined) {
  if (!Number.isFinite(value) || value == null) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function calculateCollectorScore(
  input: CollectorScoreInput,
): CollectorScoreBreakdown {
  const submittedViolationCount = normalizeCount(input.submittedViolationCount);
  const receivedLikeCount = normalizeCount(input.receivedLikeCount);
  const receivedDislikeCount = normalizeCount(input.receivedDislikeCount);
  const submissionPoints = submittedViolationCount * SUBMISSION_POINTS;
  const likePoints = receivedLikeCount * LIKE_POINTS;
  const dislikePenalty = receivedDislikeCount * DISLIKE_PENALTY;

  return {
    submittedViolationCount,
    receivedLikeCount,
    receivedDislikeCount,
    submissionPoints,
    likePoints,
    dislikePenalty,
    totalScore: submissionPoints + likePoints - dislikePenalty,
  };
}

export function getCollectorLevelProgress(score: number): CollectorLevelProgress {
  const currentScore = normalizeCount(score);
  const currentLevelIndex = collectorLevels.findLastIndex(
    (level) => currentScore >= level.minScore,
  );
  const currentLevel = collectorLevels[Math.max(0, currentLevelIndex)];
  const nextLevel = collectorLevels[currentLevelIndex + 1] ?? null;
  const nextLevelScore = nextLevel?.minScore ?? null;
  const pointsToNextLevel =
    nextLevelScore == null ? 0 : Math.max(0, nextLevelScore - currentScore);
  const levelSpan =
    nextLevelScore == null ? null : nextLevelScore - currentLevel.minScore;
  const progressPercent =
    levelSpan == null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            Math.round(((currentScore - currentLevel.minScore) / levelSpan) * 100),
          ),
        );

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    currentScore,
    currentLevelMinScore: currentLevel.minScore,
    nextLevelScore,
    pointsToNextLevel,
    progressPercent,
  };
}

export function getCollectorBadges(input: CollectorBadgeInput): CollectorBadge[] {
  const submittedViolationCount = normalizeCount(input.submittedViolationCount);
  const receivedLikeCount = normalizeCount(input.receivedLikeCount);
  const resolvedViolationCount = normalizeCount(input.resolvedViolationCount);

  return [
    {
      id: "first-catch",
      title: "First Catch",
      description: "Collect your first live GPS-backed violation.",
      earned: submittedViolationCount >= 1,
    },
    {
      id: "block-sweep",
      title: "Block Sweep",
      description: "Collect five violations across road records.",
      earned: submittedViolationCount >= 5,
    },
    {
      id: "trusted-spotter",
      title: "Trusted Spotter",
      description: "Receive three resident confirmations on your sightings.",
      earned: receivedLikeCount >= 3,
    },
    {
      id: "repair-catalyst",
      title: "Repair Catalyst",
      description: "Have two collected violations move to repaired status.",
      earned: resolvedViolationCount >= 2,
    },
  ];
}

export function rankCollectorScores(
  entries: CollectorLeaderboardInput[],
): CollectorLeaderboardEntry[] {
  return [...entries]
    .sort((left, right) => {
      if (right.score.totalScore !== left.score.totalScore) {
        return right.score.totalScore - left.score.totalScore;
      }

      if (
        right.score.submittedViolationCount !==
        left.score.submittedViolationCount
      ) {
        return (
          right.score.submittedViolationCount -
          left.score.submittedViolationCount
        );
      }

      const createdAtDifference =
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime();

      if (createdAtDifference !== 0) {
        return createdAtDifference;
      }

      return left.userId.localeCompare(right.userId);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function parseLeaderboardWindow(value: string | undefined): LeaderboardWindow {
  if (value === "week" || value === "month") {
    return value;
  }

  return "all";
}

export function getLeaderboardWindowStart(
  window: LeaderboardWindow,
  now = new Date(),
) {
  if (window === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (window === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return start;
  }

  return null;
}
