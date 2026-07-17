import * as SecureStore from "expo-secure-store";

const accessTokenKey = "roadwatch.access-token";
const onboardingKey = "roadwatch.onboarding-complete";

// Unsigned simulator builds do not have the keychain entitlement. This fallback
// is intentionally in-memory and only enabled by the local demo environment.
const localDevelopmentValues = new Map<string, string>();

function canUseLocalDevelopmentFallback(error: unknown): boolean {
  return (
    process.env.EXPO_PUBLIC_DEMO_MODE === "1" &&
    error instanceof Error &&
    error.message.toLowerCase().includes("entitlement")
  );
}

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    if (canUseLocalDevelopmentFallback(error)) {
      return localDevelopmentValues.get(key) ?? null;
    }

    throw error;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    if (canUseLocalDevelopmentFallback(error)) {
      localDevelopmentValues.set(key, value);
      return;
    }

    throw error;
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    if (canUseLocalDevelopmentFallback(error)) {
      localDevelopmentValues.delete(key);
      return;
    }

    throw error;
  }
}

export const authStorage = {
  getAccessToken() {
    return getItem(accessTokenKey);
  },
  setAccessToken(token: string) {
    return setItem(accessTokenKey, token);
  },
  clearAccessToken() {
    return deleteItem(accessTokenKey);
  },
  async hasCompletedOnboarding() {
    return (await getItem(onboardingKey)) === "true";
  },
  setOnboardingComplete() {
    return setItem(onboardingKey, "true");
  },
};
