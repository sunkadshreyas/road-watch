import {
  type CommunityCategory,
  type IssueType,
  type IssueVoteKind,
  Prisma,
  type RepairStatus,
  type VerificationVerdict,
} from "@prisma/client";

import {
  defaultBaseUrl,
  getSeverityBand,
  issueTypeMeta,
  repairStatusMeta,
  roadAssetTypeMeta,
  severityBandMeta,
  type RssEventType,
  type SeverityBand,
  verificationVerdictMeta,
} from "@/lib/constants";
import {
  calculateCollectorScore,
  getCollectorBadges,
  type CollectorBadge,
  getCollectorLevelProgress,
  type CollectorLevelProgress,
  type CollectorScoreBreakdown,
  getLeaderboardWindowStart,
  type LeaderboardWindow,
  rankCollectorScores,
} from "@/lib/collector-score";
import { prisma } from "@/lib/prisma";
import {
  clamp,
  formatCurrencyInr,
  percentage,
  safeJsonParse,
} from "@/lib/utils";

const roadAssetInclude = Prisma.validator<Prisma.RoadAssetInclude>()({
  ward: true,
  observations: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      receipts: true,
      votes: true,
    },
  },
  repairs: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      recordedBy: true,
      verifications: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          createdBy: true,
        },
      },
    },
  },
  communityEntries: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      author: true,
    },
  },
  issueClusterVotes: {
    orderBy: {
      createdAt: "asc",
    },
  },
  subscriptions: true,
});

type RoadAssetRecord = Prisma.RoadAssetGetPayload<{
  include: typeof roadAssetInclude;
}>;

const observationReceiptInclude = Prisma.validator<Prisma.ObservationReceiptInclude>()({
  observation: {
    include: {
      votes: true,
      road: {
        include: roadAssetInclude,
      },
    },
  },
});

type CommunityBuckets = Record<
  CommunityCategory,
  Array<{
    id: string;
    title: string;
    body: string;
    agreementCount: number;
    createdAt: string;
    authorLabel: string;
    role: "RESIDENT" | "GOV";
  }>
>;

export type IssueClusterSummary = {
  clusterKey: string;
  issueType: IssueType;
  issueLabel: string;
  severityBand: SeverityBand;
  severityLabel: string;
  state: "open" | "monitoring" | "resolved";
  stateLabel: string;
  severityScore: number;
  latestEvidencePath: string;
  impactScore: number;
  priorityScore: number;
  recurrenceCount: number;
  repairCount: number;
  estimatedCostInr: number;
  wastedSpendInr: number;
  lastUpdatedAt: string;
  latestDescription: string;
  latestRepairId: string | null;
  latestRepairStatusCode: RepairStatus | null;
  latestRepairStatus: string | null;
  latestRepairNote: string | null;
  latestRepairProofPath: string | null;
  latestRepairRecordedAt: string | null;
  latestRepairCompletedAt: string | null;
  latestRepairActorLabel: string | null;
  latestVerificationLabel: string | null;
  likeCount: number;
  dislikeCount: number;
  viewerVote: IssueVoteKind | null;
};

export type RoadTimelineItem = {
  id: string;
  kind: "observation" | "repair" | "verification";
  at: string;
  title: string;
  detail: string;
  tone: "neutral" | "good" | "warning" | "danger";
  clusterKey: string;
  issueType: IssueType | null;
};

export type ConditionPoint = {
  at: string;
  label: string;
  score: number;
};

export type RoadDetail = {
  id: string;
  slug: string;
  name: string;
  assetType: "ROAD" | "FOOTPATH";
  assetLabel: string;
  osmId: string;
  summary: string;
  wardName: string;
  city: string;
  importanceScore: number;
  surfaceLabel: string;
  lengthMeters: number;
  centerLat: number;
  centerLng: number;
  geometry: {
    type: "LineString";
    coordinates: Array<[number, number]>;
  };
  conditionScore: number;
  budgetNeedInr: number;
  priorityScore: number;
  verifiedFixRate: number;
  activeSubscriptionCount: number;
  publicObservationCount: number;
  openIssueCount: number;
  monitoringIssueCount: number;
  repeatIssueCount: number;
  repeatWasteInr: number;
  issueClusters: IssueClusterSummary[];
  collectedViolations: Array<{
    id: string;
    roadId: string;
    roadSlug: string;
    roadName: string;
    issueType: IssueType;
    issueLabel: string;
    severityScore: number;
    severityBand: SeverityBand;
    severityLabel: string;
    state: "open" | "monitoring" | "resolved";
    stateLabel: string;
    description: string;
    evidencePath: string;
    humanCheckStatus: "CLEARED" | "REJECTED" | "MANUAL_REVIEW";
    gpsLat: number;
    gpsLng: number;
    submittedAt: string;
    likeCount: number;
    dislikeCount: number;
    viewerVote: IssueVoteKind | null;
    isOwnCollection: boolean;
  }>;
  conditionHistory: ConditionPoint[];
  timeline: RoadTimelineItem[];
  repairs: Array<{
    id: string;
    clusterKey: string;
    issueLabel: string;
    status: "SCHEDULED" | "IN_PROGRESS" | "REPAIRED" | "MONITORING";
    statusLabel: string;
    note: string;
    proofImagePath: string | null;
    costEstimateInr: number;
    recordedByLabel: string;
    recordedAt: string;
    completedAt: string | null;
    verifications: Array<{
      id: string;
      verdict: "FIX_HELD" | "FAILED" | "STILL_BROKEN";
      verdictLabel: string;
      note: string;
      createdAt: string;
      actorLabel: string;
    }>;
  }>;
  community: CommunityBuckets;
};

