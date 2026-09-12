import { createFileRoute } from "@tanstack/react-router";
import { traceHomeSearch } from "@/lib/search/home-search";
import { VISIBLE_SQL, mapBusiness, BIZ_SELECT_JOINED, REVIEWS_AGG_JOIN, type BizRow } from "@/lib/server/db-map";

export const Route = createFileRoute("/api/search-trace")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "";
        const explicit = url.searchParams.get("explicitCategory") === "1";
        const rawCat = url.searchParams.get("categoryId");
        const categoryId = rawCat ? Number(rawCat) : undefined;
        const city = url.searchParams.get("city") || "کرمانشاه";
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        const rows = await sql.query<BizRow>(
          `select ${BIZ_SELECT_JOINED}
           from businesses b
           join categories c on c.id = b.category_id
           ${REVIEWS_AGG_JOIN}
           where ${VISIBLE_SQL}
             and b.city = $1
           order by b.id asc
           limit 80`,
          [city],
        );
        const items = rows.map(mapBusiness);
        const report = traceHomeSearch(items, {
          q,
          categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
          explicitCategory: explicit,
        });
        const sha = (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim();
        return Response.json(
          { ok: true, sha, city, ...report },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
