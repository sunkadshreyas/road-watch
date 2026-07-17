import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { authStorage } from "@/lib/auth-storage";
import { colors } from "@/theme/colors";

const safetyRules = [
  "Capture only static issues from a safe pedestrian position.",
  "Never capture while driving, cycling, or crossing traffic.",
  "Never follow or confront a person or vehicle.",
  "Do not enter private property or frame people intentionally.",
] as const;

export function OnboardingScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function acceptSafetyRules() {
    setBusy(true);
    await authStorage.setOnboardingComplete();
    router.replace("/permissions");
  }

  return (
    <ScreenShell
      eyebrow="Before your first catch"
      title="Collect safely"
      description="RoadWatch rewards useful civic evidence only after government review. No capture is worth entering danger."
    >
      <View style={{ gap: 12 }}>
        {safetyRules.map((rule, index) => (
          <View
            key={rule}
            style={{
              flexDirection: "row",
              gap: 12,
              borderRadius: 18,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              padding: 16,
            }}
          >
            <Text selectable style={{ color: colors.accent, fontWeight: "900" }}>
              {index + 1}
            </Text>
            <Text selectable style={{ flex: 1, color: colors.ink, lineHeight: 21 }}>
              {rule}
            </Text>
          </View>
        ))}
      </View>
      <PrimaryButton label="I understand, continue" onPress={acceptSafetyRules} busy={busy} />
    </ScreenShell>
  );
}
