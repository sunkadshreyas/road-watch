import { createApiClient } from "@/lib/api-client";
import { authStorage } from "@/lib/auth-storage";

export function getApiClient() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("Set EXPO_PUBLIC_API_URL before connecting RoadWatch mobile.");
  }

  return createApiClient({
    baseUrl,
    getAccessToken: authStorage.getAccessToken,
  });
}
