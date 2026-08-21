type CameraRuntimeInput = {
  demoMode: string | undefined;
  simulatorCamera: string | undefined;
  nativeCameraReady: boolean;
  isDevice: boolean;
};

type CameraRuntime = {
  captureReady: boolean;
  simulated: boolean;
};

export function resolveCameraRuntime(input: CameraRuntimeInput): CameraRuntime {
  const simulated =
    !input.isDevice &&
    input.demoMode === "1" &&
    input.simulatorCamera === "1";

  return {
    captureReady: simulated || input.nativeCameraReady,
    simulated,
  };
}

export function captureControlsBottomPadding(safeAreaBottom: number): number {
  return Math.max(0, safeAreaBottom) + 110;
}
