import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { useApiResource } from "@/hooks/use-api-resource";
import { colors } from "@/theme/colors";

type CollectionItem = {
  id: string;
  issueType: string;
  roadName: string;
  reviewStatus: "MANUAL_REVIEW" | "CLEARED" | "REJECTED";
  points: number;
};

type CollectionResponse = {
  items: CollectionItem[];
  approvedPoints: number;
};

export function CollectionScreen() {
  const resource = useApiResource<CollectionResponse>("/me/collection");

  return (
    <ScreenShell
      eyebrow="Private resident view"
      title="My collection"
      description="Pending catches stay private and earn zero points. Approved catches add to your ward score."
    >
      {resource.status === "loading" ? (
        <StatusCard label="Loading" value="Opening your collection" />
      ) : null}
      {resource.status === "error" ? (
        <StatusCard label="Collection unavailable" tone="warning">
          <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
            {resource.error}
          </Text>
          <PrimaryButton label="Try again" onPress={resource.reload} variant="secondary" />
        </StatusCard>
      ) : null}
      {resource.status === "ready" ? (
        <StatusCard
          label="Approved-capture points"
          value={String(resource.data.approvedPoints)}
          tone="accent"
        />
      ) : null}
      {resource.status === "ready" && resource.data.items.length === 0 ? (
        <StatusCard label="Collection empty" value="Your first catch starts on the camera tab" />
      ) : null}
      {resource.status === "ready"
        ? resource.data.items.map((item) => (
            <View
              key={item.id}
              style={{
                gap: 8,
                borderRadius: 20,
                borderCurve: "continuous",
                backgroundColor: colors.surface,
                padding: 16,
              }}
            >
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "800" }}>
                {item.issueType.replaceAll("_", " ")}
              </Text>
              <Text selectable style={{ color: colors.muted }}>
                {item.roadName}
              </Text>
              <Text
                selectable
                style={{
                  color: item.reviewStatus === "CLEARED" ? colors.accent : colors.warning,
                  fontWeight: "700",
                }}
              >
                {item.reviewStatus === "CLEARED"
                  ? `Approved, +${item.points} points`
                  : item.reviewStatus === "REJECTED"
                    ? "Rejected, 0 points"
                    : "Pending review, 0 points"}
              </Text>
            </View>
          ))
        : null}
    </ScreenShell>
  );
}
