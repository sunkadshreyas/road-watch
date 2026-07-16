import assert from "node:assert/strict";
import test from "node:test";

import { assertGovRole, assertResidentRole } from "@/lib/auth";

test("resident role guard allows resident collection, voting, and subscription actions", () => {
  assert.doesNotThrow(() => assertResidentRole({ role: "RESIDENT" }));
});

test("resident role guard rejects government accounts from collection, voting, and subscription actions", () => {
  assert.throws(
    () => assertResidentRole({ role: "GOV" }),
    /Only resident accounts can collect or vote on violations\./,
  );
});

test("government role guard allows repair actions", () => {
  assert.doesNotThrow(() => assertGovRole({ role: "GOV" }));
});

test("government role guard rejects resident repair actions", () => {
  assert.throws(
    () => assertGovRole({ role: "RESIDENT" }),
    /Only government-labelled accounts can record repairs\./,
  );
});
