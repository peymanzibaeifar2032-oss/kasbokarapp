import { existsSync, readFileSync } from "node:fs";
import { createFileRoute } from "@tanstack/react-router";
import { isStandalone } from "@/lib/env.server";
import { HOME_SEARCH_VERSION } from "@/lib/search/home-search";

/** Production health. Markers in `app`/`db` survive JSON field stripping. */

const REQUIRED_MIGRATIONS = [
  "0014_calendar.sql",
  "0015_finance.sql",
  "0016_resources.sql",
] as const;

const REQUIRED_TABLES = [
  "business_special_hours",
  "booking_holds",
  "ledger_accounts",
  "business_resources",
  "resource_service_map",
] as const;

function bakedSha(): { sha: string; shaSource: "image" | "env" | "missing" } {
  try {
    if (existsSync("/app/BUILD_SHA")) {
      const sha = readFileSync("/app/BUILD_SHA", "utf8").trim();
      if (sha && sha !== "unknown") return { sha, shaSource: "image" };
    }
  } catch {
    /* ignore unreadable image marker */
  }
  const env = (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim();
  if (env) return { sha: env, shaSource: "env" };
  return { sha: "", shaSource: "missing" };
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSql } = await import("@/lib/db");
          const { postgresUrl } = await import("@/lib/env.server");
          const { vandarStatus } = await import("@/lib/finance/providers");
          const sql = await getSql();
          await sql.query("select 1 as ok");
          const { sha, shaSource } = bakedSha();
          const mig = await sql.query<{ name: string }>(
            `select name from _migrations where name = any($1)`,
            [REQUIRED_MIGRATIONS],
          );
          const tbl = await sql.query<{ table_name: string }>(
            `select table_name from information_schema.tables
              where table_schema = 'public' and table_name = any($1)`,
            [REQUIRED_TABLES],
          );
          const applied = new Set(mig.map((r) => r.name));
          const tables = new Set(tbl.map((r) => r.table_name));
          const m0014 = applied.has("0014_calendar.sql");
          const m0015 = applied.has("0015_finance.sql");
          const m0016 = applied.has("0016_resources.sql");
          const has0015 = tables.has("ledger_accounts");
          const schemaOk =
            m0014 &&
            m0015 &&
            m0016 &&
            REQUIRED_TABLES.every((name) => tables.has(name));
          const standalone = isStandalone();
          const shaOk = !standalone || shaSource === "image";
          const ok = schemaOk && shaOk;
          const engine = postgresUrl() ? (standalone ? "postgres" : "neon") : "pglite";
          const vandar = vandarStatus();
          return Response.json(
            {
              ok,
              app: "kasbokar-map-nav-v1",
              db: has0015 ? `${engine}+0015` : engine,
              standalone,
              homeSearchVersion: HOME_SEARCH_VERSION,
              financeCore: "ledger-v1-vandar-disabled",
              bookingCalendar: "jalali-month-v1",
              nav: "reload-home-v1",
              vandar: vandar.mode,
              shaSource,
              m0014,
              m0015,
              m0016,
              business_special_hours: tables.has("business_special_hours"),
              booking_holds: tables.has("booking_holds"),
              ledger_accounts: tables.has("ledger_accounts"),
              business_resources: tables.has("business_resources"),
              resource_service_map: tables.has("resource_service_map"),
              ...(sha ? { sha } : {}),
            },
            {
              status: ok ? 200 : 503,
              headers: { "Cache-Control": "no-store" },
            },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "db";
          return Response.json(
            { ok: false, error: message.slice(0, 120) },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
