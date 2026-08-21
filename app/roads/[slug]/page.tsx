import Link from "next/link";
import {
  Database as DatabaseIcon,
  History,
  MapPin,
  MessageCircle,
  Radio,
  Rss,
} from "lucide-react";
import { notFound } from "next/navigation";

import { CollectedViolationList } from "@/components/collected-violation-list";
import { CommunityComposer } from "@/components/community-composer";
import { DashboardMap } from "@/components/dashboard-map";
import { GovPendingComplaintList } from "@/components/gov-pending-complaint-list";
import { PublicRecordList } from "@/components/public-record-list";
import { RepairReviewBoard } from "@/components/repair-review-board";
import { SubscriptionForm } from "@/components/subscription-form";
import { getSessionUser } from "@/lib/auth";
import { rateRoadAction } from "@/app/actions";
import { communityCategoryMeta, toneClasses } from "@/lib/constants";
import { getRoadDetail, getWardDashboard } from "@/lib/data";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function readSearchValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function RoadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    section?: string | string[];
    community?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const section = readSearchValue(resolvedSearchParams.section, "record");
  const communityView = readSearchValue(
    resolvedSearchParams.community,
    "discussion",
  );
  const user = await getSessionUser();
  const [road, dashboard] = await Promise.all([
    getRoadDetail(slug, user?.id ?? null, user?.role === "GOV").catch(() => notFound()),
    getWardDashboard(),
  ]);

  const displayIssueClusters = road.issueClusters;
  const pendingIssueClusters = road.issueClusters.filter((cluster) => cluster.state === "open");
  const canVoteOnComplaints = user?.role === "RESIDENT";
  const voteMessage = user?.role === "GOV"
    ? "Government accounts cannot vote on violations."
    : "Sign in as a resident to support this issue or flag it as false.";
  const communityCategory =
    communityView === "appreciation"
      ? "APPRECIATION"
      : communityView === "solution"
        ? "SOLUTION"
        : "DISCUSSION";
  const communityCount =
    road.community.DISCUSSION.length +
    road.community.APPRECIATION.length +
    road.community.SOLUTION.length;
  const dataPreview = {
    road: {
      name: road.name,
      slug: road.slug,
      assetType: road.assetType,
      openIssueCount: road.openIssueCount,
      publicObservationCount: road.publicObservationCount,
      repairUpdateCount: road.repairs.length,
      communityNoteCount: communityCount,
      osmId: road.osmId,
      segmentCount: road.segmentCount,
      importedSourceEventCount: road.sourceEvents.length,
    },
    collectedViolations: road.collectedViolations
      .filter((violation) => violation.humanCheckStatus === "CLEARED")
      .map((violation) => ({
        id: violation.id,
        issue: violation.issueLabel,
        severity: violation.severityScore,
        likes: violation.likeCount,
        dislikes: violation.dislikeCount,
        state: violation.stateLabel,
        collectedAt: violation.submittedAt,
      })),
    repairs: road.repairs.map((repair) => ({
      id: repair.id,
      issue: repair.issueLabel,
      status: repair.statusLabel,
      recordedAt: repair.recordedAt,
      proofImagePath: repair.proofImagePath,
    })),
  };

  const mapPanel = (
    <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-4 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
      <DashboardMap
        roads={dashboard.roads.map((item) => ({
          slug: item.slug,
          name: item.name,
          assetType: item.assetType,
          conditionScore: item.conditionScore,
          openIssueCount: item.openIssueCount,
          geometry: item.geometry,
          centerLat: item.centerLat,
          centerLng: item.centerLng,
        }))}
        boundary={dashboard.ward.boundary}
        center={[dashboard.ward.centerLng, dashboard.ward.centerLat]}
        selectedSlug={road.slug}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <MapPin className="h-4 w-4 text-teal-700" aria-hidden="true" />
          {road.wardName} · {road.city} · {road.assetLabel}
        </p>
        <h2 className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950 sm:text-5xl">
          {road.name}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{road.summary}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { id: "record", label: "Sightings", icon: Radio },
            { id: "history", label: user?.role === "GOV" ? "Repairs" : "Repair log", icon: History },
            { id: "community", label: "Community", icon: MessageCircle },
            { id: "data", label: "Data", icon: DatabaseIcon },
          ].map((tab) => {
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={`/roads/${road.slug}?section=${tab.id}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  section === tab.id
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="eyebrow text-slate-500">Measured condition</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{road.conditionScore}/100</p>
          <p className="mt-2 text-sm text-slate-600">
            Baseline {road.conditionBreakdown.baseline}, distress -{road.conditionBreakdown.distressPenalty}, repairs +{road.conditionBreakdown.repairRecovery}, verification {road.conditionBreakdown.verificationAdjustment >= 0 ? "+" : ""}{road.conditionBreakdown.verificationAdjustment}.
          </p>
          <p className="mt-2 text-xs text-slate-500">{road.conditionBreakdown.explanation}</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="eyebrow text-slate-500">Evidence confidence</p>
          <p className="mt-2 text-3xl font-semibold capitalize text-slate-950">{road.dataConfidence.level}</p>
          <p className="mt-2 text-sm text-slate-600">{road.dataConfidence.explanation}</p>
          <p className="mt-2 text-xs text-slate-500">
            {road.dataConfidence.clearedObservations} approved observations, {road.dataConfidence.importedSourceEvents} imported source events
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="eyebrow text-slate-500">Civic authority</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{road.authority.label}</p>
          <p className="mt-2 text-sm text-slate-600">{road.authority.source ?? "Ward boundary record"}</p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white/82 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-slate-500">Perception layer</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">How does this road feel to use?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {road.commuterRating.average == null
                ? "No commuter ratings yet."
                : `${road.commuterRating.average} out of 5 from ${road.commuterRating.count} rating${road.commuterRating.count === 1 ? "" : "s"}.`}
            </p>
          </div>
          {user?.role === "RESIDENT" ? (
            <form action={rateRoadAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="roadId" value={road.id} />
              <label htmlFor="road-rating" className="sr-only">Road rating from one to five</label>
              <select
                id="road-rating"
                name="rating"
                defaultValue={road.commuterRating.viewerRating ?? 3}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Save rating
              </button>
            </form>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          {[1, 2, 3, 4, 5].map((rating) => (
            <span key={rating} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {rating} star: {road.commuterRating.distribution[rating as 1 | 2 | 3 | 4 | 5]}
            </span>
          ))}
        </div>
      </section>

      {section === "record" ? (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Radio className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Native capture
            </p>
            <h3 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Capture this road in the RoadWatch mobile app.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Camera, foreground location, safe capture guidance, and offline queuing are provided by the Expo iOS and Android app.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Rss className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Road RSS
            </p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Subscribe to this street feed
            </h3>

            <div className="mt-4">
              {user?.role === "RESIDENT" ? (
                <SubscriptionForm roadId={road.id} />
              ) : user?.role === "GOV" ? (
                <div className="rounded-[1.35rem] border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
                  Resident account required.
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Sign in as a resident to subscribe.
                </div>
              )}
            </div>
          </div>

          <CollectedViolationList
            violations={road.collectedViolations}
            canVote={canVoteOnComplaints}
            canModerate={user?.role === "GOV"}
            voteMessage={voteMessage}
          />

          <PublicRecordList clusters={displayIssueClusters} />

          {mapPanel}
        </section>
      ) : null}

      {section === "history" ? (
        user?.role === "GOV" ? (
          <GovPendingComplaintList
            roadSlug={road.slug}
            roadName={road.name}
            clusters={pendingIssueClusters}
          />
        ) : (
          <section className="space-y-6">
            <RepairReviewBoard
              roadId={road.id}
              roadName={road.name}
              clusters={displayIssueClusters}
              userRole={user?.role ?? null}
            />

            <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
              <p className="eyebrow text-slate-500">Repair log</p>
              <div className="mt-4 space-y-4">
                {road.repairs.length ? (
                  road.repairs.map((repair) => (
                    <div
                      key={repair.id}
                      className="rounded-[1.45rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{repair.issueLabel}</p>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                                repair.status === "REPAIRED"
                                  ? toneClasses.good
                                  : toneClasses.warning,
                              )}
                            >
                              {repair.statusLabel}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{repair.note}</p>
                          <p className="mt-3 text-xs text-slate-500">
                            {formatDateTime(repair.recordedAt)}
                          </p>
                        </div>
                      </div>

                      {repair.verifications.length ? (
                        <div className="mt-4 space-y-2">
                          {repair.verifications.map((verification) => (
                            <div
                              key={verification.id}
                              className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <p className="font-semibold text-slate-900">
                                  {verification.verdictLabel}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDate(verification.createdAt)}
                                </p>
                              </div>
                              <p className="mt-1 text-slate-600">{verification.note}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No repair updates have been recorded on this road yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        )
      ) : null}

      {section === "community" ? (
        <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
              <p className="eyebrow text-slate-500">Community tabs</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { id: "discussion", label: "Discussions" },
                  { id: "appreciation", label: "Appreciate" },
                  { id: "solution", label: "Solutions" },
                ].map((tab) => (
                  <Link
                    key={tab.id}
                    href={`/roads/${road.slug}?section=community&community=${tab.id}`}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      communityView === tab.id
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>

            {user ? (
              <CommunityComposer
                roadId={road.id}
                category={communityCategory}
              />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/82 px-4 py-6 text-sm text-slate-500 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
                Sign in to participate in community discussions.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="eyebrow text-slate-500">
              {communityCategoryMeta[communityCategory].label}
            </p>
            <div className="mt-4 space-y-3">
              {road.community[communityCategory].length ? (
                road.community[communityCategory].map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1.45rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{entry.title}</p>
                        <p className="mt-2 text-sm text-slate-600">{entry.body}</p>
                      </div>
                      <div className="text-xs text-slate-500 sm:text-right">
                        <p>{formatDate(entry.createdAt)}</p>
                        <p>{entry.agreementCount} agreement</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {communityCategoryMeta[communityCategory].emptyLabel}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {section === "data" ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
            <p className="eyebrow text-slate-500">Export tools</p>
            <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
              Data for planners and media
            </h3>
            <div className="mt-5 grid gap-3">
              <a
                href={`/api/roads/${road.slug}/data.csv`}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                Download CSV
              </a>
              <a
                href={`/api/roads/${road.slug}/data.json`}
                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                Open JSON
              </a>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p>OSM reference: {road.osmId}</p>
                <p className="mt-2">Public observations: {road.publicObservationCount}</p>
                <p className="mt-2">Road segments: {road.segmentCount}</p>
                <p className="mt-2">Imported source events: {road.sourceEvents.length}</p>
                <p className="mt-2">Saved RSS watchers: {road.activeSubscriptionCount}</p>
                <p className="mt-2">Community notes: {communityCount}</p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Imported evidence</p>
                <div className="mt-3 space-y-3">
                  {road.sourceEvents.length ? road.sourceEvents.map((event) => (
                    <div key={event.id} className="border-l-2 border-slate-300 pl-3 text-sm">
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.sourceLabel}{event.segmentSequence == null ? "" : `, segment ${event.segmentSequence + 1}`} · {formatDate(event.observedAt)}
                      </p>
                      <p className="mt-1 text-slate-600">{event.description}</p>
                      {event.sourceReference ? (
                        <a href={event.sourceReference} className="mt-1 inline-block text-xs font-semibold text-slate-700 underline" target="_blank" rel="noreferrer">
                          Open source reference
                        </a>
                      ) : null}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No imported source events have been ingested for this road.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.52)]">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="eyebrow text-slate-400">JSON preview</p>
            </div>
            <pre className="max-h-[720px] overflow-auto px-5 py-5 text-xs leading-6 text-slate-200">
              {JSON.stringify(dataPreview, null, 2)}
            </pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
