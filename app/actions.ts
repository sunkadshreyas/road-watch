'use server';

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { IssueType, IssueVoteKind, RepairStatus, VerificationVerdict } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearSessionUser,
  getSessionUser,
  requireGovUser,
  requireResidentUser,
  requireUser,
  setSessionUser,
} from "@/lib/auth";
import { issueTypeMeta, issueTypeOptions, rssEventTypeOptions } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clamp, slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

function requiredString(
  formData: FormData,
  key: string,
  label: string,
  minimumLength = 1,
) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${label} is required.`);
  }

  if (trimmed.length < minimumLength) {
    throw new Error(`${label} must be at least ${minimumLength} characters.`);
  }

  return trimmed;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function boundedInteger(
  formData: FormData,
  key: string,
  label: string,
  min: number,
  max: number,
) {
  const raw = requiredString(formData, key, label);
  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return value;
}

function optionalFloat(formData: FormData, key: string) {
  const value = optionalString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function parseIssueType(formData: FormData, key = "issueType") {
  const value = requiredString(formData, key, "Issue type");

  if (!issueTypeOptions.includes(value as IssueType)) {
    throw new Error("Choose a valid issue type.");
  }

  return value as IssueType;
}

function parseRepairStatus(formData: FormData) {
  const value = requiredString(formData, "status", "Repair status");

  if (!Object.values(RepairStatus).includes(value as RepairStatus)) {
    throw new Error("Choose a valid repair status.");
  }

  return value as RepairStatus;
}

function parseIssueVoteKind(formData: FormData) {
  const value = requiredString(formData, "voteKind", "Vote");

  if (!Object.values(IssueVoteKind).includes(value as IssueVoteKind)) {
    throw new Error("Choose a valid vote.");
  }

  return value as IssueVoteKind;
}

function parseVerificationVerdict(formData: FormData) {
  const value = requiredString(formData, "verdict", "Verification verdict");

  if (!Object.values(VerificationVerdict).includes(value as VerificationVerdict)) {
    throw new Error("Choose a valid verification verdict.");
  }

  return value as VerificationVerdict;
}

function parseStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function deriveImpactScore(issueType: IssueType, severityScore: number) {
  return clamp(
    Math.round(severityScore * 0.72 + issueTypeMeta[issueType].weight * 26),
    1,
    100,
  );
}

function buildIssueClusterKey(
  roadSlug: string,
  issueType: IssueType,
  gpsLat: number | null,
  gpsLng: number | null,
) {
  if (gpsLat != null && gpsLng != null) {
    const roundedLat = gpsLat.toFixed(4);
    const roundedLng = gpsLng.toFixed(4);
    return slugify(`${roadSlug}-${issueType}-${roundedLat}-${roundedLng}`);
  }

  return slugify(`${roadSlug}-${issueType}-${Date.now()}`);
}

async function writeObservationImage(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);

  if (!match) {
    throw new Error("A live camera image is required.");
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const payload = match[2];
  const uploadDir = join(process.cwd(), "public", "uploads", "observations");
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const targetPath = join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(targetPath, Buffer.from(payload, "base64"));

  return `/uploads/observations/${filename}`;
}

async function writeUploadedImage(file: File, directory: string, label: string) {
  const supportedTypes = new Map<string, string>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  const extension = supportedTypes.get(file.type);

  if (!extension) {
    throw new Error(`${label} must be a JPG, PNG, or WEBP image.`);
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error(`${label} must be 8MB or smaller.`);
  }

  const uploadDir = join(process.cwd(), "public", "uploads", directory);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const targetPath = join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir, { recursive: true });
  await writeFile(targetPath, buffer);

  return `/uploads/${directory}/${filename}`;
}

async function getRoadForMutation(roadId: string) {
  const road = await prisma.roadAsset.findUnique({
    where: {
      id: roadId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!road) {
    throw new Error("Road record not found.");
  }

  return road;
}

function revalidateRoadViews(slug: string) {
  revalidatePath("/");
  revalidatePath("/report");
  revalidatePath("/rankings");
  revalidatePath("/insights");
  revalidatePath(`/roads/${slug}`);
}

export async function loginAsDemoUserAction(formData: FormData) {
  const userId = requiredString(formData, "userId", "User");
  const redirectTo = optionalString(formData, "redirectTo") ?? "/account";
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    redirect("/account?error=missing-user");
  }

  await setSessionUser(user.id);
  redirect(redirectTo);
}

export async function logoutAction(formData: FormData) {
  const redirectTo = optionalString(formData, "redirectTo") ?? "/";
  await clearSessionUser();
  redirect(redirectTo);
}

export async function createObservationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const sessionUser = await getSessionUser();

    if (sessionUser?.role === "GOV") {
      throw new Error("Government-labelled accounts cannot submit public observations.");
    }

    const roadId = requiredString(formData, "roadId", "Road");
    const description = requiredString(formData, "description", "Observation detail");
    const issueType = parseIssueType(formData);
    const severityScore = boundedInteger(formData, "severityScore", "Severity", 1, 100);
    const impactScore = deriveImpactScore(issueType, severityScore);
    const captureMode = requiredString(formData, "captureMode", "Capture mode");
    const imageData = requiredString(formData, "imageData", "Live camera image");
    const peopleDetected = requiredString(formData, "peopleDetected", "Detection status");
    const capturedAt = optionalString(formData, "capturedAt");
    const gpsLat = optionalFloat(formData, "gpsLat");
    const gpsLng = optionalFloat(formData, "gpsLng");

    if (captureMode !== "live-camera") {
      throw new Error("Observations must come from the live camera flow.");
    }

    if (peopleDetected === "true") {
      throw new Error("Image rejected because a person was detected in frame.");
    }

    const road = await getRoadForMutation(roadId);
    const evidencePath = await writeObservationImage(imageData);

    const observation = await prisma.observation.create({
      data: {
        roadId: road.id,
        issueType,
        issueClusterKey: buildIssueClusterKey(road.slug, issueType, gpsLat, gpsLng),
        description,
        severityScore,
        impactScore,
        gpsLat,
        gpsLng,
        evidencePath,
        source: "LIVE_CAMERA",
        humanCheckStatus: "CLEARED",
        evidenceCapturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      },
    });

    if (sessionUser?.role === "RESIDENT") {
      await prisma.observationReceipt.create({
        data: {
          observationId: observation.id,
          userId: sessionUser.id,
        },
      });
    }

    revalidateRoadViews(road.slug);
    revalidatePath("/account");
    revalidatePath("/my-complaints");

    return {
      status: "success",
      message: `Observation added to ${road.name}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unable to save observation.",
    };
  }
}

