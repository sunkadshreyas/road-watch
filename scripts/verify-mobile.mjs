#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { chromium } from "playwright";

import {
  automationBackend,
  automationBackendConstraint,
  requestedAutomationBackend,
  resolveMobileVerificationTarget,
} from "./mobile-verification-config.mjs";
import {
  getIsolatedNextDistDir,
  getIsolatedNextTsconfigPath,
  terminateChild,
} from "./process-lifecycle.mjs";

const verificationTarget = resolveMobileVerificationTarget(
  process.env.ROADWATCH_BASE_URL,
);
const baseUrl = verificationTarget.baseUrl;
const screenshotDir = process.env.ROADWATCH_SCREENSHOT_DIR ?? "/tmp";
const reportPath =
  process.env.ROADWATCH_MOBILE_REPORT ??
  `${screenshotDir.replace(/\/$/, "")}/roadwatch-mobile-report.json`;
const execFileAsync = promisify(execFile);
const serverUrl = new URL(baseUrl);
const host = serverUrl.hostname;
const port = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");
const cookieDomain = host.startsWith("[") && host.endsWith("]")
  ? host.slice(1, -1)
  : host;
const residentSession = "cmosvmckd0001a0x96kzti3b5";
const govSession = "cmosvmckg0003a0x9w00v5n90";

const mobileViewports = [
  {
    name: "narrow",
    width: 360,
    height: 800,
  },
  {
    name: "standard",
    width: 390,
    height: 844,
  },
];

const pages = [
  {
    name: "anonymous-road",
    persona: "anonymous",
    path: "/roads/100-feet-road",
    session: null,
    screenshot: "roadwatch-mobile-anonymous-road",
    mustInclude: ["Sign in as a resident", "COLLECTED VIOLATIONS"],
    mustNotInclude: ["Capture encounter", "Upvote", "Downvote", "Subscribe to RSS feed"],
  },
  {
    name: "resident-road",
    persona: "resident",
    path: "/roads/100-feet-road",
    session: residentSession,
    screenshot: "roadwatch-mobile-resident-road",
    mustInclude: ["Collect violation", "Upvote", "Downvote", "Subscribe to RSS feed"],
    mustNotInclude: ["Government repair crew"],
  },
  {
    name: "resident-report",
    persona: "resident",
    path: "/report",
    session: residentSession,
    screenshot: "roadwatch-mobile-resident-report",
    mustInclude: ["CAPTURE ENCOUNTER", "GPS", "Collect violation", "My collection", "Leaderboard"],
    mustNotInclude: ["Sign in as a resident"],
  },
  {
    name: "resident-collection",
    persona: "resident",
    path: "/collection",
    session: residentSession,
    screenshot: "roadwatch-mobile-resident-collection",
    mustInclude: ["LEVEL", "XP", "My collection", "GPS"],
    mustNotInclude: ["Government repair crew"],
  },
  {
    name: "resident-leaderboard",
    persona: "resident",
    path: "/leaderboard",
    session: residentSession,
    screenshot: "roadwatch-mobile-leaderboard",
    mustInclude: ["LEADERBOARD", "My collection", "COLLECTED"],
    mustNotInclude: ["Government repair crew"],
  },
  {
    name: "resident-account",
    persona: "resident",
    path: "/account",
    session: residentSession,
    screenshot: "roadwatch-mobile-resident-account",
    mustInclude: ["ACCOUNT", "Resident", "SUBSCRIBED ROADS", "Open RSS", "Street feed"],
    mustNotInclude: ["Gov repair crew"],
  },
  {
    name: "gov-road",
    persona: "government",
    path: "/roads/100-feet-road",
    session: govSession,
    screenshot: "roadwatch-mobile-gov-road",
    mustInclude: ["GOVERNMENT REPAIR CREW", "Open repair log", "Resident account required"],
    mustNotInclude: ["Upvote", "Downvote", "Subscribe to RSS feed"],
  },
  {
    name: "gov-repair",
    persona: "government",
    path: "/roads/metro-footpath-east/repairs/cart-stack-entrance",
    session: govSession,
    screenshot: "roadwatch-mobile-gov-repair",
    mustInclude: ["GOVERNMENT REPAIR WORKFLOW", "Update this violation", "Status"],
    mustNotInclude: ["Upvote", "Downvote"],
  },
  {
    name: "gov-account",
    persona: "government",
    path: "/account",
    session: govSession,
    screenshot: "roadwatch-mobile-gov-account",
    mustInclude: ["ACCOUNT", "Gov", "SUBSCRIBED ROADS"],
    mustNotInclude: ["My collection", "Leaderboard", "Open RSS", "Street feed"],
  },
];

