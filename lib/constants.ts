import type {
  CommunityCategory,
  IssueType,
  RepairStatus,
  RoadAssetType,
  VerificationVerdict,
} from "@prisma/client";

export const appName = "RoadWatch";
export const defaultWardSlug = "ward-94-demo";
export const defaultBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const issueTypeMeta: Record<
  IssueType,
  {
    label: string;
    shortLabel: string;
    weight: number;
    baseCostInr: number;
    color: string;
  }
> = {
  POTHOLE: {
    label: "Pothole",
    shortLabel: "Pothole",
    weight: 1,
    baseCostInr: 28000,
    color: "#c2410c",
  },
  BROKEN_FOOTPATH: {
    label: "Broken footpath",
    shortLabel: "Broken path",
    weight: 0.95,
    baseCostInr: 96000,
    color: "#9f1239",
  },
  MISSING_STREET_LIGHT: {
    label: "Missing street light",
    shortLabel: "Lighting",
    weight: 0.65,
    baseCostInr: 18000,
    color: "#0f766e",
  },
  UNAUTHORIZED_PARKING: {
    label: "Unauthorized parking",
    shortLabel: "Parking",
    weight: 0.55,
    baseCostInr: 24000,
    color: "#b45309",
  },
  VENDOR_ENCROACHMENT: {
    label: "Vendor encroachment",
    shortLabel: "Vendor",
    weight: 0.7,
    baseCostInr: 32000,
    color: "#7c3aed",
  },
  FOOTPATH_BLOCKED: {
    label: "Footpath blocked",
    shortLabel: "Blocked path",
    weight: 0.85,
    baseCostInr: 42000,
    color: "#be123c",
  },
};

export const roadAssetTypeMeta: Record<
  RoadAssetType,
  { label: string; color: string }
> = {
  ROAD: {
    label: "Road",
    color: "#0f766e",
  },
  FOOTPATH: {
    label: "Footpath",
    color: "#1d4ed8",
  },
};

export const repairStatusMeta: Record<
  RepairStatus,
  { label: string; tone: "neutral" | "good" | "warning" }
> = {
  SCHEDULED: {
    label: "Scheduled",
    tone: "warning",
  },
  IN_PROGRESS: {
    label: "In progress",
    tone: "warning",
  },
  REPAIRED: {
    label: "Marked repaired",
    tone: "good",
  },
  MONITORING: {
    label: "Monitoring",
    tone: "neutral",
  },
};

export const verificationVerdictMeta: Record<
  VerificationVerdict,
  { label: string; tone: "neutral" | "good" | "danger" }
> = {
  FIX_HELD: {
    label: "Fix held",
    tone: "good",
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
  },
  STILL_BROKEN: {
    label: "Still broken",
    tone: "danger",
  },
};

export const communityCategoryMeta: Record<
  CommunityCategory,
  { label: string; emptyLabel: string }
> = {
  DISCUSSION: {
    label: "Discussions",
    emptyLabel: "No public discussion yet.",
  },
  APPRECIATION: {
    label: "Appreciate",
    emptyLabel: "No appreciation notes yet.",
  },
  SOLUTION: {
    label: "Solutions",
    emptyLabel: "No solution proposals yet.",
  },
};

export const rssEventTypeOptions = [
  "observation",
  "repair",
  "verification",
] as const;

export type RssEventType = (typeof rssEventTypeOptions)[number];

export const issueTypeOptions = Object.keys(issueTypeMeta) as IssueType[];

export const severityBandMeta = {
  LOW: {
    label: "Low",
    tone:
      "border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/80",
  },
  MEDIUM: {
    label: "Medium",
    tone:
      "border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/80",
  },
  HIGH: {
    label: "High",
    tone:
      "border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/80",
  },
} as const;

export type SeverityBand = keyof typeof severityBandMeta;

export function getSeverityBand(score: number): SeverityBand {
  if (score >= 80) {
    return "HIGH";
  }

  if (score >= 50) {
    return "MEDIUM";
  }

  return "LOW";
}

export const toneClasses = {
  neutral:
    "border-slate-200 bg-slate-100/80 text-slate-700 ring-1 ring-inset ring-slate-200/80",
  good:
    "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/80",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/80",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/80",
};
