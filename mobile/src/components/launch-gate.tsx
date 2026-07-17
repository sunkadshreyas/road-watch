import { useEffect, useState } from "react";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import { usePathname, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { authStorage } from "@/lib/auth-storage";
import {
  isResidentTabPath,
  resolveLaunchRoute,
  type PermissionState,
} from "@/lib/navigation";
import { colors } from "@/theme/colors";

export function LaunchGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [verifiedResidentAccess, setVerifiedResidentAccess] = useState(false);
  const checking = isResidentTabPath(pathname) && !verifiedResidentAccess;

  useEffect(() => {
    if (!isResidentTabPath(pathname) || verifiedResidentAccess) {
      return;
    }

    let active = true;

    Promise.all([
      authStorage.getAccessToken(),
      authStorage.hasCompletedOnboarding(),
      Camera.getCameraPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
    ])
      .then(([token, completedOnboarding, camera, location]) => {
        if (!active) {
          return;
        }

        const destination = resolveLaunchRoute({
          hasSession: Boolean(token),
          completedOnboarding,
          cameraPermission: camera.status as PermissionState,
          locationPermission: location.status as PermissionState,
        });

        if (destination === "/") {
          setVerifiedResidentAccess(true);
        } else {
          router.replace(destination);
        }
      })
      .catch(() => {
        if (active) {
          router.replace("/permissions");
        }
      });

    return () => {
      active = false;
    };
  }, [pathname, router, verifiedResidentAccess]);

  if (!checking) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.accent} size="large" />
      <Text selectable style={{ color: colors.muted }}>
        Preparing your safe capture session
      </Text>
    </View>
  );
}
