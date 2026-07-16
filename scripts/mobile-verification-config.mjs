export const requestedAutomationBackend = "playwright";
export const automationBackend = "playwright";
export const automationBackendConstraint = null;

export function resolveMobileVerificationTarget(
  explicitBaseUrl,
  randomValue = Math.random(),
) {
  if (explicitBaseUrl) {
    return {
      baseUrl: explicitBaseUrl,
      mayReuseExistingServer: true,
    };
  }

  const port = 32_000 + Math.floor(randomValue * 1_000);

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    mayReuseExistingServer: false,
  };
}
