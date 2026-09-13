import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/geo-stats")({
  server: {
    handlers: {
      GET: async () => {
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        const rows = await sql.query<{ type: string; n: number }>(
          `select type, count(*)::int as n from geo_places group by type`,
        );
        const orphans = await sql.query<{ n: number }>(
          `select count(*)::int as n from geo_places p
           where p.type <> 'province'
             and (p.parent_id is null or p.parent_id = ''
               or not exists (select 1 from geo_places x where x.id = p.parent_id))`,
        );
        const dupes = await sql.query<{ n: number }>(
          `select count(*)::int as n from (
             select normalized_name, type, province_id, county_id, count(*) c
             from geo_places group by 1,2,3,4 having count(*) > 1
           ) d`,
        );
        const byType: Record<string, number> = {};
        for (const r of rows) byType[r.type] = r.n;
        const sha = (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim();
        return Response.json(
          {
            ok: true,
            sha: sha || undefined,
            province_count: byType.province ?? 0,
            county_count: byType.county ?? 0,
            district_count: byType.district ?? 0,
            city_count: byType.city ?? 0,
            rural_district_count: byType.rural_district ?? 0,
            village_count: byType.village ?? 0,
            orphan_count: orphans[0]?.n ?? 0,
            duplicate_count: dupes[0]?.n ?? 0,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
