import * as SecureStore from "expo-secure-store";

const accessTokenKey = "roadwatch.access-token";
const onboardingKey = "roadwatch.onboarding-complete";

export const authStorage = {
  getAccessToken() {
    return SecureStore.getItemAsync(accessTokenKey);
  },
  setAccessToken(token: string) {
    return SecureStore.setItemAsync(accessTokenKey, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  clearAccessToken() {
    return SecureStore.deleteItemAsync(accessTokenKey);
  },
  async hasCompletedOnboarding() {
    return (await SecureStore.getItemAsync(onboardingKey)) === "true";
  },
  setOnboardingComplete() {
    return SecureStore.setItemAsync(onboardingKey, "true", {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
};
