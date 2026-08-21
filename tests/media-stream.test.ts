import assert from "node:assert/strict";
import test from "node:test";

import { replaceMediaStream, stopMediaStream } from "../lib/media-stream";

function fakeStream() {
  const tracks = [
    { stopped: false, stop() { this.stopped = true; } },
    { stopped: false, stop() { this.stopped = true; } },
  ];

  return {
    tracks,
    stream: {
      getTracks: () => tracks,
    },
  };
}

test("replaceMediaStream stops every track from the previous camera session", () => {
  const previous = fakeStream();
  const next = fakeStream();

  assert.equal(replaceMediaStream(previous.stream, next.stream), next.stream);
  assert.ok(previous.tracks.every((track) => track.stopped));
  assert.ok(next.tracks.every((track) => !track.stopped));
});

test("stopMediaStream releases a newly acquired stream after setup fails", () => {
  const acquired = fakeStream();

  stopMediaStream(acquired.stream);

  assert.ok(acquired.tracks.every((track) => track.stopped));
});
