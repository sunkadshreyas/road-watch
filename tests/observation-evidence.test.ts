import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeObservationImageDataUrl,
  maxObservationImageBytes,
} from "@/lib/observation-evidence";

test("observation evidence accepts a small supported image", () => {
  const decoded = decodeObservationImageDataUrl(
    `data:image/png;base64,${Buffer.from("roadwatch").toString("base64")}`,
  );

  assert.equal(decoded.extension, "png");
  assert.equal(decoded.buffer.toString(), "roadwatch");
});

test("observation evidence rejects invalid and oversized payloads", () => {
  assert.throws(
    () => decodeObservationImageDataUrl("not-an-image"),
    /live camera image is required/i,
  );
  assert.throws(
    () =>
      decodeObservationImageDataUrl(
        `data:image/jpeg;base64,${Buffer.alloc(maxObservationImageBytes + 1).toString("base64")}`,
      ),
    /5MB or smaller/,
  );
});