export type RoadSummary = Pick<
  RoadDetail,
  | "id"
  | "slug"
  | "name"
  | "assetType"
  | "assetLabel"
  | "summary"
  | "importanceScore"
  | "conditionScore"
  | "budgetNeedInr"
  | "priorityScore"
  | "verifiedFixRate"
  | "openIssueCount"
  | "monitoringIssueCount"
  | "repeatIssueCount"
  | "repeatWasteInr"
  | "centerLat"
  | "centerLng"
  | "geometry"
> & {
  latestUpdateAt: string;
};

export type WardDashboard = {
  ward: {
    name: string;
    city: string;
    slug: string;
    summary: string;
    osmReference: string | null;
    centerLat: number;
    centerLng: number;
    boundary: {
      type: "Polygon";
      coordinates: Array<Array<[number, number]>>;
    };
  };
  overview: {
    averageConditionScore: number;
    openIssueCount: number;
    monitoringIssueCount: number;
    totalBudgetNeedInr: number;
    verifiedFixRate: number;
    repeatWasteInr: number;
  };
  roads: RoadSummary[];
  rankings: RoadSummary[];
  repeatOffenders: Array<{
    slug: string;
    name: string;
    repeatIssueCount: number;
    repeatWasteInr: number;
    worstCluster: IssueClusterSummary | null;
  }>;
  issueBudgetBreakdown: Array<{
    issueType: IssueType;
    label: string;
    totalBudgetNeedInr: number;
    openIssueCount: number;
  }>;
  latestCommunity: Array<{
    roadSlug: string;
    roadName: string;
    category: CommunityCategory;
    title: string;
    agreementCount: number;
    createdAt: string;
  }>;
};

export type AccountDashboard = {
  user: {
    id: string;
    name: string;
    email: string;
    publicLabel: string;
    role: "RESIDENT" | "GOV";
  };
  complaintsCount: number;
  subscriptions: Array<{
    id: string;
    token: string;
    roadSlug: string;
    roadName: string;
    minSeverity: number;
    issueTypes: IssueType[];
    eventTypes: RssEventType[];
    feedUrl: string;
  }>;
  discussions: Array<{
    id: string;
    category: CommunityCategory;
    roadSlug: string;
    roadName: string;
    title: string;
    body: string;
    agreementCount: number;
    createdAt: string;
  }>;
};

export type MyComplaintDashboard = {
  totalCount: number;
  score: CollectorScoreBreakdown;
  levelProgress: CollectorLevelProgress;
  badges: CollectorBadge[];
  openCount: number;
  monitoringCount: number;
  resolvedCount: number;
  complaints: Array<{
    id: string;
    observationId: string;
    roadSlug: string;
    roadName: string;
    assetLabel: string;
    clusterKey: string;
    issueLabel: string;
    severityScore: number;
    severityBand: SeverityBand;
    severityLabel: string;
    state: "open" | "monitoring" | "resolved";
    stateLabel: string;
    description: string;
    evidencePath: string;
    humanCheckStatus: "CLEARED" | "REJECTED" | "MANUAL_REVIEW";
    gpsLat: number;
    gpsLng: number;
    submittedAt: string;
    latestRepairStatus: string | null;
    latestRepairNote: string | null;
    latestRepairProofPath: string | null;
    latestRepairRecordedAt: string | null;
    latestVerificationLabel: string | null;
    likeCount: number;
    dislikeCount: number;
  }>;
};

export type CollectorLeaderboard = {
  window: LeaderboardWindow;
  entries: Array<{
    rank: number;
    userId: string;
    publicLabel: string;
    score: CollectorScoreBreakdown;
  }>;
  totals: {
    residentCount: number;
    collectedViolationCount: number;
    likeCount: number;
    dislikeCount: number;
  };
};

export type ExportRow = {
  recordedAt: string;
  eventType: "observation" | "vote" | "repair" | "verification";
  roadName: string;
  roadSlug: string;
  clusterKey: string;
  issueType: string;
  severityScore: number | null;
  impactScore: number | null;
  status: string | null;
  verdict: string | null;
  costEstimateInr: number | null;
  actorLabel: string;
  description: string;
  gpsLat: number | null;
  gpsLng: number | null;
  evidencePath: string | null;
};

export type SubscriptionFeed = {
  title: string;
  description: string;
  feedUrl: string;
  siteUrl: string;
  items: Array<{
    guid: string;
    title: string;
    description: string;
    publishedAt: string;
    link: string;
  }>;
};

function parseGeometry(json: string) {
  return safeJsonParse<{
    type: "LineString";
    coordinates: Array<[number, number]>;
  }>(json);
}

function parseBoundary(json: string) {
  return safeJsonParse<{
    type: "Polygon";
    coordinates: Array<Array<[number, number]>>;
  }>(json);
}

function issueCostEstimate(
  issueType: IssueType,
  severityScore: number,
  importanceScore: number,
  recurrenceCount: number,
) {
  const base = issueTypeMeta[issueType].baseCostInr;
  const severityMultiplier = 0.8 + severityScore / 100;
  const importanceMultiplier = 0.9 + importanceScore * 0.12;
  const recurrenceMultiplier = 1 + Math.max(0, recurrenceCount - 1) * 0.25;

  return Math.round(base * severityMultiplier * importanceMultiplier * recurrenceMultiplier);
}

