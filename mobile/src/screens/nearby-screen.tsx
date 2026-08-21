import { useEffect, useState } from "react";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { useApiResource } from "@/hooks/use-api-resource";
import { getApiClient } from "@/lib/api";
import { authStorage } from "@/lib/auth-storage";
import { buildNearbyViolationsPath } from "@/lib/nearby-request";
import { colors } from "@/theme/colors";

type NearbyViolation = {
  id: string;
  issueLabel: string;
  distanceMeters: number;
  road: {
    name: string;
  };
  description: string;
  evidenceUrl: string | null;
  capturedAt: string;
  likeCount: number;
  dislikeCount: number;
  viewerVote: "LIKE" | "DISLIKE" | null;
  isOwnCollection: boolean;
};

type NearbyResponse = {
  violations: NearbyViolation[];
};

export function NearbyScreen() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    authStorage.getAccessToken().then(setAccessToken).catch(() => setAccessToken(null));
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      return;
    }

    let active = true;
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((position) => {
        if (active) {
          setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      })
      .catch(() => {
        if (active) {
          setLocationError("RoadWatch could not read your foreground location.");
        }
      });

    return () => {
      active = false;
    };
  }, [permission?.granted]);

  const path = coordinates
    ? buildNearbyViolationsPath({
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      })
    : null;
  const resource = useApiResource<NearbyResponse>(path);

  async function voteOnViolation(
    observationId: string,
    kind: "LIKE" | "DISLIKE",
  ) {
    setVoteBusy(`${observationId}:${kind}`);
    setVoteError(null);

    try {
      await getApiClient().post(`/violations/${observationId}/vote`, { kind });
      resource.reload();
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : "RoadWatch could not save your vote.");
    } finally {
      setVoteBusy(null);
    }
  }

  function evidenceUri(pathname: string | null) {
    if (!pathname) {
      return null;
    }

    if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
      return pathname;
    }

    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    return baseUrl ? `${baseUrl}${pathname}` : null;
  }

  return (
    <ScreenShell
      eyebrow="Approved road record"
      title="Nearby catches"
      description="See approved, unresolved static issues on nearby roads. Pending evidence and resident identity stay private."
    >
      {!permission?.granted ? (
        <StatusCard label="Location needed" tone="warning">
          <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
            Nearby catches use foreground location only. Background tracking is never requested.
          </Text>
          <PrimaryButton
            label="Allow foreground location"
            onPress={() => {
              void requestPermission();
            }}
            variant="secondary"
          />
        </StatusCard>
      ) : null}
      {locationError ? (
        <StatusCard label="Location unavailable" tone="warning">
          <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>{locationError}</Text>
        </StatusCard>
      ) : null}
      {voteError ? (
        <StatusCard label="Vote unavailable" tone="warning">
          <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>{voteError}</Text>
        </StatusCard>
      ) : null}
      {path && resource.status === "loading" ? (
        <StatusCard label="Loading" value="Finding nearby roads" />
      ) : null}
      {path && resource.status === "error" ? (
        <StatusCard label="Connection needed" tone="warning">
          <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
            {resource.error}
          </Text>
          <PrimaryButton label="Try again" onPress={resource.reload} variant="secondary" />
        </StatusCard>
      ) : null}
      {resource.status === "ready" && resource.data.violations.length === 0 ? (
        <StatusCard label="Clear road" value="No approved open catches nearby" tone="accent" />
      ) : null}
      {resource.status === "ready"
        ? resource.data.violations.map((item) => (
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
                  alt={`${item.issueLabel} evidence photo`}
                  accessibilityLabel={`${item.issueLabel} evidence photo`}
                  contentFit="cover"
                  style={{ height: 190, borderRadius: 14, backgroundColor: colors.background }}
                />
              ) : (
                <View
                  style={{
                    height: 120,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    backgroundColor: colors.background,
                  }}
                >
                  <Text selectable style={{ color: colors.muted }}>Evidence image unavailable</Text>
                </View>
              )}
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "800" }}>
                {item.issueLabel}
              </Text>
              <Text selectable style={{ color: colors.muted }}>
                {item.road.name}
              </Text>
              <Text selectable style={{ color: colors.accent, fontVariant: ["tabular-nums"] }}>
                {Math.round(item.distanceMeters)} m away
              </Text>
              <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
                {item.description}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                Confirmed {item.likeCount} · disputed {item.dislikeCount} · captured {item.capturedAt}
              </Text>
              {item.isOwnCollection ? (
                <Text selectable style={{ color: colors.warning, fontSize: 13 }}>
                  You collected this issue. Other residents can confirm or dispute it.
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm this issue is real"
                  disabled={voteBusy !== null || item.isOwnCollection}
                  onPress={() => void voteOnViolation(item.id, "LIKE")}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: item.viewerVote === "LIKE" ? colors.accent : colors.surfaceRaised,
                    opacity: voteBusy !== null || item.isOwnCollection ? 0.5 : pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{ color: item.viewerVote === "LIKE" ? colors.accentInk : colors.ink, fontWeight: "800" }}>
                    {voteBusy === `${item.id}:LIKE` ? "Saving..." : "Confirm real"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dispute this issue"
                  disabled={voteBusy !== null || item.isOwnCollection}
                  onPress={() => void voteOnViolation(item.id, "DISLIKE")}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: item.viewerVote === "DISLIKE" ? colors.danger : colors.surfaceRaised,
                    opacity: voteBusy !== null || item.isOwnCollection ? 0.5 : pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{ color: colors.ink, fontWeight: "800" }}>
                    {voteBusy === `${item.id}:DISLIKE` ? "Saving..." : "Dispute"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        : null}
    </ScreenShell>
  );
}