function screenshotPath(fileName, viewportName) {
  return `${screenshotDir.replace(/\/$/, "")}/${fileName}-${viewportName}.png`;
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(getServerOutput) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (await isServerReady()) {
      return;
    }

    await delay(500);
  }

  throw new Error(
    `Timed out waiting for ${baseUrl}.\nRecent server output:\n${getServerOutput()}`,
  );
}

async function startServerIfNeeded() {
  if (verificationTarget.mayReuseExistingServer && await isServerReady()) {
    console.log(`Using running RoadWatch server at ${baseUrl}`);
    return {
      server: null,
      tempDir: null,
      databaseFixture: "external-server",
    };
  }

  const tempDir = await mkdtemp(join(tmpdir(), "roadwatch-mobile-"));
  const dbPath = join(tempDir, "dev.db");
  const nextDistDir = getIsolatedNextDistDir("mobile", port);
  const nextDistPath = join(process.cwd(), nextDistDir);
  const nextTsconfigName = getIsolatedNextTsconfigPath("mobile", port);
  const nextTsconfigPath = join(process.cwd(), nextTsconfigName);
  const serverEnvironment = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
    ROADWATCH_NEXT_DIST_DIR: nextDistDir,
    ROADWATCH_TSCONFIG_PATH: nextTsconfigName,
  };

  await writeFile(dbPath, "");

  try {
    await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      cwd: process.cwd(),
      env: serverEnvironment,
      maxBuffer: 10 * 1024 * 1024,
    });
    await execFileAsync("node", ["--import", "tsx", "prisma/seed.ts"], {
      cwd: process.cwd(),
      env: serverEnvironment,
      maxBuffer: 10 * 1024 * 1024,
    });
    await writeFile(nextTsconfigPath, '{"extends":"./tsconfig.json"}\n');
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    await rm(nextDistPath, { recursive: true, force: true });
    await rm(nextTsconfigPath, { force: true });
    throw error;
  }

  let serverOutput = "";
  const server = spawn(
    process.execPath,
    [
      join(process.cwd(), "node_modules", "next", "dist", "bin", "next"),
      "dev",
      "--hostname",
      host,
      "--port",
      port,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: serverEnvironment,
    },
  );

  const captureOutput = (chunk) => {
    serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8_000);
  };

  server.stdout.on("data", captureOutput);
  server.stderr.on("data", captureOutput);

  try {
    await waitForServer(() => serverOutput);
  } catch (error) {
    await terminateChild(server);
    await rm(tempDir, { recursive: true, force: true });
    await rm(nextDistPath, { recursive: true, force: true });
    await rm(nextTsconfigPath, { force: true });
    throw error;
  }
  console.log(`Started RoadWatch server at ${baseUrl}`);

  return {
    server,
    tempDir,
    nextDistPath,
    nextTsconfigPath,
    databaseFixture: "fresh-seed",
  };
}

async function stopServer(serverState) {
  if (serverState.server) {
    await terminateChild(serverState.server);
  }

  if (serverState.tempDir) {
    await rm(serverState.tempDir, { recursive: true, force: true });
  }

  if (serverState.nextDistPath) {
    await rm(serverState.nextDistPath, { recursive: true, force: true });
  }

  if (serverState.nextTsconfigPath) {
    await rm(serverState.nextTsconfigPath, { force: true });
  }
}