function issuePriorityScore(
  issueType: IssueType,
  severityScore: number,
  impactScore: number,
  importanceScore: number,
  recurrenceCount: number,
  latestVerdict?: VerificationVerdict,
) {
  const recurrencePressure = Math.min(24, Math.max(0, recurrenceCount - 1) * 8);
  const repairFailurePressure =
    latestVerdict && latestVerdict !== "FIX_HELD" ? 10 : 0;

  return clamp(
    Math.round(
      severityScore * 0.45 +
        impactScore * 0.25 +
        importanceScore * 5 +
        issueTypeMeta[issueType].weight * 12 +
        recurrencePressure +
        repairFailurePressure,
    ),
    0,
    100,
  );
}

function getLatestDate(dates: Array<Date | null | undefined>) {
  return dates
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0];
}

function conditionDeltaFromObservation(
  severityScore: number,
  impactScore: number,
  issueType: IssueType,
) {
  return -Math.round(
    6 +
      severityScore / 18 +
      impactScore / 28 +
      issueTypeMeta[issueType].weight * 3,
  );
}

function conditionDeltaFromRepair(status: RoadAssetRecord["repairs"][number]["status"], importanceScore: number) {
  if (status === "REPAIRED") {
    return 8 + importanceScore;
  }

  if (status === "IN_PROGRESS") {
    return 3;
  }

  if (status === "SCHEDULED") {
    return 1;
  }

  return 2;
}

function conditionDeltaFromVerification(
  verdict: VerificationVerdict,
) {
  if (verdict === "FIX_HELD") {
    return 4;
  }

  return -7;
}

function buildConditionHistory(road: RoadAssetRecord) {
  const events: Array<{
    id: string;
    at: Date;
    label: string;
    delta: number;
  }> = [];

  for (const observation of road.observations) {
    events.push({
      id: `obs-${observation.id}`,
      at: observation.createdAt,
      label: `${issueTypeMeta[observation.issueType].label} observed`,
      delta: conditionDeltaFromObservation(
        observation.severityScore,
        observation.impactScore,
        observation.issueType,
      ),
    });
  }

  for (const repair of road.repairs) {
    events.push({
      id: `repair-${repair.id}`,
      at: repair.completedAt ?? repair.createdAt,
      label: repairStatusMeta[repair.status].label,
      delta: conditionDeltaFromRepair(repair.status, road.importanceScore),
    });

    for (const verification of repair.verifications) {
      events.push({
        id: `verify-${verification.id}`,
        at: verification.createdAt,
        label: verificationVerdictMeta[verification.verdict].label,
        delta: conditionDeltaFromVerification(verification.verdict),
      });
    }
  }

  events.sort((left, right) => left.at.getTime() - right.at.getTime());

  let score = clamp(92 - (road.importanceScore - 1) * 2, 40, 96);

  return events.map((event) => {
    score = clamp(score + event.delta, 0, 100);

    return {
      at: event.at.toISOString(),
      label: event.label,
      score,
    };
  });
}

function buildCommunityBuckets(road: RoadAssetRecord): CommunityBuckets {
  const buckets: CommunityBuckets = {
    DISCUSSION: [],
    APPRECIATION: [],
    SOLUTION: [],
  };

  for (const entry of road.communityEntries) {
    buckets[entry.category].push({
      id: entry.id,
      title: entry.title,
      body: entry.body,
      agreementCount: entry.agreementCount,
      createdAt: entry.createdAt.toISOString(),
      authorLabel: entry.author.publicLabel,
      role: entry.author.role,
    });
  }

  buckets.SOLUTION.sort((left, right) => right.agreementCount - left.agreementCount);

  return buckets;
}

