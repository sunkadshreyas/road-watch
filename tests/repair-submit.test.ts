import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import {
  govSessionCookie,
  parseFormContaining,
  residentASessionCookie,
  startNextTestServer,
} from "./support/next-test-server";

test("repair submit flows stay valid after server-action mutations", { timeout: 120_000 }, async (t) => {
  const server = await startNextTestServer("roadwatch-repair-test-");
  const { baseUrl, repoRoot } = server;
  const database = new Database(server.dbPath);
  const createdProofPaths: string[] = [];

  t.after(async () => {
    database.close();
    await server.stop();

    for (const proofPath of createdProofPaths) {
      await rm(join(repoRoot, "public", proofPath.replace(/^\//, "")), {
        force: true,
      });
    }
  });

  await t.test("resident and government road views expose the right actions", async () => {
    const [anonymousResponse, residentResponse, govResponse] = await Promise.all([
      fetch(`${baseUrl}/roads/100-feet-road`),
      fetch(`${baseUrl}/roads/100-feet-road`, {
        headers: {
          cookie: residentASessionCookie,
        },
      }),
      fetch(`${baseUrl}/roads/100-feet-road`, {
        headers: {
          cookie: govSessionCookie,
        },
      }),
    ]);
    const [anonymousHtml, residentHtml, govHtml] = await Promise.all([
      anonymousResponse.text(),
      residentResponse.text(),
      govResponse.text(),
    ]);

    assert.equal(anonymousResponse.status, 200);
    assert.equal(residentResponse.status, 200);
    assert.equal(govResponse.status, 200);
    assert.match(anonymousHtml, /Sign in as a resident/);
    assert.doesNotMatch(anonymousHtml, /Capture encounter/);
    assert.doesNotMatch(anonymousHtml, /Upvote/);
    assert.doesNotMatch(anonymousHtml, /Downvote/);
    assert.match(residentHtml, /Collect violation/);
    assert.match(residentHtml, /Upvote/);
    assert.match(residentHtml, /Downvote/);
    assert.match(residentHtml, /Subscribe to RSS feed/);
    assert.match(govHtml, /Government repair crew/);
    assert.match(govHtml, /Open repair log/);
    assert.match(govHtml, /Rankings/);
    assert.match(govHtml, /Insights/);
    assert.match(govHtml, /Resident account required/);
    assert.doesNotMatch(govHtml, /Subscribe to RSS feed/);
    assert.doesNotMatch(govHtml, /Upvote/);
    assert.doesNotMatch(govHtml, /Downvote/);
  });

  await t.test("community, exports, and account activity stay discoverable", async () => {
    const [communityResponse, dataResponse, accountResponse] = await Promise.all([
      fetch(`${baseUrl}/roads/100-feet-road?section=community`),
      fetch(`${baseUrl}/roads/100-feet-road?section=data`),
      fetch(`${baseUrl}/account`, {
        headers: { cookie: residentASessionCookie },
      }),
    ]);
    const [communityHtml, dataHtml, accountHtml] = await Promise.all([
      communityResponse.text(),
      dataResponse.text(),
      accountResponse.text(),
    ]);

    assert.equal(communityResponse.status, 200);
    assert.match(communityHtml, /Community tabs/);
    assert.match(communityHtml, /Discussions/);
    assert.equal(dataResponse.status, 200);
    assert.match(dataHtml, /Download CSV/);
    assert.match(dataHtml, /Open JSON/);
    assert.equal(accountResponse.status, 200);
    assert.match(accountHtml, /Community activity/);
    assert.match(accountHtml, /Your discussion trail/);
  });

  await t.test("road RSS feed includes violation and repair events", async () => {
    const response = await fetch(`${baseUrl}/feeds/subscriptions/sub-roadwatch-100-feet`);
    const xml = await response.text();

    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-type") ?? "",
      /application\/rss\+xml/,
    );
    assert.match(xml, /100 Feet Road road updates/);
    assert.match(xml, /100 Feet Road: observation -/);
    assert.match(xml, /100 Feet Road: repair -/);
  });

  await t.test("dedicated repair form is only reachable by government accounts", async () => {
    const path = "/roads/metro-footpath-east/repairs/cart-stack-entrance";
    const [anonymousResponse, residentResponse, govResponse] = await Promise.all([
      fetch(`${baseUrl}${path}`, {
        redirect: "manual",
      }),
      fetch(`${baseUrl}${path}`, {
        headers: {
          cookie: residentASessionCookie,
        },
        redirect: "manual",
      }),
      fetch(`${baseUrl}${path}`, {
        headers: {
          cookie: govSessionCookie,
        },
      }),
    ]);
    const govHtml = await govResponse.text();

    assert.equal(anonymousResponse.status, 307);
    assert.equal(
      anonymousResponse.headers.get("location"),
      "/roads/metro-footpath-east?section=history",
    );
    assert.equal(residentResponse.status, 307);
    assert.equal(
      residentResponse.headers.get("location"),
      "/roads/metro-footpath-east?section=history",
    );
    assert.equal(govResponse.status, 200);
    assert.match(govHtml, /Government repair workflow/);
    assert.match(govHtml, /Update this violation/);
  });

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
      `Expected the repair page to load before submit.\nRecent server output:\n${server.serverOutput}`,
    );

    const hiddenInputs = parseFormContaining(pageHtml, "roadId");
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
      `Expected in-progress repair updates to stay inline.\nRecent server output:\n${server.serverOutput}`,
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
      `Expected repaired updates to redirect from the server action.\nRecent server output:\n${server.serverOutput}`,
    );
    assert.equal(response.headers.get("location"), "/roads/cmh-road?section=history");

    const repair = database
      .prepare(
        'SELECT "proofImagePath" FROM "RepairEvent" WHERE "note" = ? ORDER BY "createdAt" DESC LIMIT 1',
      )
      .get("Parking bollards installed and curb lane markings refreshed.") as {
      proofImagePath: string | null;
    };

    assert.ok(repair.proofImagePath);
    createdProofPaths.push(repair.proofImagePath);
  });
});
