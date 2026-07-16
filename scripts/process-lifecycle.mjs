export function childHasExited(child) {
  return child.exitCode != null || child.signalCode != null;
}

function waitForExit(child, timeoutMs) {
  if (childHasExited(child)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer;

    const finish = (exited) => {
      if (settled) {
        return;
      }

      settled = true;
      child.off("exit", onExit);
      clearTimeout(timer);
      resolve(exited);
    };
    const onExit = () => finish(true);

    child.once("exit", onExit);
    timer = setTimeout(() => finish(childHasExited(child)), timeoutMs);
  });
}

export async function terminateChild(
  child,
  { graceMs = 5_000, forceMs = 5_000 } = {},
) {
  if (childHasExited(child)) {
    return;
  }

  const gracefulExit = waitForExit(child, graceMs);
  child.kill("SIGTERM");

  if (await gracefulExit || childHasExited(child)) {
    return;
  }

  const forcedExit = waitForExit(child, forceMs);
  child.kill("SIGKILL");
  await forcedExit;
}

export function getIsolatedNextDistDir(label, port, pid = process.pid) {
  const safeLabel = String(label).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const safePort = String(port).replace(/[^0-9]/g, "");

  return `.next-roadwatch-${safeLabel}-${pid}-${safePort}`;
}

export function getIsolatedNextTsconfigPath(label, port, pid = process.pid) {
  const safeLabel = String(label).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const safePort = String(port).replace(/[^0-9]/g, "");

  return `.roadwatch-tsconfig-${safeLabel}-${pid}-${safePort}.json`;
}