function buildIssueClusters(road: RoadAssetRecord, viewerUserId?: string | null) {
  const clusterKeys = new Set<string>();

  for (const observation of road.observations) {
    clusterKeys.add(observation.issueClusterKey);
  }

  for (const repair of road.repairs) {
    clusterKeys.add(repair.issueClusterKey);
  }

  const clusters: IssueClusterSummary[] = [];

  for (const clusterKey of clusterKeys) {
    const observations = road.observations.filter(
      (observation) => observation.issueClusterKey === clusterKey,
    );
    const repairs = road.repairs.filter(
      (repair) => repair.issueClusterKey === clusterKey,
    );
    const latestObservation = observations.at(-1);

    if (!latestObservation) {
      continue;
    }

    const latestRepair = repairs.at(-1);
    const latestVerification = repairs
      .flatMap((repair) => repair.verifications)
      .at(-1);
    const votes = road.issueClusterVotes.filter((vote) => vote.issueClusterKey === clusterKey);

    let state: IssueClusterSummary["state"] = "open";
    let stateLabel = "Open observation";

    if (latestRepair) {
      if (latestRepair.status === "SCHEDULED") {
        stateLabel = "Repair scheduled";
      } else if (latestRepair.status === "IN_PROGRESS") {
        stateLabel = "Repair in progress";
      } else if (latestRepair.status === "REPAIRED") {
        const repairedAt = latestRepair.completedAt ?? latestRepair.createdAt;

        if (latestObservation.createdAt > repairedAt) {
          state = "open";
          stateLabel = "Issue reopened after repair";
        } else if (!latestVerification) {
          state = "monitoring";
          stateLabel = "Repair awaiting public verification";
        } else if (latestVerification.verdict === "FIX_HELD") {
          state = "resolved";
          stateLabel = "Repair verified by community";
        } else {
          state = "open";
          stateLabel = "Repair did not hold";
        }
      }
    }

    const recurrenceCount = observations.length;
    const repairCount = repairs.length;
    const estimatedCostInr = issueCostEstimate(
      latestObservation.issueType,
      latestObservation.severityScore,
      road.importanceScore,
      recurrenceCount,
    );
    const severityBand = getSeverityBand(latestObservation.severityScore);
    const wastedSpendInr =
      recurrenceCount > 1 ||
      (latestVerification ? latestVerification.verdict !== "FIX_HELD" : false)
        ? repairs
            .filter((repair) => repair.status === "REPAIRED")
            .reduce((sum, repair) => sum + repair.costEstimateInr, 0)
        : 0;

    clusters.push({
      clusterKey,
      issueType: latestObservation.issueType,
      issueLabel: issueTypeMeta[latestObservation.issueType].label,
      severityBand,
      severityLabel: severityBandMeta[severityBand].label,
      state,
      stateLabel,
      severityScore: latestObservation.severityScore,
      latestEvidencePath: latestObservation.evidencePath,
      impactScore: latestObservation.impactScore,
      priorityScore: issuePriorityScore(
        latestObservation.issueType,
        latestObservation.severityScore,
        latestObservation.impactScore,
        road.importanceScore,
        recurrenceCount,
        latestVerification?.verdict,
      ),
      recurrenceCount,
      repairCount,
      estimatedCostInr,
      wastedSpendInr,
      lastUpdatedAt:
        getLatestDate([
          latestObservation.createdAt,
          latestRepair?.completedAt ?? latestRepair?.createdAt,
          latestVerification?.createdAt,
        ])?.toISOString() ?? latestObservation.createdAt.toISOString(),
      latestDescription: latestObservation.description,
      latestRepairId: latestRepair?.id ?? null,
      latestRepairStatusCode: latestRepair?.status ?? null,
      latestRepairStatus: latestRepair ? repairStatusMeta[latestRepair.status].label : null,
      latestRepairNote: latestRepair?.note ?? null,
      latestRepairProofPath: latestRepair?.proofImagePath ?? null,
      latestRepairRecordedAt: latestRepair?.createdAt.toISOString() ?? null,
      latestRepairCompletedAt: latestRepair?.completedAt?.toISOString() ?? null,
      latestRepairActorLabel: latestRepair?.recordedBy.publicLabel ?? null,
      latestVerificationLabel: latestVerification
        ? verificationVerdictMeta[latestVerification.verdict].label
        : null,
      likeCount: votes.filter((vote) => vote.kind === "LIKE").length,
      dislikeCount: votes.filter((vote) => vote.kind === "DISLIKE").length,
      viewerVote: votes.find((vote) => vote.userId === viewerUserId)?.kind ?? null,
    });
  }

  return clusters.sort((left, right) => right.priorityScore - left.priorityScore);
}

function buildTimeline(road: RoadAssetRecord): RoadTimelineItem[] {
  const items: RoadTimelineItem[] = [];

  for (const observation of road.observations) {
    items.push({
      id: observation.id,
      kind: "observation",
      at: observation.createdAt.toISOString(),
      title: `${issueTypeMeta[observation.issueType].label} observed`,
      detail: observation.description,
      tone: "danger",
      clusterKey: observation.issueClusterKey,
      issueType: observation.issueType,
    });
  }

  for (const repair of road.repairs) {
    items.push({
      id: repair.id,
      kind: "repair",
      at: (repair.completedAt ?? repair.createdAt).toISOString(),
      title: repairStatusMeta[repair.status].label,
      detail: `${repair.note} Recorded by ${repair.recordedBy.publicLabel}.`,
      tone: repairStatusMeta[repair.status].tone,
      clusterKey: repair.issueClusterKey,
      issueType:
        road.observations.find(
          (observation) => observation.issueClusterKey === repair.issueClusterKey,
        )?.issueType ?? null,
    });

    for (const verification of repair.verifications) {
      items.push({
        id: verification.id,
        kind: "verification",
        at: verification.createdAt.toISOString(),
        title: verificationVerdictMeta[verification.verdict].label,
        detail: `${verification.note} Confirmed as a ${verification.createdBy.publicLabel.toLowerCase()}.`,
        tone: verificationVerdictMeta[verification.verdict].tone,
        clusterKey: repair.issueClusterKey,
        issueType:
          road.observations.find(
            (observation) => observation.issueClusterKey === repair.issueClusterKey,
          )?.issueType ?? null,
      });
    }
  }

  return items.sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
  );
}

function canViewObservation(
  observation: RoadAssetRecord["observations"][number],
  viewerUserId?: string | null,
  canModerate = false,
) {
  return (
    observation.humanCheckStatus === "CLEARED" ||
    canModerate ||
    observation.receipts.some((receipt) => receipt.userId === viewerUserId)
  );
}