async function verifyPage(browser, pageSpec, viewport) {
  const context = await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  if (pageSpec.session) {
    await context.addCookies([
      {
        name: "roadwatch-demo-session",
        value: pageSpec.session,
        domain: cookieDomain,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(new URL(pageSpec.path, baseUrl).toString(), {
    waitUntil: "networkidle",
  });

  const screenshot = screenshotPath(pageSpec.screenshot, viewport.name);
  await page.screenshot({ path: screenshot, fullPage: true });

  const text = await page.locator("body").innerText();
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    mobileMapControlCount: window.innerWidth < 640
      ? document.querySelectorAll(".maplibregl-ctrl-group").length
      : 0,
  }));

  const failures = [];

  for (const expectedText of pageSpec.mustInclude) {
    if (!text.includes(expectedText)) {
      failures.push(`missing "${expectedText}"`);
    }
  }

  for (const blockedText of pageSpec.mustNotInclude) {
    if (text.includes(blockedText)) {
      failures.push(`unexpected "${blockedText}"`);
    }
  }

  if (layout.scrollWidth > layout.innerWidth + 1) {
    failures.push(`horizontal overflow ${layout.scrollWidth} > ${layout.innerWidth}`);
  }

  if (layout.mobileMapControlCount > 0) {
    failures.push(`mobile map controls visible (${layout.mobileMapControlCount})`);
  }

  if (consoleErrors.length > 0) {
    failures.push(`${consoleErrors.length} console error(s)`);
  }

  await context.close();

  return {
    ...pageSpec,
    viewport,
    screenshot,
    consoleErrors,
    failures,
    layout,
  };
}

const serverState = await startServerIfNeeded();
await mkdir(screenshotDir, { recursive: true });
await mkdir(dirname(reportPath), { recursive: true });
const browser = await chromium.launch();
const results = [];

try {
  for (const viewport of mobileViewports) {
    for (const pageSpec of pages) {
      const result = await verifyPage(browser, pageSpec, viewport);
      results.push(result);
      console.log(
        `${result.name}/${viewport.name}: screenshot=${result.screenshot} width=${result.layout.innerWidth}/${result.layout.scrollWidth} consoleErrors=${result.consoleErrors.length}`,
      );
    }
  }
} finally {
  await browser.close();
  await stopServer(serverState);
}

const failures = results.flatMap((result) =>
  result.failures.map((failure) => `${result.name}/${result.viewport.name}: ${failure}`),
);
const personaCounts = results.reduce((counts, result) => {
  counts[result.persona] = (counts[result.persona] ?? 0) + 1;
  return counts;
}, {});
const expectedCheckCount = pages.length * mobileViewports.length;
const expectedPersonaCounts = pages.reduce((counts, pageSpec) => {
  counts[pageSpec.persona] = (counts[pageSpec.persona] ?? 0) + mobileViewports.length;
  return counts;
}, {});

if (results.length !== expectedCheckCount) {
  failures.push(`coverage changed: expected ${expectedCheckCount} checks, got ${results.length}`);
}

for (const [persona, expectedCount] of Object.entries(expectedPersonaCounts)) {
  if (personaCounts[persona] !== expectedCount) {
    failures.push(
      `coverage changed: expected ${expectedCount} ${persona} checks, got ${personaCounts[persona] ?? 0}`,
    );
  }
}

await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      baseUrl,
      requestedAutomationBackend,
      automationBackend,
      automationBackendConstraint,
      databaseFixture: serverState.databaseFixture,
      mayReuseExistingServer: verificationTarget.mayReuseExistingServer,
      checkedAt: new Date().toISOString(),
      viewportCount: mobileViewports.length,
      pageCount: pages.length,
      checkCount: results.length,
      expectedCheckCount,
      personaCounts,
      expectedPersonaCounts,
      status: failures.length ? "failed" : "passed",
      failures,
      results: results.map((result) => ({
        name: result.name,
        persona: result.persona,
        route: result.path,
        screenshot: result.screenshot,
        viewport: result.viewport,
        layout: result.layout,
        consoleErrorCount: result.consoleErrors.length,
        failures: result.failures,
      })),
    },
    null,
    2,
  )}\n`,
);
console.log(`report=${reportPath}`);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
