import assert from "node:assert/strict";
import test from "node:test";

import { assertProductionDatabaseUrl } from "../lib/database-runtime";
import { validateNodeVersion } from "../scripts/check-runtime.mjs";

test("runtime check accepts Node 22", () => {
  assert.equal(validateNodeVersion("v22.18.0"), null);
});

test("runtime check rejects other Node majors with recovery guidance", () => {
  const message = validateNodeVersion("v26.4.0") ?? "";

  assert.match(message, /Node\.js 22/);
  assert.match(message, /npm install/);
});

test("production runtime rejects a SQLite database URL", () => {
  assert.throws(
    () => assertProductionDatabaseUrl("file:./dev.db", "production"),
    /PostgreSQL/,
  );
  assert.doesNotThrow(() =>
    assertProductionDatabaseUrl("postgresql://localhost/roadwatch", "production"),
  );
  assert.doesNotThrow(() =>
    assertProductionDatabaseUrl("file:./dev.db", "development"),
  );
});
