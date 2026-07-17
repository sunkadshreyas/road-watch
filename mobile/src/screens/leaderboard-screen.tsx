import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { useApiResource } from "@/hooks/use-api-resource";
import { colors } from "@/theme/colors";

type LeaderboardEntry = {
  userId: string;
  publicLabel: string;
  rank: number;
  score: {
    submittedViolationCount: number;
    totalScore: number;
  };
};

type LeaderboardResponse = {
  window: "all" | "month" | "week";
  entries: LeaderboardEntry[];
};

export function LeaderboardScreen() {
  const resource = useApiResource<LeaderboardResponse>("/leaderboard?window=all");

  return (
    <ScreenShell
      eyebrow="Ward game"
      title="Leaderboard"
      description="Privacy-safe aliases rank approved unique catches only. Pending and rejected captures never affect rank."
    >
      {resource.status === "loading" ? (
        <StatusCard label="Loading" value="Calculating ward rank" />
      ) : null}
      {resource.status === "error" ? (
        <StatusCard label="Leaderboard unavailable" tone="warning">
          <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
            {resource.error}
          </Text>
          <PrimaryButton label="Try again" onPress={resource.reload} variant="secondary" />
        </StatusCard>
      ) : null}
      {resource.status === "ready" ? (
        <StatusCard label="Score window" value={resource.data.window} tone="accent" />
      ) : null}
      {resource.status === "ready" && resource.data.entries.length === 0 ? (
        <StatusCard label="No ranks yet" value="Approve the first unique capture to begin" />
      ) : null}
      {resource.status === "ready"
        ? resource.data.entries.map((entry) => (
            <View
              key={entry.userId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                borderRadius: 20,
                borderCurve: "continuous",
                backgroundColor: colors.surface,
                padding: 16,
              }}
            >
              <Text
                selectable
                style={{
                  minWidth: 40,
                  color: colors.accent,
                  fontSize: 24,
                  fontWeight: "900",
                  fontVariant: ["tabular-nums"],
                }}
              >
                #{entry.rank}
              </Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
                  {entry.publicLabel}
                </Text>
                <Text selectable style={{ color: colors.muted }}>
                  {entry.score.submittedViolationCount} approved catches
                </Text>
              </View>
              <Text
                selectable
                style={{ color: colors.ink, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}
              >
                {entry.score.totalScore}
              </Text>
            </View>
          ))
        : null}
    </ScreenShell>
  );
}
