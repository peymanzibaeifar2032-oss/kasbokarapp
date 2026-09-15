#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export function isExpectedProductionRelease(body, expectedSha) {
  const data = parseProductionHealth(body);
  return data?.ok === true && data?.sha === expectedSha;
}

export function parseProductionHealth(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function main() {
  const [url, expectedSha] = process.argv.slice(2);
  if (!url || !expectedSha) {
    console.error("usage: node scripts/check-production-health.mjs <url> <expectedSha>");
    process.exit(1);
  }

  let response;
  try {
    response = await fetch(url, { redirect: "follow" });
  } catch (error) {
    console.error(
      `[prod-health] request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`[prod-health] unexpected HTTP ${response.status} from ${response.url || url}`);
    process.exit(1);
  }

  const body = await response.text();
  const data = parseProductionHealth(body);
  if (!data) {
    console.error(`[prod-health] invalid health payload from ${url}`);
    process.exit(1);
  }
  if (data.ok !== true) {
    const actualOk = data && "ok" in data ? String(data.ok) : "missing";
    console.error(`[prod-health] unhealthy payload at ${url} (ok=${actualOk})`);
    process.exit(1);
  }
  if (data.sha !== expectedSha) {
    const actualSha = typeof data.sha === "string" && data.sha ? data.sha : "missing";
    console.error(
      `[prod-health] stale release at ${url} (expected ${expectedSha}, got ${actualSha})`,
    );
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
