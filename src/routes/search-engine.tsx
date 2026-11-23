import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Search, Youtube, Github, BookOpen, ExternalLink, Star, Download, Loader2, Moon, Sun, Heart, Clock } from "lucide-react";

export const Route = createFileRoute("/search-engine")({
  head: () => ({
    meta: [
      { title: "موتور جستجوی منابع | یوتیوب، گیت‌هاب، آموزش رایگان" },
      { name: "description", content: "جستجوی دوزبانه آموزش‌های یوتیوب، آخرین APKهای گیت‌هاب و منابع آموزشی رایگان." },
    ],
  }),
  component: SearchEngine,
});

type Tab = "youtube" | "github" | "resources";

const SUGGESTIONS = ["VPN", "وی پی ان", "تاتو", "هوش مصنوعی", "اندروید", "Python", "آموزش برنامه‌نویسی", "Hiddify"];

function SearchEngine() {
  const [tab, setTab] = useState<Tab>("youtube");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<unknown[]>([]);
  const [note, setNote] = useState("");
  const [dark, setDark] = useState(true);
  const [recent, setRecent] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("se-recent") || "[]"));
      setFavs(JSON.parse(localStorage.getItem("se-favs") || "[]"));
      const theme = localStorage.getItem("se-theme");
      if (theme === "light") setDark(false);
    } catch { /* ignore */ }
  }, []);

  const saveRecent = (term: string) => {
    const next = [term, ...recent.filter((x) => x !== term)].slice(0, 8);
    setRecent(next);
    localStorage.setItem("se-recent", JSON.stringify(next));
  };

  const toggleFav = (url: string) => {
    const next = favs.includes(url) ? favs.filter((x) => x !== url) : [url, ...favs].slice(0, 50);
    setFavs(next);
    localStorage.setItem("se-favs", JSON.stringify(next));
  };

  const search = useCallback(async (term?: string) => {
    const query = (term ?? q).trim();
    if (!query) return;
    setLoading(true);
    setError("");
    setItems([]);
    setNote("");
    try {
      const r = await fetch(`/api/search-engine?type=${tab}&q=${encodeURIComponent(query)}&page=1`);
      const data = await r.json();
      if (!data.ok) {
        setError(data.error || "خطا در جستجو");
      } else {
        setItems(data.items || []);
        setNote(data.note || "");
        saveRecent(query);
      }
    } catch {
      setError("اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }, [q, tab, recent]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("se-theme", next ? "dark" : "light");
  };

  return (
    <div dir="rtl" className={`min-h-dvh font-[Vazirmatn] ${dark ? "bg-[#0b0e14] text-white" : "bg-gray-50 text-gray-900"}`}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/vazirmatn/index.css" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">موتور جستجوی منابع</h1>
          <button onClick={toggleTheme} className="rounded-xl p-2 hover:bg-white/10">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Search box */}
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="جستجو به فارسی یا انگلیسی…"
            className={`w-full rounded-2xl border px-5 py-4 pr-12 text-base outline-none ${
              dark ? "border-white/15 bg-white/5 placeholder:text-white/40" : "border-gray-300 bg-white"
            }`}
          />
          <button onClick={() => search()} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-teal-600 p-2 text-white">
            <Search className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([
            ["youtube", "یوتیوب", Youtube],
            ["github", "گیت‌هاب APK", Github],
            ["resources", "منابع رایگان", BookOpen],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setItems([]); setError(""); }}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition ${
                tab === id
                  ? "bg-teal-600 text-white"
                  : dark ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-white text-gray-700 border"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Suggestions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setQ(s); search(s); }}
              className={`rounded-full px-3 py-1 text-xs ${dark ? "bg-white/10 hover:bg-white/20" : "bg-gray-200 hover:bg-gray-300"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Recent */}
        {recent.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/50">
            <Clock className="size-3.5" />
            {recent.slice(0, 5).map((r) => (
              <button key={r} onClick={() => { setQ(r); search(r); }} className="underline-offset-2 hover:underline">
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        {loading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/60">
            <Loader2 className="size-5 animate-spin" /> در حال جستجو…
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
        {note && !error && (
          <p className="mt-4 text-xs text-amber-300">{note}</p>
        )}

        {/* Results */}
        <div className="mt-6 space-y-3">
          {items.map((raw, i) => (
            <ResultCard key={i} item={raw} tab={tab} dark={dark} fav={favs.includes((raw as { url?: string }).url || "")} onFav={toggleFav} />
          ))}
          {!loading && items.length === 0 && q && !error && (
            <p className="text-center text-sm text-white/40">نتیجه‌ای پیدا نشد. کلمه دیگری امتحان کنید.</p>
          )}
        </div>

        {/* Favorites */}
        {favs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70">
              <Heart className="size-4 text-pink-400" /> علاقه‌مندی‌ها
            </h2>
            <div className="flex flex-wrap gap-2">
              {favs.slice(0, 10).map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="truncate rounded-lg bg-white/5 px-2 py-1 text-xs text-teal-300 hover:underline" style={{ maxWidth: 200 }}>
                  {url.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ResultCard({ item, tab, dark, fav, onFav }: { item: unknown; tab: Tab; dark: boolean; fav: boolean; onFav: (url: string) => void }) {
  const it = item as Record<string, unknown>;
  const url = String(it.url || "");

  if (tab === "youtube") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl border p-3 ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
        <div className="flex gap-3">
          {it.thumbnail ? <img src={String(it.thumbnail)} alt="" className="h-20 w-32 rounded-xl object-cover" /> : <div className="grid h-20 w-32 place-items-center rounded-xl bg-red-600/20"><Youtube className="size-8 text-red-400" /></div>}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{String(it.title || "")}</p>
            <p className="mt-1 text-xs text-white/50">{String(it.channel || "")}</p>
            {it.summary ? <p className="mt-1 line-clamp-2 text-xs text-white/60">{String(it.summary)}</p> : null}
          </div>
        </div>
      </a>
    );
  }

  if (tab === "github") {
    const apk = it.apk as { url?: string; version?: string; size?: number; name?: string } | null;
    return (
      <div className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{String(it.name || "")}</p>
            <p className="text-xs text-white/50">{String(it.owner || "")}</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-amber-300">
            <Star className="size-3.5" /> {String(it.stars || 0)}
          </span>
        </div>
        {it.summary ? <p className="mt-2 text-sm text-white/70">{String(it.summary)}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {apk ? (
            <a href={apk.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
              <Download className="size-3.5" /> دانلود APK {apk.version ? `(${apk.version})` : ""}
            </a>
          ) : (
            <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs">No APK</span>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-1.5 text-xs">
            <ExternalLink className="size-3.5" /> صفحهٔ گیت‌هاب
          </a>
          <button onClick={() => onFav(url)} className="rounded-xl p-1.5 hover:bg-white/10">
            <Heart className={`size-4 ${fav ? "fill-pink-400 text-pink-400" : "text-white/40"}`} />
          </button>
        </div>
        {it.warning ? <p className="mt-2 text-[11px] text-amber-200/80">{String(it.warning)}</p> : null}
      </div>
    );
  }

  // resources
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{String(it.title || "")}</p>
        {it.free ? <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">رایگان</span> : null}
      </div>
      <p className="mt-1 text-xs text-white/50">{String(it.source || "")} · {String(it.type || "")}</p>
      {it.summary ? <p className="mt-1 line-clamp-2 text-xs text-white/60">{String(it.summary)}</p> : null}
    </a>
  );
}
