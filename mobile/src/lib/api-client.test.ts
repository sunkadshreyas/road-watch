import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, createApiClient } from "./api-client";

test("API client sends bearer auth to the versioned endpoint", async () => {
  const requests: Request[] = [];
  const client = createApiClient({
    baseUrl: "https://roadwatch.example/",
    getAccessToken: async () => "resident-token",
    fetchImpl: async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await client.get<{ items: unknown[] }>("/nearby?road=road-1");

  const request = requests[0];
  assert.ok(request);
  assert.deepEqual(result, { items: [] });
  assert.equal(request.url, "https://roadwatch.example/api/v1/nearby?road=road-1");
  assert.equal(request.headers.get("authorization"), "Bearer resident-token");
});

test("API client sends one idempotency key for capture mutations", async () => {
  const requests: Request[] = [];
  const client = createApiClient({
    baseUrl: "https://roadwatch.example",
    getAccessToken: async () => "resident-token",
    fetchImpl: async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(JSON.stringify({ observationId: "observation-1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.post(
    "/captures",
    { roadId: "road-1" },
    { idempotencyKey: "capture-key-1" },
  );

  const request = requests[0];
  assert.ok(request);
  assert.equal(request.headers.get("idempotency-key"), "capture-key-1");
  assert.deepEqual(await request.json(), { roadId: "road-1" });
});

test("API client exposes stable HTTP failures", async () => {
  const client = createApiClient({
    baseUrl: "https://roadwatch.example",
    getAccessToken: async () => null,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  await assert.rejects(
    () => client.get("/me"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 401 &&
      error.code === "UNAUTHORIZED" &&
      error.message === "Sign in required",
  );
});

test("API client unwraps the shared data envelope", async () => {
  const client = createApiClient({
    baseUrl: "https://roadwatch.example",
    getAccessToken: async () => "resident-token",
    fetchImpl: async () =>
      new Response(JSON.stringify({ data: { wardName: "Ward 94" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  assert.deepEqual(await client.get("/leaderboard"), { wardName: "Ward 94" });
});

test("API client converts transport failures into a stable network error", async () => {
  const client = createApiClient({
    baseUrl: "https://roadwatch.example",
    getAccessToken: async () => "resident-token",
    fetchImpl: async () => {
      throw new TypeError("Network request failed");
    },
  });

  await assert.rejects(
    () => client.get("/nearby"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 0 &&
      error.code === "NETWORK_ERROR" &&
      error.message === "RoadWatch could not reach the API.",
  );
});
