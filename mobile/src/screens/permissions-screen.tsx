import { useState } from "react";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Linking, Text } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { colors } from "@/theme/colors";

export function PermissionsScreen() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();
  const [busy, setBusy] = useState(false);

  const cameraGranted = cameraPermission?.granted === true;
  const locationGranted = locationPermission?.granted === true;
  const ready = cameraGranted && locationGranted;

  async function requestRequiredPermissions() {
    setBusy(true);
    const [cameraResult, locationResult] = await Promise.all([
      requestCameraPermission(),
      requestLocationPermission(),
    ]);
    setBusy(false);

    if (cameraResult.granted && locationResult.granted) {
      router.replace("/");
    }
  }

  return (
    <ScreenShell
      eyebrow="Permission recovery"
      title="Camera and location"
      description="RoadWatch uses the camera and foreground location only for a live, GPS-backed capture. Background location is not requested."
    >
      <StatusCard
        label="Camera"
        value={cameraGranted ? "Ready" : cameraPermission?.status ?? "Not requested"}
        tone={cameraGranted ? "accent" : "warning"}
      />
      <StatusCard
        label="Foreground location"
        value={locationGranted ? "Ready" : locationPermission?.status ?? "Not requested"}
        tone={locationGranted ? "accent" : "warning"}
      />
      <PrimaryButton
        label={ready ? "Open camera" : "Request required permissions"}
        onPress={ready ? () => router.dismissTo("/") : requestRequiredPermissions}
        busy={busy}
      />
      {!ready &&
      (cameraPermission?.canAskAgain === false || locationPermission?.canAskAgain === false) ? (
        <>
          <Text selectable style={{ color: colors.warning, lineHeight: 21 }}>
            One permission cannot be requested again in the app. Open system settings to recover it.
          </Text>
          <PrimaryButton
            label="Open system settings"
            onPress={() => Linking.openSettings()}
            variant="secondary"
          />
        </>
      ) : null}
    </ScreenShell>
  );
}
