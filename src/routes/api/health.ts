import { createFileRoute } from "@tanstack/react-router";
import { env, isStandalone, postgresUrl } from "@/lib/env.server";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          await sql.query("select 1 as ok");
          return Response.json(
            {
              ok: true,
              app: "kasbokar",
              db: postgresUrl() ? "neon" : "pglite",
              standalone: isStandalone(),
              env: {
                DATABASE_URL: Boolean(env("DATABASE_URL")),
                NETLIFY_DATABASE_URL: Boolean(env("NETLIFY_DATABASE_URL")),
                NETLIFY_DB_URL: Boolean(env("NETLIFY_DB_URL")),
                BETTER_AUTH_SECRET: Boolean(env("BETTER_AUTH_SECRET")),
                STANDALONE: env("STANDALONE") ?? null,
              },
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "db";
          return Response.json(
            {
              ok: false,
              error: message.slice(0, 160),
              env: {
                DATABASE_URL: Boolean(env("DATABASE_URL")),
                NETLIFY_DATABASE_URL: Boolean(env("NETLIFY_DATABASE_URL")),
                NETLIFY_DB_URL: Boolean(env("NETLIFY_DB_URL")),
                BETTER_AUTH_SECRET: Boolean(env("BETTER_AUTH_SECRET")),
                STANDALONE: env("STANDALONE") ?? null,
              },
            },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
