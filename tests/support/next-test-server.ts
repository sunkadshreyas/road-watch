import {
  execFile,
  spawn,
  type ChildProcess,
} from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import {
  getIsolatedNextDistDir,
  getIsolatedNextTsconfigPath,
  terminateChild,
} from "../../scripts/process-lifecycle.mjs";

export const govSessionCookie = "roadwatch-demo-session=cmosvmckg0003a0x9w00v5n90";
export const residentASessionCookie =
  "roadwatch-demo-session=cmosvmckd0001a0x96kzti3b5";
export const residentBSessionCookie =
  "roadwatch-demo-session=cmosvmcke0002a0x944kgm914";

const execFileAsync = promisify(execFile);

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

export function parseFormContaining(
  html: string,
  fieldName: string,
  fieldValue?: string,
) {
  const forms = [...html.matchAll(/<form[^>]*>[\s\S]*?<\/form>/g)].map(
    (match) => match[0],
  );
  const form = forms.find((candidate) => {
    const hasName = candidate.includes(`name="${fieldName}"`);
    const hasValue =
      fieldValue == null || candidate.includes(`value="${fieldValue}"`);

    return hasName && hasValue;
  });

  if (!form) {
    throw new Error(
      `Expected a form containing ${fieldName}${fieldValue == null ? "" : `=${fieldValue}`}.`,
    );
  }

  return Object.fromEntries(
    [...form.matchAll(
      /<input[^>]+type="hidden"[^>]+name="([^"]+)"(?:[^>]+value="([^"]*)")?[^>]*>/g,
    )].map((match) => [match[1], decodeHtmlAttribute(match[2] ?? "")]),
  );
}

async function waitForHttpReady(baseUrl: string, getServerOutput: () => string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the dev server is ready to serve requests.
    }

    await delay(500);
  }

  throw new Error(
    `Timed out waiting for the dev server.\nRecent server output:\n${getServerOutput()}`,
  );
}

async function stopServer(server: ChildProcess) {
  await terminateChild(server);
}

export async function startNextTestServer(prefix = "roadwatch-test-") {
  const repoRoot = process.cwd();
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  const dbPath = join(tempDir, "dev.db");
  const port = 31_200 + Math.floor(Math.random() * 500);
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextDistDir = getIsolatedNextDistDir("e2e", port);
  const nextDistPath = join(repoRoot, nextDistDir);
  const nextTsconfigName = getIsolatedNextTsconfigPath("e2e", port);
  const nextTsconfigPath = join(repoRoot, nextTsconfigName);
  const serverEnvironment = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
    ROADWATCH_NEXT_DIST_DIR: nextDistDir,
    ROADWATCH_TSCONFIG_PATH: nextTsconfigName,
  };

  await writeFile(dbPath, "");
  await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
    cwd: repoRoot,
    env: serverEnvironment,
    maxBuffer: 10 * 1024 * 1024,
  });
  await execFileAsync("node", ["--import", "tsx", "prisma/seed.ts"], {
    cwd: repoRoot,
    env: serverEnvironment,
    maxBuffer: 10 * 1024 * 1024,
  });
  await writeFile(nextTsconfigPath, '{"extends":"./tsconfig.json"}\n');

  let serverOutput = "";
  const server = spawn(
    process.execPath,
    [
      join(repoRoot, "node_modules", "next", "dist", "bin", "next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: repoRoot,
      env: serverEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const captureOutput = (chunk: Buffer | string) => {
    serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8_000);
  };

  server.stdout.on("data", captureOutput);
  server.stderr.on("data", captureOutput);

  try {
    await waitForHttpReady(baseUrl, () => serverOutput);
  } catch (error) {
    await stopServer(server);
    await rm(tempDir, { recursive: true, force: true });
    await rm(nextDistPath, { recursive: true, force: true });
    await rm(nextTsconfigPath, { force: true });
    throw error;
  }

  return {
    baseUrl,
    dbPath,
    repoRoot,
    get serverOutput() {
      return serverOutput;
    },
    async stop() {
      await stopServer(server);
      await rm(tempDir, { recursive: true, force: true });
      await rm(nextDistPath, { recursive: true, force: true });
      await rm(nextTsconfigPath, { force: true });
    },
  };
}
