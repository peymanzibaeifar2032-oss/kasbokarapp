import { createFileRoute } from "@tanstack/react-router";
import { expandQuery } from "@/lib/search-engine/expand";
import { cacheGet, cacheSet } from "@/lib/search-engine/cache";

export const Route = createFileRoute("/api/search-engine")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type") || "youtube";
        const q = (url.searchParams.get("q") || "").trim();
        const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
        if (!q) return Response.json({ ok: false, error: "کلمه جستجو خالی است." }, { status: 400 });

        const expanded = expandQuery(q);
        const cacheKey = `${type}:${expanded.join("|")}:${page}`;
        const cached = cacheGet(cacheKey);
        if (cached) return Response.json({ ok: true, cached: true, ...cached as object });

        try {
          let result;
          if (type === "youtube") result = await searchYouTube(expanded, page, url.searchParams);
          else if (type === "github") result = await searchGitHub(expanded, page, url.searchParams);
          else if (type === "resources") result = await searchResources(expanded, page);
          else return Response.json({ ok: false, error: "نوع جستجو نامعتبر است." }, { status: 400 });

          cacheSet(cacheKey, result, type === "github" ? 30 * 60_000 : 10 * 60_000);
          return Response.json({ ok: true, cached: false, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "خطای ناشناخته";
          return Response.json({ ok: false, error: `خطا در دریافت نتایج: ${msg}` }, { status: 502 });
        }
      },
    },
  },
});