export async function voteOnIssueClusterAction(formData: FormData) {
  const user = await requireResidentUser();
  const roadId = requiredString(formData, "roadId", "Road");
  const clusterKey = requiredString(formData, "clusterKey", "Issue cluster");
  const voteKind = parseIssueVoteKind(formData);
  const road = await getRoadForMutation(roadId);

  const existingVote = await prisma.issueClusterVote.findUnique({
    where: {
      roadId_issueClusterKey_userId: {
        roadId: road.id,
        issueClusterKey: clusterKey,
        userId: user.id,
      },
    },
  });

  if (existingVote?.kind === voteKind) {
    await prisma.issueClusterVote.delete({
      where: {
        id: existingVote.id,
      },
    });
  } else {
    await prisma.issueClusterVote.upsert({
      where: {
        roadId_issueClusterKey_userId: {
          roadId: road.id,
          issueClusterKey: clusterKey,
          userId: user.id,
        },
      },
      create: {
        roadId: road.id,
        issueClusterKey: clusterKey,
        userId: user.id,
        kind: voteKind,
      },
      update: {
        kind: voteKind,
      },
    });
  }

  revalidateRoadViews(road.slug);
  revalidatePath("/account");
}

export async function createCommunityEntryAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const roadId = requiredString(formData, "roadId", "Road");
    const category = requiredString(formData, "category", "Community category");
    const title = requiredString(formData, "title", "Title", 6);
    const body = requiredString(formData, "body", "Message", 12);

    if (!["DISCUSSION", "APPRECIATION", "SOLUTION"].includes(category)) {
      throw new Error("Choose a valid community category.");
    }

    const road = await getRoadForMutation(roadId);

    await prisma.communityEntry.create({
      data: {
        roadId: road.id,
        authorId: user.id,
        category: category as "DISCUSSION" | "APPRECIATION" | "SOLUTION",
        title,
        body,
        agreementCount: 1,
      },
    });

    revalidateRoadViews(road.slug);
    revalidatePath("/account");

    return {
      status: "success",
      message: "Community note published.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to publish the community note.",
    };
  }
}

