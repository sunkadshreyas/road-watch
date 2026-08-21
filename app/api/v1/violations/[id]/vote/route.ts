import { IssueVoteKind } from "@prisma/client";

import { forbiddenApiRequest, handleApiV1Request, invalidApiQuery } from "@/lib/api-v1";
import { prisma } from "@/lib/prisma";

function parseVoteKind(value: unknown) {
  if (value !== IssueVoteKind.LIKE && value !== IssueVoteKind.DISLIKE) {
    throw invalidApiQuery();
  }

  return value;
}

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleApiV1Request(request, async (user) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { kind?: unknown } | null;
    const voteKind = parseVoteKind(body?.kind);
    const observation = await prisma.observation.findUnique({
      where: { id },
      include: {
        road: true,
        receipts: true,
      },
    });

    if (!observation || observation.road.wardId !== user.wardId) {
      throw invalidApiQuery();
    }

    if (observation.humanCheckStatus !== "CLEARED") {
      throw forbiddenApiRequest("Only approved violations can receive votes.");
    }

    if (observation.receipts.some((receipt) => receipt.userId === user.id)) {
      throw forbiddenApiRequest("You cannot vote on a violation you collected.");
    }

    const existingVote = await prisma.observationVote.findUnique({
      where: {
        observationId_userId: {
          observationId: observation.id,
          userId: user.id,
        },
      },
    });

    if (existingVote?.kind === voteKind) {
      await prisma.observationVote.delete({ where: { id: existingVote.id } });
    } else {
      await prisma.observationVote.upsert({
        where: {
          observationId_userId: {
            observationId: observation.id,
            userId: user.id,
          },
        },
        create: {
          observationId: observation.id,
          userId: user.id,
          kind: voteKind,
        },
        update: { kind: voteKind },
      });
    }

    const votes = await prisma.observationVote.findMany({
      where: { observationId: observation.id },
      select: { kind: true, userId: true },
    });

    return {
      observationId: observation.id,
      likeCount: votes.filter((vote) => vote.kind === "LIKE").length,
      dislikeCount: votes.filter((vote) => vote.kind === "DISLIKE").length,
      viewerVote: votes.find((vote) => vote.userId === user.id)?.kind ?? null,
    };
  });
}
