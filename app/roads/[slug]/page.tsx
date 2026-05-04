import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityComposer } from "@/components/community-composer";
import { DashboardMap } from "@/components/dashboard-map";
import { GovPendingComplaintList } from "@/components/gov-pending-complaint-list";
import { LiveObservationForm } from "@/components/live-observation-form";
import { PublicRecordList } from "@/components/public-record-list";
import { RepairReviewBoard } from "@/components/repair-review-board";
import { SubscriptionForm } from "@/components/subscription-form";
import { getSessionUser } from "@/lib/auth";
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
  const communityView = readSearchValue(resolvedSearchParams.community, "discussion");
  const user = await getSessionUser();
  const [road, dashboard] = await Promise.all([
    getRoadDetail(slug, user?.id ?? null).catch(() => notFound()),
    getWardDashboard(),
  ]);

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
  const displayIssueClusters = road.issueClusters;
  const pendingIssueClusters = road.issueClusters.filter((cluster) => cluster.state === "open");
  const canSubmitObservation = user?.role !== "GOV";
  const canVoteOnComplaints = user?.role === "RESIDENT";
  const voteMessage = user?.role === "GOV"
    ? "Government accounts cannot vote on complaints."
    : "Sign in as a resident to support this issue or flag it as false.";
  const dataPreview = {
    road: {
      name: road.name,
      slug: road.slug,
      assetType: road.assetType,
      openIssueCount: road.openIssueCount,
      monitoringIssueCount: road.monitoringIssueCount,
      publicObservationCount: road.publicObservationCount,
      repairUpdateCount: road.repairs.length,
      communityNoteCount: communityCount,
      osmId: road.osmId,
    },
    issueClusters: road.issueClusters.map((cluster) => ({
      clusterKey: cluster.clusterKey,
      issueType: cluster.issueType,
      issueLabel: cluster.issueLabel,
      severityBand: cluster.severityBand,
      state: cluster.stateLabel,
      severity: cluster.severityScore,
      reportCount: cluster.recurrenceCount,
      repairCount: cluster.repairCount,
      lastUpdatedAt: cluster.lastUpdatedAt,
      latestEvidencePath: cluster.latestEvidencePath,
      latestDescription: cluster.latestDescription,
      latestRepairStatus: cluster.latestRepairStatus,
      latestRepairProofPath: cluster.latestRepairProofPath,
      latestVerificationLabel: cluster.latestVerificationLabel,
      likeCount: cluster.likeCount,
      dislikeCount: cluster.dislikeCount,
    })),
    repairs: road.repairs.map((repair) => ({
      id: repair.id,
      issueLabel: repair.issueLabel,
      status: repair.statusLabel,
      note: repair.note,
      proofImagePath: repair.proofImagePath,
      recordedByLabel: repair.recordedByLabel,
      recordedAt: repair.recordedAt,
      completedAt: repair.completedAt,
      verificationCount: repair.verifications.length,
    })),
  };

  const mapPanel = (
    <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
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
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="eyebrow text-slate-500">
            {road.wardName} · {road.city} · {road.assetLabel}
          </p>
          <h2 className="mt-2 font-[family:var(--font-display)] text-5xl font-semibold text-slate-950">
            {road.name}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{road.summary}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { id: "record", label: "Record" },
              { id: "history", label: "History" },
              { id: "community", label: "Community" },
              { id: "data", label: "Data" },
            ].map((tab) => (
              <Link
                key={tab.id}
                href={`/roads/${road.slug}?section=${tab.id}`}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  section === tab.id
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Open issues</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.openIssueCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Current unresolved issue clusters on this record.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Under monitoring</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.monitoringIssueCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Repairs waiting for the public to confirm whether they held.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Public observations</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.publicObservationCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Anonymous reports already attached to this road or footpath.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
            <p className="eyebrow text-slate-500">Repair updates</p>
            <p className="mt-2 font-[family:var(--font-display)] text-4xl font-semibold text-slate-950">
              {road.repairs.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Government updates and public verification activity on this record.
            </p>
          </div>
        </div>
      </section>

      {section === "record" ? (
        <section className="space-y-6">
          <div className="space-y-5">
            {canSubmitObservation ? (
              <LiveObservationForm roadId={road.id} roadName={road.name} />
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
                <p className="eyebrow text-slate-500">Government flow</p>
                <h3 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                  Government-labelled accounts review public records and record repairs.
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  Public observations remain a resident flow. Use the history tab on this road
                  record to review pending complaints, then open a dedicated repair form for the
                  issue you want to update. Sign out if you need to test anonymous issue
                  submission.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/roads/${road.slug}?section=history`}
                    className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Review pending complaints
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
              <p className="eyebrow text-slate-500">RSS follow</p>
              <h3 className="mt-1 font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
                Watch this road record
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Save a customizable RSS feed for this road or footpath. Feed settings live in your private account area.
              </p>

              <div className="mt-4">
                {user ? (
                  <SubscriptionForm roadId={road.id} />
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Sign in through the demo account page to save RSS subscriptions.
                  </div>
                )}
              </div>
            </div>
          </div>

          <PublicRecordList
            roadId={road.id}
            roadName={road.name}
            clusters={displayIssueClusters}
            canVote={canVoteOnComplaints}
            voteMessage={voteMessage}
          />

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

            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
                <p className="eyebrow text-slate-500">Timeline</p>
                <div className="mt-4 space-y-3">
                  {road.timeline.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-950">{event.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{event.detail}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>{formatDateTime(event.at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] backdrop-blur">
                <p className="eyebrow text-slate-500">Repair ledger</p>
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
                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>recorded {formatDate(repair.recordedAt)}</span>
                              {repair.completedAt ? (
                                <span>completed {formatDate(repair.completedAt)}</span>
                              ) : null}
                              <span>by {repair.recordedByLabel}</span>
                              <span>{repair.verifications.length} verifications</span>
                              <span>
                                {repair.proofImagePath
                                  ? "repair photo attached"
                                  : "no repair photo"}
                              </span>
                            </div>
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
              <CommunityComposer roadId={road.id} category={communityCategory} />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/82 px-4 py-6 text-sm text-slate-500 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
                Sign in through the demo account page to participate in community discussions or save RSS feeds.
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
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{entry.title}</p>
                        <p className="mt-2 text-sm text-slate-600">{entry.body}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
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
                <p className="mt-2">Saved RSS watchers: {road.activeSubscriptionCount}</p>
                <p className="mt-2">Community notes: {communityCount}</p>
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
