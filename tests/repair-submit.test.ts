import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const govSessionCookie = "roadwatch-demo-session=cmosvmckg0003a0x9w00v5n90";

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

function parseRepairForm(html: string) {
  const formMatch = html.match(
    /<form[^>]*>[\s\S]*?<input[^>]+name="roadId"[^>]*>[\s\S]*?<\/form>/,
  );

  assert.ok(formMatch, "Expected the dedicated repair form to be rendered.");

  const hiddenInputs = Object.fromEntries(
    [...formMatch[0].matchAll(
      /<input[^>]+type="hidden"[^>]+name="([^"]+)"(?:[^>]+value="([^"]*)")?[^>]*>/g,
    )].map((match) => [match[1], decodeHtmlAttribute(match[2] ?? "")]),
  );

  return hiddenInputs;
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

async function stopServer(server: ChildProcessWithoutNullStreams) {
  server.kill("SIGTERM");

  await Promise.race([
    new Promise<void>((resolve) => {
      server.once("exit", () => {
        resolve();
      });
    }),
    delay(10_000),
  ]);
}

test("repair submit flows stay valid after server-action mutations", { timeout: 120_000 }, async (t) => {
  const repoRoot = process.cwd();
  const tempDir = await mkdtemp(join(tmpdir(), "roadwatch-test-"));
  const dbPath = join(tempDir, "dev.db");
  const port = 31_200 + Math.floor(Math.random() * 200);
  const baseUrl = `http://127.0.0.1:${port}`;

  await copyFile(join(repoRoot, "dev.db"), dbPath);

  let serverOutput = "";
  const server = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATABASE_URL: `file:${dbPath}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const captureOutput = (chunk: Buffer | string) => {
    serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8_000);
  };

  server.stdout.on("data", captureOutput);
  server.stderr.on("data", captureOutput);

  t.after(async () => {
    await stopServer(server);
    await rm(tempDir, { recursive: true, force: true });
  });

  await waitForHttpReady(baseUrl, () => serverOutput);

  async function submitRepairUpdate(options: {
    path: string;
    status: "SCHEDULED" | "IN_PROGRESS" | "REPAIRED";
    note: string;
    proofImagePath?: string;
  }) {
    const pageResponse = await fetch(`${baseUrl}${options.path}`, {
      headers: {
        cookie: govSessionCookie,
      },
    });
    const pageHtml = await pageResponse.text();

    assert.equal(
      pageResponse.status,
      200,
      `Expected the repair page to load before submit.\nRecent server output:\n${serverOutput}`,
    );

    const hiddenInputs = parseRepairForm(pageHtml);
    const formData = new FormData();

    for (const [name, value] of Object.entries(hiddenInputs)) {
      formData.set(name, value);
    }

    formData.set("status", options.status);
    formData.set("note", options.note);

    if (options.proofImagePath) {
      const proofImage = await readFile(join(repoRoot, options.proofImagePath));

      formData.set(
        "proofImage",
        new File([proofImage], "proof.jpg", { type: "image/jpeg" }),
      );
    }

    return fetch(`${baseUrl}${options.path}`, {
      method: "POST",
      headers: {
        cookie: govSessionCookie,
        origin: baseUrl,
      },
      body: formData,
      redirect: "manual",
    });
  }

  await t.test("in-progress updates stay on the dedicated repair page", async () => {
    const response = await submitRepairUpdate({
      path: "/roads/metro-footpath-east/repairs/cart-stack-entrance",
      status: "IN_PROGRESS",
      note: "Crews are clearing the access rail and moving stacked carts off the landing.",
    });
    const html = await response.text();

    assert.equal(
      response.status,
      200,
      `Expected in-progress repair updates to stay inline.\nRecent server output:\n${serverOutput}`,
    );
    assert.match(
      html,
      /Metro Footpath East updated with a in progress event\./,
      "Expected the inline success state to be rendered for in-progress updates.",
    );
  });

  await t.test("repaired updates redirect from the server action to road history", async () => {
    const response = await submitRepairUpdate({
      path: "/roads/cmh-road/repairs/market-edge-parking",
      status: "REPAIRED",
      note: "Parking bollards installed and curb lane markings refreshed.",
      proofImagePath: "public/uploads/seed/cmh-lighting-repair.jpg",
    });

    assert.equal(
      response.status,
      303,
      `Expected repaired updates to redirect from the server action.\nRecent server output:\n${serverOutput}`,
    );
    assert.equal(response.headers.get("location"), "/roads/cmh-road?section=history");
  });
});