export async function createSubscriptionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const roadId = requiredString(formData, "roadId", "Road");
    const minSeverity = boundedInteger(
      formData,
      "minSeverity",
      "Minimum severity",
      1,
      100,
    );
    const issueTypes = parseStringList(formData, "issueTypes").filter((value) =>
      issueTypeOptions.includes(value as IssueType),
    ) as IssueType[];
    const eventTypes = parseStringList(formData, "eventTypes").filter((value) =>
      rssEventTypeOptions.includes(value as (typeof rssEventTypeOptions)[number]),
    ) as Array<(typeof rssEventTypeOptions)[number]>;
    const road = await getRoadForMutation(roadId);

    await prisma.subscription.upsert({
      where: {
        roadId_userId: {
          roadId: road.id,
          userId: user.id,
        },
      },
      create: {
        roadId: road.id,
        userId: user.id,
        token: `sub-${slugify(road.slug)}-${randomUUID().slice(0, 8)}`,
        minSeverity,
        issueTypesJson: JSON.stringify(
          issueTypes.length ? issueTypes : issueTypeOptions,
        ),
        eventTypesJson: JSON.stringify(
          eventTypes.length ? eventTypes : rssEventTypeOptions,
        ),
      },
      update: {
        minSeverity,
        issueTypesJson: JSON.stringify(
          issueTypes.length ? issueTypes : issueTypeOptions,
        ),
        eventTypesJson: JSON.stringify(
          eventTypes.length ? eventTypes : rssEventTypeOptions,
        ),
      },
    });

    revalidatePath("/account");
    revalidatePath(`/roads/${road.slug}`);

    return {
      status: "success",
      message: "RSS subscription saved to your account.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to save the subscription.",
    };
  }
}

export async function recordRepairAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let redirectTo: string | null = null;
  let successState: ActionState | null = null;

  try {
    const user = await requireGovUser();
    const roadId = requiredString(formData, "roadId", "Road");
    const clusterKey = requiredString(formData, "clusterKey", "Issue cluster");
    const note = requiredString(formData, "note", "Repair note");
    const status = parseRepairStatus(formData);
    const costEstimateInr = boundedInteger(
      formData,
      "costEstimateInr",
      "Cost estimate",
      1,
      5000000,
    );
    const proofImage = optionalFile(formData, "proofImage");
    const road = await getRoadForMutation(roadId);
    const now = new Date();

    if (status === "REPAIRED" && !proofImage) {
      throw new Error("A repair photo is required when marking an issue as repaired.");
    }

    const proofImagePath = proofImage
      ? await writeUploadedImage(proofImage, "repairs", "Repair photo")
      : null;

    await prisma.repairEvent.create({
      data: {
        roadId: road.id,
        issueClusterKey: clusterKey,
        status,
        note,
        proofImagePath,
        costEstimateInr,
        recordedById: user.id,
        scheduledAt: now,
        completedAt: status === "REPAIRED" ? now : null,
      },
    });

    revalidateRoadViews(road.slug);
    revalidatePath(`/roads/${road.slug}/repairs/${clusterKey}`);
    revalidatePath("/account");

    successState = {
      status: "success",
      message: `${road.name} updated with a ${status.toLowerCase().replaceAll("_", " ")} event.`,
    };

    if (status === "REPAIRED") {
      redirectTo = `/roads/${road.slug}?section=history`;
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unable to record the repair.",
    };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return successState ?? {
    status: "error",
    message: "Unable to record the repair.",
  };
}

export async function verifyRepairAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const repairId = requiredString(formData, "repairId", "Repair");
    const verdict = parseVerificationVerdict(formData);
    const note = requiredString(formData, "note", "Verification note", 8);
    const repair = await prisma.repairEvent.findUnique({
      where: {
        id: repairId,
      },
      include: {
        road: true,
      },
    });

    if (!repair) {
      throw new Error("Repair record not found.");
    }

    await prisma.repairVerification.create({
      data: {
        repairId: repair.id,
        createdById: user.id,
        verdict,
        note,
      },
    });

    revalidateRoadViews(repair.road.slug);
    revalidatePath("/account");

    return {
      status: "success",
      message: "Repair verification saved.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to save the verification.",
    };
  }
}
