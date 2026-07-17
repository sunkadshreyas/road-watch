import assert from "node:assert/strict";
import test from "node:test";

import {
  enqueueCapture,
  markCaptureConfirmed,
  markCaptureFailed,
  nextUploadCandidate,
  newQueuedCapture,
  parseCaptureQueue,
} from "./offline-queue";

test("enqueue keeps one capture per idempotency key", () => {
  const capture = newQueuedCapture(
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
  );

  const once = enqueueCapture([], capture);
  const twice = enqueueCapture(once, capture);

  assert.equal(once.length, 1);
  assert.deepEqual(twice, once);
});

test("failed uploads retain their idempotency key and become retry candidates", () => {
  const capture = newQueuedCapture(
    {
      imageUri: "file:///capture.jpg",
      roadId: "road-1",
      issueType: "POTHOLE",
      latitude: 12.9716,
      longitude: 77.5946,
    },
    {
      idempotencyKey: "capture-key-2",
      now: "2026-07-17T12:00:00.000Z",
    },
  );
  const failedQueue = markCaptureFailed([capture], capture.idempotencyKey, "offline");

  assert.equal(failedQueue[0]?.attempts, 1);
  assert.equal(failedQueue[0]?.idempotencyKey, capture.idempotencyKey);
  assert.equal(nextUploadCandidate(failedQueue)?.idempotencyKey, capture.idempotencyKey);
});

test("confirmed uploads are not retried", () => {
  const capture = newQueuedCapture(
    {
      imageUri: "file:///capture.jpg",
      roadId: "road-1",
      issueType: "POTHOLE",
      latitude: 12.9716,
      longitude: 77.5946,
    },
    {
      idempotencyKey: "capture-key-3",
      now: "2026-07-17T12:00:00.000Z",
    },
  );
  const confirmedQueue = markCaptureConfirmed(
    [capture],
    capture.idempotencyKey,
    "observation-1",
  );

  assert.equal(confirmedQueue[0]?.status, "confirmed");
  assert.equal(nextUploadCandidate(confirmedQueue), null);
});

test("captures wait for road matching before upload", () => {
  const capture = newQueuedCapture(
    {
      imageUri: "file:///capture.jpg",
      roadId: "",
      issueType: "POTHOLE",
      latitude: 12.9716,
      longitude: 77.5946,
    },
    {
      idempotencyKey: "capture-key-unmatched",
      now: "2026-07-17T12:00:00.000Z",
    },
  );

  assert.equal(nextUploadCandidate([capture]), null);
});

test("queue parsing rejects malformed persisted entries", () => {
  assert.deepEqual(parseCaptureQueue("not-json"), []);
  assert.deepEqual(parseCaptureQueue(JSON.stringify([{ status: "queued" }])), []);
});
