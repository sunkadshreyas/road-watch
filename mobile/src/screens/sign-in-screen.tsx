import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { getApiClient } from "@/lib/api";
import { authStorage } from "@/lib/auth-storage";
import { colors } from "@/theme/colors";

type SessionResponse = {
  accessToken: string;
};

export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);

    try {
      const session = await getApiClient().post<SessionResponse>("/auth/session", {
        email: email.trim(),
      });
      await authStorage.setAccessToken(session.accessToken);
      const completedOnboarding = await authStorage.hasCompletedOnboarding();
      router.replace(completedOnboarding ? "/permissions" : "/onboarding");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "RoadWatch could not sign you in.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        gap: 20,
        backgroundColor: colors.background,
        padding: 24,
      }}
    >
      <Text selectable style={{ color: colors.accent, fontWeight: "800", letterSpacing: 1.5 }}>
        RESIDENT SIGN IN
      </Text>
      <Text selectable style={{ color: colors.ink, fontSize: 34, fontWeight: "800" }}>
        Return to the camera
      </Text>
      <Text selectable style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
        Sign in through the production identity boundary. Government accounts use the web admin.
      </Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        onChangeText={setEmail}
        placeholder="resident@example.com"
        placeholderTextColor={colors.muted}
        value={email}
        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          color: colors.ink,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
        }}
      />
      <PrimaryButton
        label="Continue securely"
        onPress={signIn}
        disabled={!email.trim()}
        busy={busy}
      />
      {error ? (
        <Text selectable accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 21 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
