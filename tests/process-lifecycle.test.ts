import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  childHasExited,
  getIsolatedNextDistDir,
  getIsolatedNextTsconfigPath,
  terminateChild,
} from "../scripts/process-lifecycle.mjs";

class SignalChild extends EventEmitter {
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  signals: NodeJS.Signals[] = [];

  kill(signal: NodeJS.Signals) {
    this.signals.push(signal);
    this.signalCode = signal;
    this.emit("exit", null, signal);
    return true;
  }
}

test("childHasExited recognizes signal-terminated processes", () => {
  const child = new SignalChild();

  child.signalCode = "SIGTERM";

  assert.equal(childHasExited(child), true);
});

test("terminateChild handles a synchronous signal exit without waiting forever", async () => {
  const child = new SignalChild();

  await terminateChild(child, { graceMs: 10, forceMs: 10 });

  assert.deepEqual(child.signals, ["SIGTERM"]);
});

test("getIsolatedNextDistDir separates concurrent checkout processes", () => {
  const first = getIsolatedNextDistDir("e2e", 31234, 100);
  const second = getIsolatedNextDistDir("e2e", 31234, 101);

  assert.notEqual(first, second);
  assert.match(first, /^\.next-roadwatch-e2e-100-31234$/);
  assert.equal(first.includes("/"), false);
});

test("getIsolatedNextTsconfigPath keeps generated type includes out of tracked config", () => {
  const first = getIsolatedNextTsconfigPath("mobile", 32222, 100);
  const second = getIsolatedNextTsconfigPath("mobile", 32222, 101);

  assert.notEqual(first, second);
  assert.match(first, /^\.roadwatch-tsconfig-mobile-100-32222\.json$/);
  assert.equal(first.includes("/"), false);
});
