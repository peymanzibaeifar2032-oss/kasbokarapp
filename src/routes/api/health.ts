import { createFileRoute } from "@tanstack/react-router";
import { isStandalone } from "@/lib/env.server";
import { HOME_SEARCH_VERSION } from "@/lib/search/home-search";

/** Production health. Markers in `app`/`db` survive JSON field stripping. */

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
          const sha = (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim();
          const ledger = await sql.query<{ n: string }>(
            `select count(*)::text as n from information_schema.tables
              where table_schema = 'public' and table_name = 'ledger_accounts'`,
          );
          const has0015 = Number(ledger[0]?.n || 0) > 0;
          const engine = postgresUrl() ? (isStandalone() ? "postgres" : "neon") : "pglite";
          const vandar = vandarStatus();
          return Response.json(
            {
              ok: true,
              app: "kasbokar-jalali-month-v1",
              db: has0015 ? `${engine}+0015` : engine,
              standalone: isStandalone(),
              homeSearchVersion: HOME_SEARCH_VERSION,
              financeCore: "ledger-v1-vandar-disabled",
              bookingCalendar: "jalali-month-v1",
              vandar: vandar.mode,
              ...(sha ? { sha } : {}),
            },
            { headers: { "Cache-Control": "no-store" } },
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
