#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export function resolveExpectedSha({ eventName, workflowRunHeadSha, currentSha }) {
  if (eventName === "workflow_run") return workflowRunHeadSha?.trim() || null;
  return currentSha?.trim() || null;
}

export function isExpectedProductionRelease(body, expectedSha) {
  const data = parseProductionHealth(body);
  return data?.ok === true && data?.sha === expectedSha;
}

export function parseProductionHealth(body) {
  try {
    const data = JSON.parse(body);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function parseCliArgs(argv) {
  const [url, ...rest] = argv;
  const out = {
    url: url ?? "",
    eventName: "",
    workflowRunHeadSha: "",
    currentSha: "",
  };
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1] ?? "";
    if (flag === "--event-name") out.eventName = value;
    else if (flag === "--workflow-run-head-sha") out.workflowRunHeadSha = value;
    else if (flag === "--current-sha") out.currentSha = value;
    else throw new Error(`unknown flag: ${flag}`);
  }
  return out;
}

async function main() {
  const { url, eventName, workflowRunHeadSha, currentSha } = parseCliArgs(process.argv.slice(2));
  if (!url) {
    console.error("usage: node scripts/check-production-health.mjs <url> <expectedSha>");
    process.exit(1);
  }
  const expectedSha = resolveExpectedSha({ eventName, workflowRunHeadSha, currentSha });
  if (!expectedSha) {
    console.error(`[prod-health] could not determine expected SHA for ${eventName || "unknown"}`);
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
