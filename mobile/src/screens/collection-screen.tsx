import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { useApiResource } from "@/hooks/use-api-resource";
import { colors } from "@/theme/colors";
import { authStorage } from "@/lib/auth-storage";

type CollectionItem = {
  id: string;
  issueType: string;
  roadName: string;
  description: string;
  evidenceUrl: string | null;
  capturedAt: string;
  gps: { lat: number; lng: number } | null;
  likeCount: number;
  dislikeCount: number;
  reviewStatus: "MANUAL_REVIEW" | "CLEARED" | "REJECTED";
  points: number;
};

type CollectionResponse = {
  items: CollectionItem[];
  approvedPoints: number;
};

export function CollectionScreen() {
  const resource = useApiResource<CollectionResponse>("/me/collection");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    authStorage.getAccessToken().then(setAccessToken).catch(() => setAccessToken(null));
  }, []);

  function evidenceUri(pathname: string | null) {
    if (!pathname) {
      return null;
    }

    if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
      return pathname;
    }

    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!baseUrl) {
      return null;
    }

    const cacheVersion = pathname.startsWith("/uploads/seed/")
      ? "?v=real-photo-set-1"
      : "";
    return `${baseUrl}${pathname}${cacheVersion}`;
  }

  return (
    <ScreenShell
      eyebrow="Private resident view"
      title="My collection"
      description="Your private capture history. Government approval makes a catch public and awards points."
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
              {evidenceUri(item.evidenceUrl) ? (
                <Image
                  source={{
                    uri: evidenceUri(item.evidenceUrl) ?? undefined,
                    headers: accessToken
                      ? { Authorization: `Bearer ${accessToken}` }
                      : undefined,
                  }}
                  alt={`${item.issueType} evidence photo`}
                  contentFit="cover"
                  style={{ height: 190, borderRadius: 14, backgroundColor: colors.background }}
                />
              ) : null}
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "800" }}>
                {item.issueType.replaceAll("_", " ")}
              </Text>
              <Text selectable style={{ color: colors.muted }}>
                {item.roadName}
              </Text>
              <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
                {item.description}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                Captured {new Date(item.capturedAt).toLocaleDateString()}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                {item.gps
                  ? `Location from GPS: ${item.gps.lat.toFixed(5)}, ${item.gps.lng.toFixed(5)}`
                  : "Location from GPS: unavailable for this capture"}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                Confirmed by {item.likeCount} · disputed by {item.dislikeCount} other resident{item.likeCount + item.dislikeCount === 1 ? "" : "s"}
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
