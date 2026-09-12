import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Coffee,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  LocateFixed,
  MapPin,
  Scale,
  Scissors,
  Search,
  ShoppingBag,
  Store,
  Utensils,
  Wrench,
  Building2,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { BusinessCard } from "@/components/business/card";
import { BusinessMap } from "@/components/map/business-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/input";
import { useFavorites } from "@/lib/favorites";
import { KERMANSHAH_CENTER, PROVINCES } from "@/lib/data/catalog";
import { haversineKm } from "@/lib/format";
import { hasSlotToday, isOpenNow } from "@/lib/hours";
import { t } from "@/lib/i18n";
import { parseSearchQuery } from "@/lib/search/parse-query";
import { listBusinesses, listCategories } from "@/lib/server/api";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACE_KEY = "kasb:place";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [categories, items] = await Promise.all([
      listCategories(),
      listBusinesses({ data: { province: "کرمانشاه", city: "کرمانشاه" } }),
    ]);
    return { categories, items };
  },
  component: Home,
});

const ICONS: Record<string, typeof Store> = {
  scissors: Scissors,
  "heart-pulse": HeartPulse,
  laptop: Laptop,
  wrench: Wrench,
  "shopping-bag": ShoppingBag,
  house: House,
  utensils: Utensils,
  coffee: Coffee,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  "building-2": Building2,
  scale: Scale,
  store: Store,
};

