import { z } from "zod";

import {
  calculateCollectorScore,
  getLeaderboardWindowStart,
  rankCollectorScores,
  type LeaderboardWindow,
} from "@/lib/collector-score";
import { issueTypeMeta, roadAssetTypeMeta } from "@/lib/constants";
import { distanceMetersBetweenPoints } from "@/lib/geo";
import { invalidApiQuery, type AuthenticatedApiUser } from "@/lib/api-v1";
import { prisma } from "@/lib/prisma";

export function coarsenPublicPoint(point: { lat: number; lng: number }) {
  return {
    lat: Math.round(point.lat * 1_000) / 1_000,
    lng: Math.round(point.lng * 1_000) / 1_000,
  };
}

type ObservationRepairSnapshot = {
  observationCreatedAt: Date | string;
  latestRepair: {
    status: "SCHEDULED" | "IN_PROGRESS" | "REPAIRED" | "MONITORING";
    completedAt: Date | string | null;
    createdAt: Date | string;
  } | null;
  latestVerification: {
    verdict: "FIX_HELD" | "FAILED" | "STILL_BROKEN";
    createdAt: Date | string;
  } | null;
};

export function isUnresolvedObservation(snapshot: ObservationRepairSnapshot) {
  const repair = snapshot.latestRepair;

  if (!repair || repair.status !== "REPAIRED") {
    return true;
  }

  const repairedAt = new Date(repair.completedAt ?? repair.createdAt).getTime();

  if (new Date(snapshot.observationCreatedAt).getTime() > repairedAt) {
    return true;
  }

  return snapshot.latestVerification?.verdict !== "FIX_HELD";
}

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
  radiusMeters: z.coerce.number().finite().int().min(50).max(5_000).default(1_000),
});

const leaderboardQuerySchema = z.object({
  window: z.enum(["all", "month", "week"]).default("all"),
});

export function parseNearbyQuery(searchParams: URLSearchParams) {
  const result = nearbyQuerySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
    radiusMeters: searchParams.get("radiusMeters") ?? undefined,
  });

  if (!result.success) {
    throw invalidApiQuery();
  }

  return result.data;
}

export function parseApiLeaderboardWindow(searchParams: URLSearchParams) {
  const result = leaderboardQuerySchema.safeParse({
    window: searchParams.get("window") ?? undefined,
  });

  if (!result.success) {
    throw invalidApiQuery();
  }

  return result.data.window;
}

export function getApiCurrentUser(user: AuthenticatedApiUser) {
  return {
    user: {
      id: user.id,
      name: user.name,
      publicLabel: user.publicLabel,
      role: user.role,
      ward: {
        id: user.ward.id,
        slug: user.ward.slug,
        name: user.ward.name,
        city: user.ward.city,
      },
    },
  };
}

type ApiCollectionReceipt = {
  id: string;
  observation: {
    id: string;
    issueType: string;
    humanCheckStatus: "MANUAL_REVIEW" | "CLEARED" | "REJECTED";
    road: { name: string };
  };
};

export function buildApiCollection(receipts: readonly ApiCollectionReceipt[]) {
  const items = receipts.map((receipt) => ({
    id: receipt.observation.id,
    receiptId: receipt.id,
    issueType: receipt.observation.issueType,
    roadName: receipt.observation.road.name,
    reviewStatus: receipt.observation.humanCheckStatus,
    points: receipt.observation.humanCheckStatus === "CLEARED" ? 10 : 0,
  }));

  return {
    approvedPoints: items.reduce((sum, item) => sum + item.points, 0),
    items,
  };
}

