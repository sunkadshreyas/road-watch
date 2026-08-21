import { useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/primary-button";
import {
  captureControlsBottomPadding,
  resolveCameraRuntime,
} from "@/lib/camera-runtime";
import { createIdempotencyKey, newQueuedCapture } from "@/lib/offline-queue";
import { appendCapture, persistEvidencePhoto } from "@/lib/queue-storage";
import { colors } from "@/theme/colors";

type CapturedFrame = {
  imageUri: string;
  latitude: number;
  longitude: number;
};

const issueTypes = [
  "POTHOLE",
  "BROKEN_FOOTPATH",
  "MISSING_STREET_LIGHT",
  "UNAUTHORIZED_PARKING",
  "VENDOR_ENCROACHMENT",
  "FOOTPATH_BLOCKED",
] as const;

function vibrate(kind: "selection" | "success") {
  if (process.env.EXPO_OS !== "ios") {
    return Promise.resolve();
  }

  return kind === "success"
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.selectionAsync();
}

function SimulatorCameraPreview() {
  return (
    <View
      accessibilityLabel="Simulated road camera preview"
      pointerEvents="none"
      style={{ flex: 1, overflow: "hidden", backgroundColor: "#86c9d4" }}
    >
      <View
        style={{
          position: "absolute",
          top: "34%",
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: "#45545c",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "42%",
          right: 0,
          left: 0,
          height: 18,
          backgroundColor: "#d5d0ba",
        }}
      />
      {[0, 1, 2, 3].map((marker) => (
        <View
          key={marker}
          style={{
            position: "absolute",
            top: `${50 + marker * 13}%`,
            left: "48%",
            width: 12 + marker * 4,
            height: 34 + marker * 12,
            borderRadius: 6,
            backgroundColor: "#f7e36d",
          }}
        />
      ))}
      <View
        style={{
          position: "absolute",
          right: "16%",
          bottom: "20%",
          width: 118,
          height: 58,
          borderRadius: 999,
          backgroundColor: "#202a2e",
          borderWidth: 8,
          borderColor: "#34434a",
          transform: [{ rotate: "-8deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "38%",
          left: 24,
          borderRadius: 999,
          backgroundColor: "rgba(7, 20, 31, 0.78)",
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: "800", letterSpacing: 0.8 }}>
          SIMULATOR CAMERA
        </Text>
      </View>
    </View>
  );
}

export function CaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [stationary, setStationary] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<CapturedFrame | null>(null);
  const [roadId, setRoadId] = useState("");
  const [issueTypeIndex, setIssueTypeIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Stop in a safe pedestrian area before collecting an issue.",
  );
  const cameraRuntime = resolveCameraRuntime({
    demoMode: process.env.EXPO_PUBLIC_DEMO_MODE,
    simulatorCamera: process.env.EXPO_PUBLIC_SIMULATOR_CAMERA,
    nativeCameraReady: cameraReady,
    isDevice: Device.isDevice,
  });

  const permissionsReady =
    cameraPermission?.granted === true && locationPermission?.granted === true;

  async function requestPermissions() {
    setBusy(true);
    const [cameraResult, locationResult] = await Promise.all([
      requestCameraPermission(),
      requestLocationPermission(),
    ]);
    setBusy(false);

    if (!cameraResult.granted || !locationResult.granted) {
      setMessage("Camera and foreground location are required for a GPS-backed capture.");
    }
  }

  async function takePicture() {
    if (!cameraRef.current || !cameraRuntime.captureReady || !stationary) {
      return;
    }

    setBusy(true);
    setMessage("Locking the photo and foreground location.");

    try {
      await vibrate("selection");
      const [picture, position] = await Promise.all([
        cameraRef.current.takePictureAsync({ quality: 0.78, skipProcessing: false }),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      ]);

      if (!picture?.uri) {
        throw new Error("The camera did not return an image.");
      }

      setCapturedFrame({
        imageUri: picture.uri,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setMessage("Capture locked. Confirm the road record or save it for later matching.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "RoadWatch could not capture this frame.");
    } finally {
      setBusy(false);
    }
  }

  async function queueCapture() {
    if (!capturedFrame) {
      return;
    }

    setBusy(true);
    const idempotencyKey = createIdempotencyKey();

    try {
      const imageUri = await persistEvidencePhoto(
        capturedFrame.imageUri,
        idempotencyKey,
      );
      await appendCapture(
        newQueuedCapture(
          {
            imageUri,
            roadId: roadId.trim(),
            issueType: issueTypes[issueTypeIndex],
            latitude: capturedFrame.latitude,
            longitude: capturedFrame.longitude,
          },
          { idempotencyKey },
        ),
      );
      await vibrate("success");
      setCapturedFrame(null);
      setRoadId("");
      setStationary(false);
      setMessage(
        roadId.trim()
          ? "Saved to the offline queue with one upload key."
          : "Saved locally. Match a road before this capture can upload.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The capture could not be queued.");
    } finally {
      setBusy(false);
    }
  }

  function retakePicture() {
    setCapturedFrame(null);
    setMessage("Ready for another safe capture.");
  }

  if (!permissionsReady) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 20, padding: 24 }}
      >
        <Text selectable style={{ color: colors.accent, fontWeight: "800", letterSpacing: 1.4 }}>
          CAMERA FIRST
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 34, fontWeight: "800" }}>
          Catch a static road issue
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 17, lineHeight: 25 }}>
          RoadWatch needs the back camera and foreground location. It never requests background
          location for this capture flow.
        </Text>
        <PrimaryButton label="Allow camera and location" onPress={requestPermissions} busy={busy} />
        <Link href="/permissions" asChild>
          <Pressable accessibilityRole="button" style={{ padding: 12 }}>
            <Text style={{ color: colors.accent, textAlign: "center", fontWeight: "700" }}>
              Open permission recovery
            </Text>
          </Pressable>
        </Link>
        <Text selectable style={{ color: colors.warning, lineHeight: 20 }}>
          {message}
        </Text>
      </ScrollView>
    );
  }

  if (capturedFrame) {
    return (
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <Image
          source={{ uri: capturedFrame.imageUri }}
          alt="Captured static road issue"
          accessibilityLabel="Captured road issue preview"
          contentFit="cover"
          style={{ flex: 1 }}
        />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ position: "absolute", inset: 0 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            gap: 12,
            paddingTop: insets.top + 16,
            paddingHorizontal: 18,
            paddingBottom: captureControlsBottomPadding(insets.bottom),
          }}
        >
          <View
            style={{
              gap: 12,
              borderRadius: 24,
              borderCurve: "continuous",
              backgroundColor: "rgba(7, 20, 31, 0.94)",
              padding: 16,
            }}
          >
            <Text selectable style={{ color: colors.ink, fontSize: 22, fontWeight: "800" }}>
              Review the catch
            </Text>
            <Text selectable style={{ color: colors.muted }}>
              GPS {capturedFrame.latitude.toFixed(5)}, {capturedFrame.longitude.toFixed(5)}
            </Text>
            <TextInput
              accessibilityLabel="Road record ID"
              autoCapitalize="none"
              onChangeText={setRoadId}
              placeholder="Road record ID, optional while offline"
              placeholderTextColor={colors.muted}
              value={roadId}
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                color: colors.ink,
                paddingHorizontal: 14,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change issue type"
              onPress={() => setIssueTypeIndex((index) => (index + 1) % issueTypes.length)}
              style={{
                minHeight: 48,
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
              }}
            >
              <Text selectable style={{ color: colors.ink, fontWeight: "700" }}>
                {issueTypes[issueTypeIndex].replaceAll("_", " ")}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Retake"
                  variant="secondary"
                  onPress={retakePicture}
                  disabled={busy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Save catch" onPress={queueCapture} busy={busy} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {cameraRuntime.simulated ? <SimulatorCameraPreview /> : null}
      <CameraView
        ref={cameraRef}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
        style={
          cameraRuntime.simulated
            ? { position: "absolute", width: 1, height: 1, opacity: 0 }
            : { flex: 1 }
        }
      />
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          inset: 0,
          justifyContent: "space-between",
          paddingTop: insets.top + 14,
          paddingHorizontal: 18,
          paddingBottom: captureControlsBottomPadding(insets.bottom),
        }}
      >
        <View
          style={{
            gap: 6,
            alignSelf: "stretch",
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: "rgba(7, 20, 31, 0.82)",
            padding: 14,
          }}
        >
          <Text selectable style={{ color: colors.accent, fontWeight: "800" }}>
            ROAD MATCH READY AFTER CAPTURE
          </Text>
          <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "700" }}>
            Static issues only. Never enter traffic or follow a vehicle.
          </Text>
          <Text selectable style={{ color: colors.muted }}>
            {message}
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: 14 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: stationary }}
            onPress={() => setStationary((value) => !value)}
            style={{
              borderRadius: 999,
              backgroundColor: stationary ? colors.accent : "rgba(7, 20, 31, 0.82)",
              paddingHorizontal: 18,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: stationary ? colors.accentInk : colors.ink, fontWeight: "800" }}>
              {stationary ? "Stationary and safe" : "Confirm you are safely stopped"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture road issue"
            disabled={!cameraRuntime.captureReady || !stationary || busy}
            onPress={takePicture}
            style={({ pressed }) => ({
              width: 82,
              height: 82,
              borderRadius: 999,
              borderWidth: 7,
              borderColor: "white",
              backgroundColor: colors.accent,
              opacity:
                !cameraRuntime.captureReady || !stationary || busy
                  ? 0.4
                  : pressed
                    ? 0.75
                    : 1,
            })}
          />
        </View>
      </View>
    </View>
  );
}