function Home() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const favs = useFavorites();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [province, setProvince] = useState("کرمانشاه");
  const [city, setCity] = useState("کرمانشاه");
  const [bannerOn, setBannerOn] = useState(true);
  const categories = initial.categories;
  const [items, setItems] = useState<Business[]>(initial.items);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState(KERMANSHAH_CENTER);
  const [mapCenter, setMapCenter] = useState(KERMANSHAH_CENTER);
  const [zoom, setZoom] = useState(12);
  const [openNow, setOpenNow] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [hasOffer, setHasOffer] = useState(false);
  const [todaySlot, setTodaySlot] = useState(false);
  const [sort, setSort] = useState<"relevance" | "distance" | "new">("relevance");
  const [maxKm, setMaxKm] = useState(0);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [viewKey, setViewKey] = useState(0);
  const skipFirstFetch = useRef(true);
  const cities = useMemo(() => PROVINCES.find((p) => p.name === province)?.cities ?? [], [province]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLACE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { province?: string; city?: string };
      if (saved.province) setProvince(saved.province);
      if (saved.city) setCity(saved.city);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PLACE_KEY, JSON.stringify({ province, city }));
    } catch {
      /* ignore */
    }
  }, [province, city]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const parsed = parseSearchQuery(debouncedQ);
    if (parsed.openNow) setOpenNow(true);
    if (parsed.categoryId) setCategoryId(parsed.categoryId);
    if (parsed.province) setProvince(parsed.province);
    if (parsed.city) setCity(parsed.city);
  }, [debouncedQ]);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listBusinesses({
      data: {
        q: debouncedQ,
        categoryId,
        province: province || undefined,
        city: city || undefined,
        originLat: userPos?.lat,
        originLng: userPos?.lng,
        openNow,
        sort,
      },
    })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, categoryId, province, city, userPos, openNow, sort]);

  useEffect(() => {
    const p = PROVINCES.find((x) => x.name === province);
    if (p) {
      setCenter({ lat: p.lat, lng: p.lng });
      setMapCenter({ lat: p.lat, lng: p.lng });
      setZoom(city ? 13 : 11);
      setViewKey((k) => k + 1);
    }
  }, [province, city]);

  const refPos = userPos ?? mapCenter;

  const filtered = useMemo(() => {
    let rows = items;
    if (openNow) rows = rows.filter((b) => isOpenNow(b.workHours));
    if (hasOffer) rows = rows.filter((b) => Boolean(b.offerText));
    if (todaySlot) rows = rows.filter((b) => hasSlotToday(b));
    if (onlyFav) rows = rows.filter((b) => favs.has(b.id));
    if (maxKm > 0) {
      rows = rows.filter((b) => haversineKm(refPos, { lat: b.latitude, lng: b.longitude }) <= maxKm);
    }
    const next = [...rows];
    if (sort === "distance") {
      next.sort(
        (a, b) =>
          haversineKm(refPos, { lat: a.latitude, lng: a.longitude }) -
          haversineKm(refPos, { lat: b.latitude, lng: b.longitude }),
      );
    } else if (sort === "new") {
      next.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return next;
  }, [items, openNow, hasOffer, todaySlot, onlyFav, sort, refPos, favs, maxKm]);

  const selected = filtered.find((b) => b.id === selectedId) ?? null;

  function locate() {
    setGeoBusy(true);
    setGeoMsg(null);

    if (typeof window !== "undefined" && window.self !== window.top) {
      setGeoBusy(false);
      const msg = "در این نمایش توکار، موقعیت گوشی در دسترس نیست. پین را روی نقشه بگذارید.";
      setGeoMsg(msg);
      toast.error(msg);
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGeoBusy(false);
      const msg =
        "موقعیت دقیق گوشی فقط بعد از اتصال دامنه و HTTPS کار می‌کند. فعلاً شهر را انتخاب کنید یا پین را روی نقشه جابه‌جا کنید.";
      setGeoMsg(msg);
      toast.message(msg);
      return;
    }

    if (!navigator.geolocation) {
      setGeoBusy(false);
      const msg = "این مرورگر موقعیت مکانی ندارد.";
      setGeoMsg(msg);
      toast.error(msg);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(next);
        setCenter(next);
        setMapCenter(next);
        setZoom(15);
        setViewKey((k) => k + 1);
        setSort("distance");
        setGeoMsg(null);
        setGeoBusy(false);
        toast.success("موقعیت شما روی نقشه آمد.");
      },
      (err) => {
        setGeoBusy(false);
        let msg = "موقعیت گرفته نشد. دوباره بزنید.";
        if (err?.code === 1) msg = "اجازهٔ موقعیت رد شد. از تنظیمات مرورگر برای این سایت اجازه بدهید.";
        if (err?.code === 2) msg = "GPS در دسترس نیست. مکان را روی نقشه انتخاب کنید.";
        if (err?.code === 3) msg = "زمان موقعیت تمام شد. دوباره بزنید.";
        setGeoMsg(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  }

  function pickOnMap(id: string) {
    if (addMode) return;
    setSelectedId(id);
    document.getElementById(`biz-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function startAddMode() {
    setAddMode(true);
    setPicked(mapCenter);
    toast.message("نقشه را حرکت دهید تا علامت نارنجی روی محل باشد، بعد «انتخاب این نقطه» را بزنید.");
    window.setTimeout(() => {
      document.getElementById("map-pick")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  }

  function addPicked(fromCenter = false) {
    const pin = fromCenter ? mapCenter : (picked ?? mapCenter);
    toast.success("محل انتخاب شد. مشخصات کسب‌وکار را کامل کنید.");
    void navigate({ to: "/dashboard", search: { lat: pin.lat, lng: pin.lng } });
  }

  return (
    <Shell>
      <section>
        <p className="inline-flex items-center gap-1.5 text-sm text-accent">
          <MapPin className="size-4" />
          کسب‌وکارهای اطراف شما
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight md:text-4xl">
          هر چیزی که نیاز دارید، همین نزدیکی است.
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          روی نقشه پیدا کنید، اطلاعات کامل را ببینید و مستقیم وقت بگیرید.
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="نام کسب‌وکار یا خدمت را بنویسید…"
            className="pr-11"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NativeSelect
            value={province}
            onChange={(e) => {
              const next = e.target.value;
              setProvince(next);
              const loc = PROVINCES.find((p) => p.name === next);
              setCity(loc?.cities[0] ?? "");
              setBannerOn(true);
            }}
            aria-label="استان"
          >
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={categoryId ? String(categoryId) : ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            aria-label="دسته"
          >
            <option value="">همه دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button type="button" variant={sort === "distance" ? "default" : "outline"} onClick={locate} disabled={geoBusy}>
            <LocateFixed className="size-4" />
            {geoBusy ? "در حال یافتن…" : "نزدیک‌تر"}
          </Button>
          <NativeSelect
            value={String(maxKm)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMaxKm(v);
              if (v > 0) setSort("distance");
            }}
            aria-label="فاصله"
          >
            <option value="0">هر فاصله‌ای</option>
            <option value="1">تا ۱ کیلومتر</option>
            <option value="3">تا ۳ کیلومتر</option>
            <option value="5">تا ۵ کیلومتر</option>
            <option value="10">تا ۱۰ کیلومتر</option>
          </NativeSelect>
          <NativeSelect value={city} onChange={(e) => setCity(e.target.value)} aria-label="شهرستان">
            <option value="">شهرستان‌ها</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
      </section>

      <section id="cats" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <CatChip active={!categoryId} label="همه" icon={Store} onClick={() => setCategoryId(undefined)} />
        {categories.map((c) => {
          const Icon = ICONS[c.icon] ?? Store;
          return (
            <CatChip
              key={c.id}
              active={categoryId === c.id}
              label={c.name}
              icon={Icon}
              onClick={() => setCategoryId(c.id)}
            />
          );
        })}
      </section>

      {bannerOn && province ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
          <p>نقشه روی {city ? `شهر ${city}` : `استان ${province}`} تنظیم شد.</p>
          <button type="button" onClick={() => setBannerOn(false)} aria-label="بستن">
            ×
          </button>
        </div>
      ) : null}

      {geoMsg ? (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
          <p>{geoMsg}</p>
          <button type="button" className="text-accent" onClick={() => setGeoMsg(null)} aria-label="بستن">
            ×
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong>{loading ? "در حال دریافت…" : `${toFa(filtered.length)} کسب‌وکار`}</strong>
          <p className="text-sm text-muted">متناسب با فیلترهای شما</p>
        </div>
        <Button type="button" variant={addMode ? "default" : "outline"} onClick={startAddMode}>
          <Plus className="size-4" />
          {addMode ? "در حال انتخاب محل…" : "افزودن محل کسب‌وکار روی نقشه"}
        </Button>
      </div>

      <section id="map-pick" className="mt-4">
        <div className="relative isolate h-[min(62dvh,480px)] overflow-hidden rounded-2xl border border-border">
          <div className="absolute inset-0 z-0">
            <BusinessMap
              businesses={filtered}
              center={center}
              zoom={zoom}
              viewKey={viewKey}
              selectedId={selectedId}
              onSelect={pickOnMap}
              userPos={userPos}
              pickMode={addMode}
              picked={addMode ? null : picked}
              onPick={(lat, lng) => {
                setAddMode(true);
                setPicked({ lat, lng });
                toast.message("پین گذاشته شد. اگر دقیق است «انتخاب این نقطه» را بزنید.");
              }}
              onCenterChange={(lat, lng) => setMapCenter({ lat, lng })}
              className="h-full"
            />
          </div>
          {addMode ? (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
              <span className="kasb-crosshair" aria-hidden />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col items-end gap-2">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 max-w-full items-center gap-2 rounded-2xl bg-primary px-3 text-xs text-primary-fg shadow-md"
              onClick={() => {
                if (addMode) addPicked(true);
                else startAddMode();
              }}
            >
              <MapPin className="size-4 shrink-0" />
              افزودن این مکان برای کسب‌وکار شما
            </button>
            <span className="rounded-full bg-primary/90 px-3 py-1.5 text-xs text-primary-fg">
              {toFa(filtered.length)} نتیجه روی نقشه
            </span>
            {addMode ? (
              <span className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-primary px-3 py-1.5 text-xs text-primary-fg">
                پین نارنجی را روی محل بگذارید
                <button
                  type="button"
                  onClick={() => {
                    setAddMode(false);
                    setPicked(null);
                  }}
                  aria-label="بستن"
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-4 left-3 right-3 z-30 flex flex-wrap items-end justify-between gap-2">
            {addMode ? (
              <Button type="button" size="sm" onClick={() => addPicked(true)}>
                <MapPin className="size-4" />
                انتخاب نقطه وسط نقشه
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" variant="outline" size="sm" className="bg-surface" onClick={locate} disabled={geoBusy}>
              <LocateFixed className="size-4" />
              موقعیت من
            </Button>
          </div>
        </div>
        {addMode ? (
          <div className="mt-3 rounded-2xl border border-primary bg-surface p-4">
            <p className="text-sm">
              نقشه را با انگشت جابه‌جا و زوم کنید تا علامت نارنجی روی درِ مغازه باشد. بعد همین دکمه را بزنید.
            </p>
            <Button className="mt-3 w-full" onClick={() => addPicked(true)}>
              انتخاب این نقطه و ادامه ثبت
            </Button>
            <button
              type="button"
              className="mt-2 w-full text-sm text-muted"
              onClick={() => {
                setAddMode(false);
                setPicked(null);
              }}
            >
              انصراف
            </button>
          </div>
        ) : null}
      </section>

      <section className="mt-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <FilterChip active={openNow} onClick={() => setOpenNow((v) => !v)} label="باز است" />
          <FilterChip active={todaySlot} onClick={() => setTodaySlot((v) => !v)} label="نوبت امروز" />
          <FilterChip active={hasOffer} onClick={() => setHasOffer((v) => !v)} label="پیشنهاد ویژه" />
          <FilterChip active={onlyFav} onClick={() => setOnlyFav((v) => !v)} label="ذخیره‌شده‌ها" />
          <NativeSelect
            value={sort}
            onChange={(e) => {
              const v = e.target.value as typeof sort;
              setSort(v);
            }}
            className="w-auto min-w-40"
          >
            <option value="relevance">{t("sortRelevance")}</option>
            <option value="distance">نزدیک‌ترین</option>
            <option value="new">تازه‌ترین</option>
          </NativeSelect>
        </div>
        {selected ? (
          <div className="mb-3">
            <BusinessCard
              business={selected}
              compact
              saved={favs.has(selected.id)}
              onToggleSave={favs.toggle}
              distanceKm={haversineKm(refPos, { lat: selected.latitude, lng: selected.longitude })}
            />
          </div>
        ) : null}
        <div className="grid gap-3">
          {loading ? [0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />) : null}
          {!loading && filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
              <p>{t("zeroResults")}</p>
              <ul className="mt-3 space-y-1 text-right">
                {openNow ? <li>{t("zeroHintOpen")}</li> : null}
                {maxKm > 0 ? <li>{t("zeroHintDistance")}</li> : null}
                {categoryId ? <li>{t("zeroHintCategory")}</li> : null}
                {debouncedQ ? <li>{t("zeroHintSpelling")}</li> : null}
                {!openNow && maxKm <= 0 && !categoryId && !debouncedQ ? <li>{t("zeroHintGeneric")}</li> : null}
              </ul>
            </div>
          ) : null}
          {filtered.map((b) => (
            <div
              key={b.id}
              onMouseEnter={() => setSelectedId(b.id)}
              className={cn(selectedId === b.id && "ring-2 ring-accent/30 rounded-xl")}
            >
              <BusinessCard
                business={b}
                distanceKm={haversineKm(refPos, { lat: b.latitude, lng: b.longitude })}
                saved={favs.has(b.id)}
                onToggleSave={favs.toggle}
              />
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-full border px-4 text-sm",
        active ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface",
      )}
    >
      {label}
    </button>
  );
}

function CatChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Store;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-surface text-center",
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-fg",
      )}
    >
      <Icon className="size-6" />
      <span className="line-clamp-2 px-1 text-xs leading-4">{label}</span>
    </button>
  );
}

function toFa(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}