function buildRoadDetail(
  road: RoadAssetRecord,
  viewerUserId?: string | null,
  canModerate = false,
): RoadDetail {
  const visibleRoad: RoadAssetRecord = {
    ...road,
    observations: road.observations.filter((observation) =>
      canViewObservation(observation, viewerUserId, canModerate),
    ),
  };
  const clearedRoad: RoadAssetRecord = {
    ...road,
    observations: road.observations.filter(
      (observation) => observation.humanCheckStatus === "CLEARED",
    ),
  };
  const geometry = parseGeometry(visibleRoad.geometryGeoJson);
  const issueClusters = buildIssueClusters(clearedRoad, viewerUserId);
  const clustersByKey = new Map(issueClusters.map((cluster) => [cluster.clusterKey, cluster]));
  const conditionHistory = buildConditionHistory(clearedRoad);
  const openIssues = issueClusters.filter((cluster) => cluster.state === "open");
  const monitoringIssues = issueClusters.filter(
    (cluster) => cluster.state === "monitoring",
  );
  const repeatIssues = issueClusters.filter(
    (cluster) => cluster.recurrenceCount >= 3 || cluster.repairCount >= 2,
  );
  const verifications = visibleRoad.repairs.flatMap((repair) => repair.verifications);
  return {
    id: road.id,
    slug: road.slug,
    name: road.name,
    assetType: road.assetType,
    assetLabel: roadAssetTypeMeta[road.assetType].label,
    osmId: road.osmId,
    summary: road.summary,
    wardName: road.ward.name,
    city: road.ward.city,
    importanceScore: road.importanceScore,
    surfaceLabel: road.surfaceLabel,
    lengthMeters: road.lengthMeters,
    centerLat: road.centerLat,
    centerLng: road.centerLng,
    geometry,
    conditionScore:
      conditionHistory.at(-1)?.score ?? clamp(92 - road.importanceScore * 2, 40, 96),
    budgetNeedInr: openIssues.reduce(
      (sum, cluster) => sum + cluster.estimatedCostInr,
      0,
    ),
    priorityScore: openIssues[0]?.priorityScore ?? monitoringIssues[0]?.priorityScore ?? 0,
    verifiedFixRate: percentage(
      verifications.filter((verification) => verification.verdict === "FIX_HELD").length,
      verifications.length,
    ),
    activeSubscriptionCount: road.subscriptions.length,
    publicObservationCount: clearedRoad.observations.length,
    openIssueCount: openIssues.length,
    monitoringIssueCount: monitoringIssues.length,
    repeatIssueCount: repeatIssues.length,
    repeatWasteInr: repeatIssues.reduce(
      (sum, cluster) => sum + cluster.wastedSpendInr,
      0,
    ),
    issueClusters,
    collectedViolations: visibleRoad.observations
      .map((observation) => {
        const severityBand = getSeverityBand(observation.severityScore);
        const cluster = clustersByKey.get(observation.issueClusterKey);
        const ownerUserId = observation.receipts[0]?.userId ?? null;

        return {
          id: observation.id,
          roadId: road.id,
          roadSlug: road.slug,
          roadName: road.name,
          issueType: observation.issueType,
          issueLabel: issueTypeMeta[observation.issueType].label,
          severityScore: observation.severityScore,
          severityBand,
          severityLabel: severityBandMeta[severityBand].label,
          state: cluster?.state ?? "open",
          stateLabel: cluster?.stateLabel ?? "Open observation",
          description: observation.description,
          evidencePath: observation.evidencePath,
          humanCheckStatus: observation.humanCheckStatus,
          gpsLat: observation.gpsLat ?? road.centerLat,
          gpsLng: observation.gpsLng ?? road.centerLng,
          submittedAt: observation.createdAt.toISOString(),
          likeCount: observation.votes.filter((vote) => vote.kind === "LIKE").length,
          dislikeCount: observation.votes.filter((vote) => vote.kind === "DISLIKE").length,
          viewerVote: observation.votes.find((vote) => vote.userId === viewerUserId)?.kind ?? null,
          isOwnCollection: ownerUserId === viewerUserId,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
      ),
    conditionHistory,
    timeline: buildTimeline(clearedRoad),
    repairs: road.repairs
      .map((repair) => ({
        id: repair.id,
        clusterKey: repair.issueClusterKey,
        issueLabel:
          issueClusters.find((cluster) => cluster.clusterKey === repair.issueClusterKey)
            ?.issueLabel ?? "Unknown",
        status: repair.status,
        statusLabel: repairStatusMeta[repair.status].label,
        note: repair.note,
        proofImagePath: repair.proofImagePath,
        costEstimateInr: repair.costEstimateInr,
        recordedByLabel: repair.recordedBy.publicLabel,
        recordedAt: repair.createdAt.toISOString(),
        completedAt: repair.completedAt?.toISOString() ?? null,
        verifications: repair.verifications.map((verification) => ({
          id: verification.id,
          verdict: verification.verdict,
          verdictLabel: verificationVerdictMeta[verification.verdict].label,
          note: verification.note,
          createdAt: verification.createdAt.toISOString(),
          actorLabel: verification.createdBy.publicLabel,
        })),
      }))
      .sort(
        (left, right) =>
          new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
      ),
    community: buildCommunityBuckets(road),
  };
}

function toRoadSummary(detail: RoadDetail): RoadSummary {
  return {
    id: detail.id,
    slug: detail.slug,
    name: detail.name,
    assetType: detail.assetType,
    assetLabel: detail.assetLabel,
    summary: detail.summary,
    importanceScore: detail.importanceScore,
    conditionScore: detail.conditionScore,
    budgetNeedInr: detail.budgetNeedInr,
    priorityScore: detail.priorityScore,
    verifiedFixRate: detail.verifiedFixRate,
    openIssueCount: detail.openIssueCount,
    monitoringIssueCount: detail.monitoringIssueCount,
    repeatIssueCount: detail.repeatIssueCount,
    repeatWasteInr: detail.repeatWasteInr,
    centerLat: detail.centerLat,
    centerLng: detail.centerLng,
    geometry: detail.geometry,
    latestUpdateAt: detail.timeline[0]?.at ?? new Date().toISOString(),
  };
}

async function getRoadRecords() {
  return prisma.roadAsset.findMany({
    include: roadAssetInclude,
    orderBy: {
      importanceScore: "desc",
    },
  });
}

export async function getWardDashboard(): Promise<WardDashboard> {
  const ward = await prisma.ward.findFirstOrThrow();
  const roads = await getRoadRecords();
  const roadDetails = roads.map((road) => buildRoadDetail(road));
  const roadSummaries = roadDetails.map(toRoadSummary);

  const issueBudgetBreakdown = (
    Object.keys(issueTypeMeta) as IssueType[]
  ).map((issueType) => {
    const matchingClusters = roadDetails.flatMap((road) =>
      road.issueClusters.filter(
        (cluster) => cluster.issueType === issueType && cluster.state !== "resolved",
      ),
    );

    return {
      issueType,
      label: issueTypeMeta[issueType].label,
      totalBudgetNeedInr: matchingClusters.reduce(
        (sum, cluster) => sum + cluster.estimatedCostInr,
        0,
      ),
      openIssueCount: matchingClusters.length,
    };
  });

  return {
    ward: {
      name: ward.name,
      city: ward.city,
      slug: ward.slug,
      summary: ward.summary,
      osmReference: ward.osmReference,
      centerLat: ward.centerLat,
      centerLng: ward.centerLng,
      boundary: parseBoundary(ward.boundaryGeoJson),
    },
    overview: {
      averageConditionScore: Math.round(
        roadDetails.reduce((sum, road) => sum + road.conditionScore, 0) /
          roadDetails.length,
      ),
      openIssueCount: roadDetails.reduce(
        (sum, road) => sum + road.openIssueCount,
        0,
      ),
      monitoringIssueCount: roadDetails.reduce(
        (sum, road) => sum + road.monitoringIssueCount,
        0,
      ),
      totalBudgetNeedInr: roadDetails.reduce(
        (sum, road) => sum + road.budgetNeedInr,
        0,
      ),
      verifiedFixRate: Math.round(
        roadDetails.reduce((sum, road) => sum + road.verifiedFixRate, 0) /
          roadDetails.length,
      ),
      repeatWasteInr: roadDetails.reduce(
        (sum, road) => sum + road.repeatWasteInr,
        0,
      ),
    },
    roads: roadSummaries,
    rankings: [...roadSummaries].sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore;
      }

      return right.budgetNeedInr - left.budgetNeedInr;
    }),
    repeatOffenders: roadDetails
      .filter((road) => road.repeatIssueCount > 0)
      .sort((left, right) => right.repeatWasteInr - left.repeatWasteInr)
      .map((road) => ({
        slug: road.slug,
        name: road.name,
        repeatIssueCount: road.repeatIssueCount,
        repeatWasteInr: road.repeatWasteInr,
        worstCluster: road.issueClusters.find(
          (cluster) => cluster.recurrenceCount >= 3 || cluster.repairCount >= 2,
        ) ?? null,
      })),
    issueBudgetBreakdown: issueBudgetBreakdown.sort(
      (left, right) => right.totalBudgetNeedInr - left.totalBudgetNeedInr,
    ),
    latestCommunity: roads
      .flatMap((road) =>
        road.communityEntries.map((entry) => ({
          roadSlug: road.slug,
          roadName: road.name,
          category: entry.category,
          title: entry.title,
          agreementCount: entry.agreementCount,
          createdAt: entry.createdAt.toISOString(),
        })),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 6),
  };
}

