import assert from "node:assert/strict";
import test from "node:test";

import {
  captureControlsBottomPadding,
  resolveCameraRuntime,
} from "./camera-runtime";

test("local simulator capture is ready without a native camera-ready event", () => {
  assert.deepEqual(
    resolveCameraRuntime({
      demoMode: "1",
      simulatorCamera: "1",
      nativeCameraReady: false,
      isDevice: false,
    }),
    {
      captureReady: true,
      simulated: true,
    },
  );
});

test("production capture still requires the native camera-ready event", () => {
  assert.deepEqual(
    resolveCameraRuntime({
      demoMode: undefined,
      simulatorCamera: "1",
      nativeCameraReady: false,
      isDevice: true,
    }),
    {
      captureReady: false,
      simulated: false,
    },
  );
});

test("physical demo builds cannot enable the simulator camera", () => {
  const physicalDemoRuntime = {
    demoMode: "1",
    simulatorCamera: "1",
    nativeCameraReady: false,
    isDevice: true,
  };

  assert.deepEqual(resolveCameraRuntime(physicalDemoRuntime), {
    captureReady: false,
    simulated: false,
  });
});

test("capture controls clear the native tab bar and safe area", () => {
  assert.equal(captureControlsBottomPadding(34), 144);
});
