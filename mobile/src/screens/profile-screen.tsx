import { Link, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatusCard } from "@/components/status-card";
import { authStorage } from "@/lib/auth-storage";
import { colors } from "@/theme/colors";

const profileLinks = [
  { href: "/onboarding" as const, label: "Safety onboarding" },
  { href: "/permissions" as const, label: "Permission recovery" },
] as const;

export function ProfileScreen() {
  const router = useRouter();

  async function signOut() {
    await authStorage.clearAccessToken();
    router.replace("/sign-in");
  }

  return (
    <ScreenShell
      eyebrow="Resident account"
      title="Profile"
      description="Manage safety guidance, capture permissions, and your authenticated resident session."
    >
      <StatusCard label="Privacy posture" value="Public alias only" tone="accent">
        <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
          Public road views must not expose your email, precise movement history, pending evidence,
          or original photos.
        </Text>
      </StatusCard>
      <View style={{ gap: 10 }}>
        {profileLinks.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable
              accessibilityRole="button"
              style={{
                minHeight: 52,
                justifyContent: "center",
                borderRadius: 16,
                borderCurve: "continuous",
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "700" }}>
                {item.label}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <PrimaryButton label="Sign out" onPress={signOut} variant="secondary" />
    </ScreenShell>
  );
}
