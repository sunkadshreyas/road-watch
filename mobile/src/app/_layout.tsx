import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

import { LaunchGate } from "@/components/launch-gate";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
        <Stack.Screen name="onboarding" options={{ presentation: "modal" }} />
        <Stack.Screen name="permissions" options={{ presentation: "modal" }} />
      </Stack>
      <LaunchGate />
    </>
  );
}