export async function getRoadDetail(
  slug: string,
  viewerUserId?: string | null,
  canModerate = false,
) {
  const road = await prisma.roadAsset.findUniqueOrThrow({
    where: {
      slug,
    },
    include: roadAssetInclude,
  });

  return buildRoadDetail(road, viewerUserId, canModerate);
}

export async function getRoadAssetOptions() {
  const roads = await prisma.roadAsset.findMany({
    orderBy: [
      {
        assetType: "asc",
      },
      {
        name: "asc",
      },
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      assetType: true,
      centerLat: true,
      centerLng: true,
    },
  });

  return roads.map((road) => ({
    id: road.id,
    slug: road.slug,
    name: road.name,
    assetType: road.assetType,
    assetLabel: roadAssetTypeMeta[road.assetType].label,
    centerLat: road.centerLat,
    centerLng: road.centerLng,
  }));
}

export async function getDemoUsers() {
  const users = await prisma.user.findMany({
    include: {
      ward: true,
    },
    orderBy: [
      {
        role: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    publicLabel: user.publicLabel,
    role: user.role,
    wardName: user.ward.name,
  }));
}

export async function getAccountDashboard(userId: string): Promise<AccountDashboard> {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    include: {
      _count: {
        select: {
          observationReceipts: true,
        },
      },
      subscriptions: {
        include: {
          road: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      discussions: {
        include: {
          road: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      publicLabel: user.publicLabel,
      role: user.role,
    },
    complaintsCount: user._count.observationReceipts,
    subscriptions: user.subscriptions.map((subscription) => ({
      id: subscription.id,
      token: subscription.token,
      roadSlug: subscription.road.slug,
      roadName: subscription.road.name,
      minSeverity: subscription.minSeverity,
      issueTypes: safeJsonParse<IssueType[]>(subscription.issueTypesJson),
      eventTypes: safeJsonParse<RssEventType[]>(subscription.eventTypesJson),
      feedUrl: `${defaultBaseUrl}/feeds/subscriptions/${subscription.token}`,
    })),
    discussions: user.discussions.map((entry) => ({
      id: entry.id,
      category: entry.category,
      roadSlug: entry.road.slug,
      roadName: entry.road.name,
      title: entry.title,
      body: entry.body,
      agreementCount: entry.agreementCount,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function getMyComplaintDashboard(
  userId: string,
): Promise<MyComplaintDashboard> {
  const receipts = await prisma.observationReceipt.findMany({
    where: {
      userId,
    },
    include: observationReceiptInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  const clustersByRoadId = new Map<string, IssueClusterSummary[]>();
  const complaints = receipts.map((receipt) => {
    const road = receipt.observation.road;
    const cachedClusters = clustersByRoadId.get(road.id);
    const issueClusters = cachedClusters ?? buildIssueClusters(road, userId);

    if (!cachedClusters) {
      clustersByRoadId.set(road.id, issueClusters);
    }

    const cluster = issueClusters.find(
      (item) => item.clusterKey === receipt.observation.issueClusterKey,
    );
    const severityBand = getSeverityBand(receipt.observation.severityScore);

    return {
      id: receipt.id,
      observationId: receipt.observation.id,
      roadSlug: road.slug,
      roadName: road.name,
      assetLabel: roadAssetTypeMeta[road.assetType].label,
      clusterKey: receipt.observation.issueClusterKey,
      issueLabel: issueTypeMeta[receipt.observation.issueType].label,
      severityScore: receipt.observation.severityScore,
      severityBand: cluster?.severityBand ?? severityBand,
      severityLabel: cluster?.severityLabel ?? severityBandMeta[severityBand].label,
      state: cluster?.state ?? "open",
      stateLabel: cluster?.stateLabel ?? "Open observation",
      description: receipt.observation.description,
      evidencePath: receipt.observation.evidencePath,
      humanCheckStatus: receipt.observation.humanCheckStatus,
      gpsLat: receipt.observation.gpsLat ?? road.centerLat,
      gpsLng: receipt.observation.gpsLng ?? road.centerLng,
      submittedAt: receipt.observation.createdAt.toISOString(),
      latestRepairStatus: cluster?.latestRepairStatus ?? null,
      latestRepairNote: cluster?.latestRepairNote ?? null,
      latestRepairProofPath: cluster?.latestRepairProofPath ?? null,
      latestRepairRecordedAt: cluster?.latestRepairRecordedAt ?? null,
      latestVerificationLabel: cluster?.latestVerificationLabel ?? null,
      likeCount: receipt.observation.votes.filter((vote) => vote.kind === "LIKE").length,
      dislikeCount: receipt.observation.votes.filter((vote) => vote.kind === "DISLIKE").length,
    };
  });

  const scoreEligibleComplaints = complaints.filter(
    (complaint) => complaint.humanCheckStatus === "CLEARED",
  );
  const receivedLikeCount = scoreEligibleComplaints.reduce(
    (sum, complaint) => sum + complaint.likeCount,
    0,
  );
  const receivedDislikeCount = scoreEligibleComplaints.reduce(
    (sum, complaint) => sum + complaint.dislikeCount,
    0,
  );

  const score = calculateCollectorScore({
    submittedViolationCount: scoreEligibleComplaints.length,
    receivedLikeCount,
    receivedDislikeCount,
  });

  const resolvedCount = scoreEligibleComplaints.filter(
    (complaint) => complaint.state === "resolved",
  ).length;

  return {
    totalCount: complaints.length,
    score,
    levelProgress: getCollectorLevelProgress(score.totalScore),
    badges: getCollectorBadges({
      submittedViolationCount: scoreEligibleComplaints.length,
      receivedLikeCount,
      receivedDislikeCount,
      resolvedViolationCount: resolvedCount,
    }),
    openCount: scoreEligibleComplaints.filter((complaint) => complaint.state === "open").length,
    monitoringCount: scoreEligibleComplaints.filter(
      (complaint) => complaint.state === "monitoring",
    ).length,
    resolvedCount,
    complaints,
  };
}

export async function getCollectorLeaderboard(
  window: LeaderboardWindow = "all",
): Promise<CollectorLeaderboard> {
  const windowStart = getLeaderboardWindowStart(window);
  const residents = await prisma.user.findMany({
    where: {
      role: "RESIDENT",
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
      const scoreEligibleReceipts = resident.observationReceipts.filter(
        (receipt) => receipt.observation.humanCheckStatus === "CLEARED",
      );
      const includedReceipts = scoreEligibleReceipts.filter((receipt) =>
        windowStart ? receipt.createdAt >= windowStart : true,
      );
      const receivedLikeCount = scoreEligibleReceipts.reduce(
        (sum, receipt) =>
          sum +
          receipt.observation.votes.filter(
            (vote) =>
              vote.kind === "LIKE" &&
              (windowStart ? vote.updatedAt >= windowStart : true),
          ).length,
        0,
      );
      const receivedDislikeCount = scoreEligibleReceipts.reduce(
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
    score: entry.score,
  }));

  return {
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

export async function getRoadExportRows(slug: string): Promise<ExportRow[]> {
  const road = await prisma.roadAsset.findUniqueOrThrow({
    where: {
      slug,
    },
    include: roadAssetInclude,
  });
  const publicRoad: RoadAssetRecord = {
    ...road,
    observations: road.observations.filter(
      (observation) => observation.humanCheckStatus === "CLEARED",
    ),
  };
  const issueClusters = buildIssueClusters(publicRoad);
  const clusterMap = new Map(issueClusters.map((cluster) => [cluster.clusterKey, cluster]));
  const rows: ExportRow[] = [];

  for (const observation of publicRoad.observations) {
    rows.push({
      recordedAt: observation.createdAt.toISOString(),
      eventType: "observation",
      roadName: road.name,
      roadSlug: road.slug,
      clusterKey: observation.issueClusterKey,
      issueType: issueTypeMeta[observation.issueType].label,
      severityScore: observation.severityScore,
      impactScore: observation.impactScore,
      status: "Anonymous live camera observation",
      verdict: null,
      costEstimateInr: null,
      actorLabel: "Anonymous live camera",
      description: observation.description,
      gpsLat: observation.gpsLat,
      gpsLng: observation.gpsLng,
      evidencePath: observation.evidencePath,
    });

    for (const vote of observation.votes) {
      rows.push({
        recordedAt: vote.updatedAt.toISOString(),
        eventType: "vote",
        roadName: road.name,
        roadSlug: road.slug,
        clusterKey: observation.issueClusterKey,
        issueType: issueTypeMeta[observation.issueType].label,
        severityScore: observation.severityScore,
        impactScore: observation.impactScore,
        status: vote.kind === "LIKE" ? "Violation confirmed" : "Violation disputed",
        verdict: vote.kind,
        costEstimateInr: null,
        actorLabel: "Resident vote",
        description: `${vote.kind === "LIKE" ? "Liked" : "Disliked"} collected violation: ${observation.description}`,
        gpsLat: observation.gpsLat,
        gpsLng: observation.gpsLng,
        evidencePath: observation.evidencePath,
      });
    }
  }

  for (const repair of road.repairs) {
    const cluster = clusterMap.get(repair.issueClusterKey);

    rows.push({
      recordedAt: (repair.completedAt ?? repair.createdAt).toISOString(),
      eventType: "repair",
      roadName: road.name,
      roadSlug: road.slug,
      clusterKey: repair.issueClusterKey,
      issueType: cluster?.issueLabel ?? "Unknown",
      severityScore: cluster?.severityScore ?? null,
      impactScore: cluster?.impactScore ?? null,
      status: repairStatusMeta[repair.status].label,
      verdict: null,
      costEstimateInr: repair.costEstimateInr,
      actorLabel: repair.recordedBy.publicLabel,
      description: repair.note,
      gpsLat: null,
      gpsLng: null,
      evidencePath: repair.proofImagePath,
    });

    for (const verification of repair.verifications) {
      rows.push({
        recordedAt: verification.createdAt.toISOString(),
        eventType: "verification",
        roadName: road.name,
        roadSlug: road.slug,
        clusterKey: repair.issueClusterKey,
        issueType: cluster?.issueLabel ?? "Unknown",
        severityScore: cluster?.severityScore ?? null,
        impactScore: cluster?.impactScore ?? null,
        status: null,
        verdict: verificationVerdictMeta[verification.verdict].label,
        costEstimateInr: repair.costEstimateInr,
        actorLabel: verification.createdBy.publicLabel,
        description: verification.note,
        gpsLat: null,
        gpsLng: null,
        evidencePath: null,
      });
    }
  }

  return rows.sort(
    (left, right) =>
      new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
  );
}

export function rowsToCsv(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {
    recordedAt: "",
    eventType: "",
    roadName: "",
    roadSlug: "",
    clusterKey: "",
    issueType: "",
    severityScore: "",
    impactScore: "",
    status: "",
    verdict: "",
    costEstimateInr: "",
    actorLabel: "",
    description: "",
    gpsLat: "",
    gpsLng: "",
    evidencePath: "",
  });

  const escape = (value: string | number | null) => {
    const content = value == null ? "" : String(value);
    return `"${content.replace(/"/g, '""')}"`;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header as keyof ExportRow] as string | number | null)).join(","))].join("\n");
}

export async function getSubscriptionFeed(token: string): Promise<SubscriptionFeed> {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: {
      token,
    },
    include: {
      road: {
        include: roadAssetInclude,
      },
      user: true,
    },
  });

  const issueTypes = safeJsonParse<IssueType[]>(subscription.issueTypesJson);
  const eventTypes = safeJsonParse<RssEventType[]>(subscription.eventTypesJson);
  const exportRows = await getRoadExportRows(subscription.road.slug);
  const filteredRows = exportRows.filter((row) => {
    if (!eventTypes.includes(row.eventType)) {
      return false;
    }

    if (!issueTypes.some((issueType) => issueTypeMeta[issueType].label === row.issueType)) {
      return false;
    }

    if (row.severityScore != null && row.severityScore < subscription.minSeverity) {
      return false;
    }

    return true;
  });

  return {
    title: `${subscription.road.name} road updates`,
    description: `RoadWatch updates for ${subscription.road.name}. Minimum severity ${subscription.minSeverity}.`,
    feedUrl: `${defaultBaseUrl}/feeds/subscriptions/${subscription.token}`,
    siteUrl: `${defaultBaseUrl}/roads/${subscription.road.slug}`,
    items: filteredRows.slice(0, 25).map((row) => ({
      guid: `${row.eventType}-${row.clusterKey}-${row.recordedAt}`,
      title: `${subscription.road.name}: ${row.eventType} - ${row.issueType}`,
      description: `${row.description} Status: ${row.status ?? row.verdict ?? "Observation"}. Actor: ${row.actorLabel}. Budget signal: ${row.costEstimateInr ? formatCurrencyInr(row.costEstimateInr) : "n/a"}.`,
      publishedAt: row.recordedAt,
      link: `${defaultBaseUrl}/roads/${subscription.road.slug}`,
    })),
  };
}