async function searchYouTube(queries: string[], page: number, params: URLSearchParams) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return {
      source: "youtube",
      note: "کلید YouTube Data API در سرور تنظیم نشده. نتایج جستجوی مستقیم یوتیوب نمایش داده می‌شود.",
      items: queries.slice(0, 3).map((q) => ({
        id: `search-${encodeURIComponent(q)}`,
        title: `جستجوی «${q}» در یوتیوب`,
        channel: "YouTube",
        thumbnail: "",
        duration: "",
        views: "",
        published: "",
        summary: `برای دیدن ویدیوهای آموزشی مرتبط با «${q}» روی دکمه زیر بزنید.`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " tutorial")}`,
        type: "search",
      })),
    };
  }

  const lang = params.get("lang") || "both";
  const order = params.get("order") || "relevance";
  const duration = params.get("duration") || "";
  const playlist = params.get("playlist") === "1";

  const all: unknown[] = [];
  for (const q of queries.slice(0, 3)) {
    const u = new URL("https://www.googleapis.com/youtube/v3/search");
    u.searchParams.set("part", "snippet");
    u.searchParams.set("q", q);
    u.searchParams.set("type", playlist ? "playlist" : "video");
    u.searchParams.set("maxResults", "8");
    u.searchParams.set("order", order);
    u.searchParams.set("key", key);
    if (lang === "fa") u.searchParams.set("relevanceLanguage", "fa");
    if (lang === "en") u.searchParams.set("relevanceLanguage", "en");
    if (duration) u.searchParams.set("videoDuration", duration);
    const r = await fetch(u);
    if (!r.ok) continue;
    const data = await r.json();
    for (const item of data.items || []) {
      const id = item.id?.videoId || item.id?.playlistId;
      if (!id) continue;
      all.push({
        id,
        title: item.snippet?.title || "",
        channel: item.snippet?.channelTitle || "",
        thumbnail: item.snippet?.thumbnails?.medium?.url || "",
        duration: "",
        views: "",
        published: item.snippet?.publishedAt || "",
        summary: (item.snippet?.description || "").slice(0, 140),
        url: playlist
          ? `https://www.youtube.com/playlist?list=${id}`
          : `https://www.youtube.com/watch?v=${id}`,
        type: playlist ? "playlist" : "video",
      });
    }
  }

  const seen = new Set<string>();
  const items = all.filter((it) => {
    const id = (it as { id: string }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { source: "youtube", items, page };
}

async function searchGitHub(queries: string[], page: number, params: URLSearchParams) {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "kasbokar-search" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const onlyApk = params.get("apk") === "1";
  const recent = params.get("recent") === "1";
  const sort = params.get("sort") || "stars";

  const repos: unknown[] = [];
  for (const q of queries.slice(0, 2)) {
    const u = new URL("https://api.github.com/search/repositories");
    u.searchParams.set("q", `${q} in:name,description`);
    u.searchParams.set("sort", sort === "updated" ? "updated" : "stars");
    u.searchParams.set("per_page", "8");
    u.searchParams.set("page", String(page));
    const r = await fetch(u, { headers });
    if (!r.ok) continue;
    const data = await r.json();
    for (const repo of data.items || []) {
      repos.push(repo);
    }
  }

  const seen = new Set<string>();
  const unique = repos.filter((r) => {
    const full = (r as { full_name: string }).full_name;
    if (seen.has(full)) return false;
    seen.add(full);
    return true;
  });

  const items = [];
  for (const repo of unique.slice(0, 12)) {
    const r = repo as {
      full_name: string;
      owner: { login: string };
      stargazers_count: number;
      description: string | null;
      html_url: string;
      updated_at: string;
    };
    let apk: { name: string; size: number; url: string; version: string; published: string } | null = null;
    try {
      const rel = await fetch(`https://api.github.com/repos/${r.full_name}/releases/latest`, { headers });
      if (rel.ok) {
        const release = await rel.json();
        const asset = (release.assets || []).find((a: { name: string }) => a.name.toLowerCase().endsWith(".apk"));
        if (asset) {
          apk = {
            name: asset.name,
            size: asset.size,
            url: asset.browser_download_url,
            version: release.tag_name || "",
            published: release.published_at || "",
          };
        }
      }
    } catch {
      /* ignore */
    }

    if (onlyApk && !apk) continue;
    if (recent) {
      const days = (Date.now() - new Date(r.updated_at).getTime()) / 86_400_000;
      if (days > 30) continue;
    }

    items.push({
      name: r.full_name.split("/")[1],
      owner: r.owner.login,
      stars: r.stargazers_count,
      description: r.description || "",
      summary: (r.description || "پروژهٔ متن‌باز").slice(0, 160),
      url: r.html_url,
      updated: r.updated_at,
      apk,
      warning: apk ? "قبل از نصب SHA-256 را بررسی کنید و فقط از توسعه‌دهندهٔ رسمی دانلود کنید." : null,
    });
  }

  items.sort((a, b) => {
    if (a.apk && !b.apk) return -1;
    if (!a.apk && b.apk) return 1;
    return (b.stars || 0) - (a.stars || 0);
  });

  return { source: "github", items, page };
}

async function searchResources(queries: string[], page: number) {
  const q = queries[0] || "";
  const items: unknown[] = [];

  // Wikipedia (FA + EN)
  for (const lang of ["fa", "en"]) {
    try {
      const u = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=5&origin=*`;
      const r = await fetch(u);
      if (r.ok) {
        const data = await r.json();
        for (const hit of data.query?.search || []) {
          items.push({
            title: hit.title,
            source: `Wikipedia (${lang})`,
            type: "article",
            free: true,
            summary: (hit.snippet || "").replace(/<[^>]+>/g, "").slice(0, 140),
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // arXiv
  try {
    const u = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=5`;
    const r = await fetch(u);
    if (r.ok) {
      const text = await r.text();
      const entries = text.split("<entry>").slice(1);
      for (const entry of entries.slice(0, 5)) {
        const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1]?.replace(/\s+/g, " ").trim() || "";
        const summary = (entry.match(/<summary>([^<]+)<\/summary>/) || [])[1]?.replace(/\s+/g, " ").trim().slice(0, 140) || "";
        const id = (entry.match(/<id>([^<]+)<\/id>/) || [])[1] || "";
        if (title) {
          items.push({
            title,
            source: "arXiv",
            type: "paper",
            free: true,
            summary,
            url: id,
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  // OpenAlex
  try {
    const u = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=5`;
    const r = await fetch(u, { headers: { "User-Agent": "kasbokar-search" } });
    if (r.ok) {
      const data = await r.json();
      for (const work of data.results || []) {
        items.push({
          title: work.display_name || "",
          source: "OpenAlex",
          type: "paper",
          free: Boolean(work.open_access?.is_oa),
          summary: (work.abstract_inverted_index ? "مقالهٔ پژوهشی" : "منبع پژوهشی").slice(0, 140),
          url: work.id || work.doi || "",
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Direct search links for sites without simple API
  const links = [
    { title: `جستجو در MIT OpenCourseWare`, source: "MIT OCW", type: "course", free: true, url: `https://ocw.mit.edu/search/?q=${encodeURIComponent(q)}` },
    { title: `جستجو در Khan Academy`, source: "Khan Academy", type: "course", free: true, url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(q)}` },
    { title: `جستجو در freeCodeCamp`, source: "freeCodeCamp", type: "course", free: true, url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(q)}` },
    { title: `جستجو در ویکی‌پدیا فارسی`, source: "Wikipedia FA", type: "article", free: true, url: `https://fa.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` },
  ];
  for (const link of links) {
    items.push({ ...link, summary: "لینک جستجوی مستقیم در منبع رایگان" });
  }

  return { source: "resources", items, page };
}
