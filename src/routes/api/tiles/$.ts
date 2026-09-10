import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env.server";
import { fillTileTemplate, isSafeTileTemplate } from "@/lib/map/tiles";

const UA = "KasbokarApp/1.0 (https://kasbokarapp.com; tile-proxy)";

function parseZxy(pathname: string): { z: number; x: number; y: number } | null {
  const m = pathname.match(/\/api\/tiles\/(\d+)\/(\d+)\/(\d+)(?:\.png)?\/?$/);
  if (!m) return null;
  const z = Number(m[1]);
  const x = Number(m[2]);
  const y = Number(m[3]);
  if (![z, x, y].every((n) => Number.isInteger(n) && n >= 0)) return null;
  if (z > 22) return null;
  const max = 2 ** z;
  if (x >= max || y >= max) return null;
  return { z, x, y };
}

export const Route = createFileRoute("/api/tiles/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const upstream = env("MAP_TILE_PROXY_UPSTREAM");
        if (!upstream || !isSafeTileTemplate(upstream)) {
          return Response.json(
            { error: "پروکسی کاشی نقشه روی این سرور تنظیم نشده." },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
        const path = new URL(request.url).pathname;
        const zxy = parseZxy(path);
        if (!zxy) {
          return Response.json({ error: "کاشی نامعتبر است." }, { status: 400 });
        }
        const url = fillTileTemplate(upstream, zxy.z, zxy.x, zxy.y);
        const headers: Record<string, string> = { "User-Agent": UA, Accept: "image/*" };
        const apiKey = env("MAP_TILE_PROXY_KEY");
        const apiHeader = env("MAP_TILE_PROXY_KEY_HEADER") || "x-api-key";
        if (apiKey) headers[apiHeader] = apiKey;
        try {
          const res = await fetch(url, { headers, redirect: "follow" });
          if (!res.ok) {
            return new Response(null, { status: res.status === 404 ? 404 : 502 });
          }
          const buf = await res.arrayBuffer();
          const type = res.headers.get("content-type") || "image/png";
          return new Response(buf, {
            status: 200,
            headers: {
              "Content-Type": type,
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch {
          return new Response(null, { status: 502 });
        }
      },
    },
  },
});
