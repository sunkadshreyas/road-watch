import assert from "node:assert/strict";
import test from "node:test";

import {
  automationBackend,
  automationBackendConstraint,
  requestedAutomationBackend,
  resolveMobileVerificationTarget,
} from "../scripts/mobile-verification-config.mjs";

test("mobile verification report identifies the repository Playwright runner", () => {
  assert.equal(requestedAutomationBackend, "playwright");
  assert.equal(automationBackend, "playwright");
  assert.equal(automationBackendConstraint, null);
});

test("mobile verification uses an isolated random port unless a target is explicit", () => {
  assert.deepEqual(resolveMobileVerificationTarget(undefined, 0), {
    baseUrl: "http://127.0.0.1:32000",
    mayReuseExistingServer: false,
  });
  assert.deepEqual(
    resolveMobileVerificationTarget("http://localhost:4100", 0.5),
    {
      baseUrl: "http://localhost:4100",
      mayReuseExistingServer: true,
    },
  );
});
