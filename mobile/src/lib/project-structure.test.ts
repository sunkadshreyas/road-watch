import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mobileRoot = join(__dirname, "..", "..");

const requiredRoutes = [
  "src/app/(tabs)/index.tsx",
  "src/app/(tabs)/nearby.tsx",
  "src/app/(tabs)/collection.tsx",
  "src/app/(tabs)/leaderboard.tsx",
  "src/app/(tabs)/profile.tsx",
  "src/app/(auth)/sign-in.tsx",
  "src/app/onboarding.tsx",
  "src/app/permissions.tsx",
] as const;

test("native project declares the locally verified Expo SDK set", () => {
  const packageJson = JSON.parse(
    readFileSync(join(mobileRoot, "package.json"), "utf8"),
  ) as {
    main?: string;
    dependencies?: Record<string, string>;
  };

  assert.equal(packageJson.main, "expo-router/entry");
  assert.equal(packageJson.dependencies?.expo, "54.0.34");
  assert.equal(packageJson.dependencies?.["expo-router"], "6.0.23");
  assert.equal(packageJson.dependencies?.["react-native"], "0.81.5");
});

test("every requested resident and recovery route exists", () => {
  for (const route of requiredRoutes) {
    const source = readFileSync(join(mobileRoot, route), "utf8");
    assert.match(source, /export default function/);
  }
});

test("native routes do not import Next.js, Prisma, or server actions", () => {
  for (const route of requiredRoutes) {
    const source = readFileSync(join(mobileRoot, route), "utf8");
    assert.doesNotMatch(source, /next\//);
    assert.doesNotMatch(source, /prisma/i);
    assert.doesNotMatch(source, /app\/actions/);
  }
});
