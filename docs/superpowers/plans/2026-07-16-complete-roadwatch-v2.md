# Complete RoadWatch V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the existing RoadWatch V2 demo scope with a reproducible runtime, mutation-level resident workflow coverage, current mobile evidence, and a validated feature-branch commit.

**Architecture:** Keep the implemented Next.js and Prisma design intact. Add a small runtime preflight at the npm boundary, exercise collection and voting through rendered Server Action forms against a temporary database, and retain Playwright plus Browser checks as independent mobile evidence.

**Tech Stack:** Node.js 22, Next.js 16.2.4, React 19.2.4, Prisma 7.8.0, SQLite, Node test runner, Playwright, Browser runtime.

---

### Task 1: Enforce the supported runtime

**Files:**
- Create: `.nvmrc`
- Create: `scripts/check-runtime.mjs`
- Create: `tests/runtime.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

- [ ] **Step 1: Write the failing runtime contract test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { validateNodeVersion } from "../scripts/check-runtime.mjs";

test("runtime check accepts Node 22", () => {
  assert.equal(validateNodeVersion("v22.18.0"), null);
});

test("runtime check rejects other Node majors with recovery guidance", () => {
  assert.match(validateNodeVersion("v26.4.0") ?? "", /Node.js 22/);
  assert.match(validateNodeVersion("v26.4.0") ?? "", /npm install/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `PATH="$HOME/.local/share/fnm/node-versions/v22.18.0/installation/bin:$PATH" node --import tsx --test tests/runtime.test.ts`

Expected: FAIL because `scripts/check-runtime.mjs` does not exist.

- [ ] **Step 3: Implement the runtime preflight and npm lifecycle gates**

```js
export function validateNodeVersion(version) {
  const major = Number.parseInt(version.replace(/^v/, "").split(".")[0], 10);
  return major === 22
    ? null
    : `RoadWatch requires Node.js 22. Current runtime: ${version}. Switch to Node 22, then run npm install so native dependencies are rebuilt.`;
}
```

Add `.nvmrc` with `22.18.0`, add `engines.node: "22.x"`, and invoke the checker through `preinstall`, `predev`, `pretest`, `prebuild`, and `preverify`.

- [ ] **Step 4: Verify GREEN and the diagnostic path**

Run the focused test under Node 22 and run `node scripts/check-runtime.mjs` under the active Node 26 shell.

Expected: tests pass under Node 22, while Node 26 exits immediately with the recovery message.

### Task 2: Cover resident collection and voting mutations

**Files:**
- Create: `tests/resident-collection.test.ts`
- Modify: `tests/repair-submit.test.ts`
- Create: `tests/support/next-test-server.ts`

- [ ] **Step 1: Extract the existing temporary-database server harness without changing behavior**

The helper must expose `startNextTestServer`, `stop`, `baseUrl`, `serverOutput`, `parseFormContaining`, and the seeded resident and government cookies. The repair test must pass unchanged after using the helper.

- [ ] **Step 2: Add an end-to-end collection test**

Fetch the resident report page, parse the rendered collection Server Action form, submit a valid live-camera data URL with GPS, and assert through SQLite plus rendered pages that exactly one observation and receipt were created, the record appears in the private collection and public road record, and the collector gains ten points.

- [ ] **Step 3: Add duplicate and role-boundary assertions**

Submit the same nearby issue within ten minutes and assert that no second observation or receipt is created. Confirm anonymous and government pages do not expose resident collection controls.

- [ ] **Step 4: Add vote-transition and leaderboard assertions**

Submit `LIKE`, submit `LIKE` again to remove it, and submit `DISLIKE` for another resident's observation. Assert one-vote-per-user storage, score changes of `+1`, `0`, and `-2`, deterministic leaderboard rendering, and absence of resident email addresses.

- [ ] **Step 5: Run the focused end-to-end tests**

Run: `PATH="$HOME/.local/share/fnm/node-versions/v22.18.0/installation/bin:$PATH" node --import tsx --test tests/repair-submit.test.ts tests/resident-collection.test.ts`

Expected: all mutation and repair assertions pass against isolated database copies.

### Task 3: Refresh mobile verification evidence

**Files:**
- Modify: `scripts/verify-mobile.mjs`
- Modify: `docs/mobile-completion-audit.md`
- Modify: `docs/ai-browser-use-handoff.md`
- Modify: `docs/violation-collection-v2-spec.md`

- [ ] **Step 1: Make the report describe its actual backend**

The repository script must report Playwright as the requested and actual backend without claiming Browser is unavailable.

- [ ] **Step 2: Run the complete automated matrix**

Run: `PATH="$HOME/.local/share/fnm/node-versions/v22.18.0/installation/bin:$PATH" npm run verify:mobile`

Expected: 18 checks across anonymous, resident, and government personas, zero overflow failures, and zero console errors.

- [ ] **Step 3: Run independent Browser checks**

Use the Browser runtime against the local app at 360px and 390px. Inspect the report, collection, leaderboard, road, and government repair surfaces, and capture screenshots for visual review.

- [ ] **Step 4: Update documentation to current evidence**

Remove the stale Browser-unavailable handoff, record both verification paths, mark only evidence-backed V2 items complete, and retain the documented out-of-scope boundaries.

### Task 4: Validate and hand off

**Files:**
- Modify: only files required by findings from verification or the no-mistakes gate

- [ ] **Step 1: Run the full repository gate**

Run: `PATH="$HOME/.local/share/fnm/node-versions/v22.18.0/installation/bin:$PATH" npm run verify`

Expected: runtime check, lint, all tests, production build, and all 18 mobile checks pass.

- [ ] **Step 2: Inspect the final diff**

Run: `git diff --check`, `git status --short`, and review every changed file for scope, privacy, secrets, and generated artifacts.

- [ ] **Step 3: Commit the completed V2 work**

Stage the RoadWatch V2 implementation, tests, migration, documentation, and runtime contract. Commit on `codex/complete-roadwatch-v2` with a concise message.

- [ ] **Step 4: Run no-mistakes**

Initialize the repository gate if needed, run `no-mistakes axi run --intent "complete the work"`, resolve safe findings, and report any product decision that requires user input.
