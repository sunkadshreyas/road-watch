import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { useApiResource } from "@/hooks/use-api-resource";
import { buildNearbyViolationsPath } from "@/lib/nearby-request";
import { colors } from "@/theme/colors";

type NearbyViolation = {
  id: string;
  issueLabel: string;
  distanceMeters: number;
  road: {
    name: string;
  };
};

type NearbyResponse = {
  violations: NearbyViolation[];
};

export function NearbyScreen() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "800" }}>
                {item.issueLabel}
              </Text>
              <Text selectable style={{ color: colors.muted }}>
                {item.road.name}
              </Text>
              <Text selectable style={{ color: colors.accent, fontVariant: ["tabular-nums"] }}>
                {Math.round(item.distanceMeters)} m away
              </Text>
            </View>
          ))
        : null}
    </ScreenShell>
  );
}
