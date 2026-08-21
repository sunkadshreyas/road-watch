#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const supportedNodeMajor = 22;

export function validateNodeVersion(version) {
  const major = Number.parseInt(version.replace(/^v/, "").split(".")[0], 10);

  if (major === supportedNodeMajor) {
    return null;
  }

  return `RoadWatch requires Node.js 22. Current runtime: ${version}. Switch to Node 22, then run npm install so native dependencies are rebuilt.`;
}

function main() {
  const message = validateNodeVersion(process.version);

  if (!message) {
    return;
  }

  console.error(message);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