export async function getApiCollection(user: AuthenticatedApiUser) {
  const receipts = await prisma.observationReceipt.findMany({
    where: { userId: user.id },
    include: {
      observation: {
        include: {
          road: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return buildApiCollection(receipts);
}

export async function getNearbyApiViolations(
  user: AuthenticatedApiUser,
  query: ReturnType<typeof parseNearbyQuery>,
) {
  const observations = await prisma.observation.findMany({
    where: {
      humanCheckStatus: "CLEARED",
      gpsLat: { not: null },
      gpsLng: { not: null },
      road: {
        wardId: user.wardId,
      },
    },
    include: {
      road: {
        include: {
          repairs: {
            include: {
              verifications: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      votes: {
        select: {
          kind: true,
        },
      },
    },
  });

  const violations = observations
    .flatMap((observation) => {
      if (observation.gpsLat == null || observation.gpsLng == null) {
        return [];
      }

      const clusterRepairs = observation.road.repairs.filter(
        (repair) => repair.issueClusterKey === observation.issueClusterKey,
      );
      const latestRepair = clusterRepairs[0] ?? null;
      const latestVerification = clusterRepairs
        .flatMap((repair) => repair.verifications)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;

      if (
        !isUnresolvedObservation({
          observationCreatedAt: observation.createdAt,
          latestRepair: latestRepair
            ? {
                status: latestRepair.status,
                completedAt: latestRepair.completedAt,
                createdAt: latestRepair.createdAt,
              }
            : null,
          latestVerification: latestVerification
            ? {
                verdict: latestVerification.verdict,
                createdAt: latestVerification.createdAt,
              }
            : null,
        })
      ) {
        return [];
      }

      const distanceMeters = Math.round(
        distanceMetersBetweenPoints(
          { lat: query.lat, lng: query.lng },
          { lat: observation.gpsLat, lng: observation.gpsLng },
        ),
      );

      if (distanceMeters > query.radiusMeters) {
        return [];
      }

      return [
        {
          id: observation.id,
          issueType: observation.issueType,
          issueLabel: issueTypeMeta[observation.issueType].label,
          description: observation.description,
          severityScore: observation.severityScore,
          evidenceUrl: observation.evidencePath.startsWith("/uploads/seed/")
            ? observation.evidencePath
            : null,
          capturedAt: observation.evidenceCapturedAt.toISOString().slice(0, 10),
          submittedAt: observation.createdAt.toISOString(),
          gps: coarsenPublicPoint({ lat: observation.gpsLat, lng: observation.gpsLng }),
          distanceMeters,
          roadName: observation.road.name,
          likeCount: observation.votes.filter((vote) => vote.kind === "LIKE").length,
          dislikeCount: observation.votes.filter((vote) => vote.kind === "DISLIKE")
            .length,
          road: {
            id: observation.road.id,
            slug: observation.road.slug,
            name: observation.road.name,
            assetType: observation.road.assetType,
            assetLabel: roadAssetTypeMeta[observation.road.assetType].label,
          },
        },
      ];
    })
    .sort((left, right) => {
      if (left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters;
      }

      const capturedAtDifference =
        new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime();

      return capturedAtDifference || left.id.localeCompare(right.id);
    })
    .slice(0, 100);

  return {
    query,
    violations,
  };
}

export async function getApiLeaderboard(
  user: AuthenticatedApiUser,
  window: LeaderboardWindow,
) {
  const windowStart = getLeaderboardWindowStart(window);
  const residents = await prisma.user.findMany({
    where: {
      role: "RESIDENT",
      wardId: user.wardId,
    },
    include: {
      observationReceipts: {
        include: {
          observation: {
            include: {
              votes: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const entries = rankCollectorScores(
    residents.map((resident) => {
      const approvedReceipts = resident.observationReceipts.filter(
        (receipt) => receipt.observation.humanCheckStatus === "CLEARED",
      );
      const includedReceipts = approvedReceipts.filter((receipt) =>
        windowStart ? receipt.createdAt >= windowStart : true,
      );
      const receivedLikeCount = approvedReceipts.reduce(
        (sum, receipt) =>
          sum +
          receipt.observation.votes.filter(
            (vote) =>
              vote.kind === "LIKE" &&
              (windowStart ? vote.updatedAt >= windowStart : true),
          ).length,
        0,
      );
      const receivedDislikeCount = approvedReceipts.reduce(
        (sum, receipt) =>
          sum +
          receipt.observation.votes.filter(
            (vote) =>
              vote.kind === "DISLIKE" &&
              (windowStart ? vote.updatedAt >= windowStart : true),
          ).length,
        0,
      );

      return {
        userId: resident.id,
        publicLabel: resident.publicLabel,
        createdAt: resident.createdAt,
        score: calculateCollectorScore({
          submittedViolationCount: includedReceipts.length,
          receivedLikeCount,
          receivedDislikeCount,
        }),
      };
    }),
  ).map((entry) => ({
    rank: entry.rank,
    userId: entry.userId,
    publicLabel: entry.publicLabel,
    isCurrentUser: entry.userId === user.id,
    approvedCaptureCount: entry.score.submittedViolationCount,
    points: entry.score.totalScore,
    score: entry.score,
  }));

  return {
    wardName: user.ward.name,
    window,
    entries,
    totals: {
      residentCount: entries.length,
      collectedViolationCount: entries.reduce(
        (sum, entry) => sum + entry.score.submittedViolationCount,
        0,
      ),
      likeCount: entries.reduce(
        (sum, entry) => sum + entry.score.receivedLikeCount,
        0,
      ),
      dislikeCount: entries.reduce(
        (sum, entry) => sum + entry.score.receivedDislikeCount,
        0,
      ),
    },
  };
}
