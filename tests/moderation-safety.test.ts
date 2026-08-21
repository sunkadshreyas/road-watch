import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import Database from "better-sqlite3";

const execFileAsync = promisify(execFile);

test("deployed observation tables default new captures to manual review", async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), "roadwatch-moderation-default-"));
  const dbPath = join(tempDir, "dev.db");
  const databaseUrl = `file:${dbPath}`;

  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  await writeFile(dbPath, "");
  await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    maxBuffer: 10 * 1024 * 1024,
  });

  const database = new Database(dbPath, { readonly: true });
  t.after(() => database.close());

  const statusColumn = database
    .prepare("SELECT dflt_value AS defaultValue FROM pragma_table_info('Observation') WHERE name = ?")
    .get("humanCheckStatus") as { defaultValue: string | null } | undefined;

  assert.equal(statusColumn?.defaultValue, "'MANUAL_REVIEW'");
});
