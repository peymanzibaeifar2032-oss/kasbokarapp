import { createFileRoute } from "@tanstack/react-router";
import { isStandalone } from "@/lib/env.server";
import { HOME_SEARCH_VERSION } from "@/lib/search/home-search";

/** Production health. homeSearchVersion proves this build, not only GIT_SHA env. */

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSql } = await import("@/lib/db");
          const { postgresUrl } = await import("@/lib/env.server");
          const sql = await getSql();
          await sql.query("select 1 as ok");
          const sha = (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim();
          return Response.json(
            {
              ok: true,
              app: "kasbokar",
              db: postgresUrl() ? (isStandalone() ? "postgres" : "neon") : "pglite",
              standalone: isStandalone(),
              homeSearchVersion: HOME_SEARCH_VERSION,
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
