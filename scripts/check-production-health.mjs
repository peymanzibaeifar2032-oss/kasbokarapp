#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export function isExpectedProductionRelease(body, expectedSha) {
  try {
    const data = JSON.parse(body);
    return data?.ok === true && data?.sha === expectedSha;
  } catch {
    return false;
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

  const body = await response.text();
  if (!isExpectedProductionRelease(body, expectedSha)) {
    console.error(`[prod-health] unhealthy or wrong release at ${url}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
