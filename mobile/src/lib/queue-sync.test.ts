import assert from "node:assert/strict";
import test from "node:test";

import { newQueuedCapture, type QueuedCapture } from "./offline-queue";
import { syncNextCapture, type CaptureQueueRepository } from "./queue-sync";

function capture(status: QueuedCapture["status"] = "queued"): QueuedCapture {
  return {
    ...newQueuedCapture(
      {
        imageUri: "file:///capture.jpg",
        roadId: "road-1",
        issueType: "POTHOLE",
        latitude: 12.9716,
        longitude: 77.5946,
      },
      {
        idempotencyKey: "capture-key-1",
        now: "2026-07-17T12:00:00.000Z",
      },
    ),
    status,
  };
}

function memoryRepository(initial: QueuedCapture[]) {
  let queue = initial;
  const snapshots: QueuedCapture[][] = [];
  const repository: CaptureQueueRepository = {
    async load() {
      return queue;
    },
    async save(nextQueue) {
      queue = [...nextQueue];
      snapshots.push(queue);
    },
  };

  return { repository, snapshots, current: () => queue };
}

test("sync preserves the idempotency key through uploading and confirmation", async () => {
  const memory = memoryRepository([capture()]);
  const receivedKeys: string[] = [];

  const result = await syncNextCapture({
    repository: memory.repository,
    upload: async (queuedCapture, idempotencyKey) => {
      receivedKeys.push(idempotencyKey);
      assert.equal(queuedCapture.idempotencyKey, idempotencyKey);
      return { observationId: "observation-1" };
    },
  });

  assert.equal(result.status, "confirmed");
  assert.deepEqual(receivedKeys, ["capture-key-1"]);
  assert.equal(memory.snapshots[0]?.[0]?.status, "uploading");
  assert.equal(memory.current()[0]?.status, "confirmed");
  assert.equal(memory.current()[0]?.observationId, "observation-1");
});

test("sync marks a failed upload for retry without changing its key", async () => {
  const memory = memoryRepository([capture()]);

  const result = await syncNextCapture({
    repository: memory.repository,
    upload: async () => {
      throw new Error("offline");
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(memory.current()[0]?.status, "failed");
  assert.equal(memory.current()[0]?.attempts, 1);
  assert.equal(memory.current()[0]?.idempotencyKey, "capture-key-1");
});

test("sync replays an interrupted upload after restart with the original key", async () => {
  const memory = memoryRepository([capture("uploading")]);
  let receivedKey = "";

  const result = await syncNextCapture({
    repository: memory.repository,
    upload: async (_queuedCapture, idempotencyKey) => {
      receivedKey = idempotencyKey;
      return { observationId: "observation-1" };
    },
  });

  assert.equal(result.status, "confirmed");
  assert.equal(receivedKey, "capture-key-1");
  assert.equal(memory.current()[0]?.observationId, "observation-1");
});

test("sync leaves unmatched captures idle", async () => {
  const memory = memoryRepository([{ ...capture(), roadId: "" }]);
  let uploadCalled = false;

  const result = await syncNextCapture({
    repository: memory.repository,
    upload: async () => {
      uploadCalled = true;
      return { observationId: "observation-1" };
    },
  });

  assert.equal(result.status, "idle");
  assert.equal(uploadCalled, false);
  assert.equal(memory.snapshots.length, 0);
});
