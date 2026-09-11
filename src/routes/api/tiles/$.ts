import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env.server";
import {
  fillTileTemplate,
  isSafeTileTemplate,
  STANDALONE_UPSTREAM_CANDIDATES,
} from "@/lib/map/tiles";

const UA = "KasbokarApp/1.0 (https://kasbokarapp.com; tile-proxy) Mozilla/5.0";
const FETCH_MS = 7000;

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

let cachedUpstream: string | null = null;

function needsPaidKey(url: string): boolean {
  return /carto(cdn)?\.com|maptiler\.com|stadiamaps\.com|geoapify\.com|jawg\.io/i.test(url);
}

function candidateUpstreams(): string[] {
  const hasKey = Boolean(env("MAP_TILE_PROXY_KEY")?.trim());
  const fromEnv = [
    env("MAP_TILE_PROXY_UPSTREAM")?.trim(),
    env("MAP_TILE_URL")?.trim(),
  ].filter((u): u is string => Boolean(u && isSafeTileTemplate(u) && (hasKey || !needsPaidKey(u))));
  const standalone = env("STANDALONE") === "true" || env("STANDALONE") === "1";
  const rest = standalone ? [...STANDALONE_UPSTREAM_CANDIDATES] : [];
  const all = [...fromEnv, ...rest.filter((u) => !fromEnv.includes(u) && (hasKey || !needsPaidKey(u)))];
  if (cachedUpstream && all.includes(cachedUpstream) && (hasKey || !needsPaidKey(cachedUpstream))) {
    return [cachedUpstream, ...all.filter((u) => u !== cachedUpstream)];
  }
  return all;
}

function looksLikeErrorTile(buf: ArrayBuffer): boolean {
  const s = Buffer.from(buf).toString("latin1").toLowerCase();
  return /api key required|missing api key|invalid api key|maptiler|provide an api key/.test(s);
}

async function fetchImage(
  url: string,
  extra: Record<string, string>,
): Promise<{ buf: ArrayBuffer; type: string } | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/png,image/jpeg,image/*;q=0.8,*/*;q=0.3",
      ...extra,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "";
  if (type && !type.startsWith("image/") && !type.includes("octet-stream")) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 80) return null;
  if (looksLikeErrorTile(buf)) return null;
  return { buf, type: type.startsWith("image/") ? type : "image/png" };
}

export const Route = createFileRoute("/api/tiles/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).pathname;
        const zxy = parseZxy(path);
        if (!zxy) {
          return Response.json({ error: "کاشی نامعتبر است." }, { status: 400 });
        }
        const list = candidateUpstreams();
        if (list.length === 0) {
          return Response.json(
            { error: "پروکسی کاشی نقشه روی این سرور تنظیم نشده." },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
        const extra: Record<string, string> = {};
        const apiKey = env("MAP_TILE_PROXY_KEY");
        const apiHeader = env("MAP_TILE_PROXY_KEY_HEADER") || "x-api-key";
        if (apiKey) extra[apiHeader] = apiKey;
        for (const tpl of list) {
          try {
            const url = fillTileTemplate(tpl, zxy.z, zxy.x, zxy.y);
            const got = await fetchImage(url, extra);
            if (!got) continue;
            cachedUpstream = tpl;
            return new Response(got.buf, {
              status: 200,
              headers: {
                "Content-Type": got.type,
                "Cache-Control": "public, max-age=86400",
              },
            });
          } catch {
            /* try next provider */
          }
        }
        return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
