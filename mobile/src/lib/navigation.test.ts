import assert from "node:assert/strict";
import test from "node:test";

import { isResidentTabPath, residentTabs, resolveLaunchRoute } from "./navigation";

test("capture is the default resident tab", () => {
  assert.deepEqual(residentTabs[0], {
    href: "/",
    label: "Capture",
    routeName: "index",
  });
});

test("launch routing keeps authenticated ready residents on capture", () => {
  assert.equal(
    resolveLaunchRoute({
      hasSession: true,
      completedOnboarding: true,
      cameraPermission: "granted",
      locationPermission: "granted",
    }),
    "/",
  );
});

test("launch routing prioritizes auth, onboarding, then permissions", () => {
  assert.equal(
    resolveLaunchRoute({
      hasSession: false,
      completedOnboarding: false,
      cameraPermission: "undetermined",
      locationPermission: "undetermined",
    }),
    "/sign-in",
  );
  assert.equal(
    resolveLaunchRoute({
      hasSession: true,
      completedOnboarding: false,
      cameraPermission: "granted",
      locationPermission: "granted",
    }),
    "/onboarding",
  );
  assert.equal(
    resolveLaunchRoute({
      hasSession: true,
      completedOnboarding: true,
      cameraPermission: "denied",
      locationPermission: "granted",
    }),
    "/permissions",
  );
});

test("launch guard applies to resident tabs but not recovery routes", () => {
  assert.equal(isResidentTabPath("/"), true);
  assert.equal(isResidentTabPath("/nearby"), true);
  assert.equal(isResidentTabPath("/profile"), true);
  assert.equal(isResidentTabPath("/sign-in"), false);
  assert.equal(isResidentTabPath("/permissions"), false);
});
