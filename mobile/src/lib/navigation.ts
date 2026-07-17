export type PermissionState = "granted" | "denied" | "undetermined";

export type LaunchState = {
  hasSession: boolean;
  completedOnboarding: boolean;
  cameraPermission: PermissionState;
  locationPermission: PermissionState;
};

export const residentTabs = [
  { href: "/", label: "Capture", routeName: "index" },
  { href: "/nearby", label: "Nearby", routeName: "nearby" },
  { href: "/collection", label: "Collection", routeName: "collection" },
  { href: "/leaderboard", label: "Leaderboard", routeName: "leaderboard" },
  { href: "/profile", label: "Profile", routeName: "profile" },
] as const;

export type LaunchRoute = "/" | "/sign-in" | "/onboarding" | "/permissions";

export function isResidentTabPath(pathname: string): boolean {
  return residentTabs.some((tab) => tab.href === pathname);
}

export function resolveLaunchRoute(state: LaunchState): LaunchRoute {
  if (!state.hasSession) {
    return "/sign-in";
  }

  if (!state.completedOnboarding) {
    return "/onboarding";
  }

  if (
    state.cameraPermission !== "granted" ||
    state.locationPermission !== "granted"
  ) {
    return "/permissions";
  }

  return "/";
}
