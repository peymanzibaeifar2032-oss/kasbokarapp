import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  CalendarPlus,
  Copy,
  Globe,
  Heart,
  Instagram,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Cover, visibilityLabel } from "@/components/business/card";
import { StarPicker, Stars } from "@/components/business/stars";
import { Shell } from "@/components/layout/shell";
import { BusinessMap } from "@/components/map/business-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useFavorites } from "@/lib/favorites";
import {
  copyText,
  formatFaDate,
  formatToman,
  googleMapsLink,
  neshanLink,
  openNeshan,
  toTelLink,
  toWebsiteHref,
  toWhatsAppLink,
} from "@/lib/format";
import { buildSlotGrid, DEFAULT_BOOKING_HORIZON_DAYS, horizonDayKey, isClosedOn, jalaliDayLabel, isOpenNow, nextAvailable, serviceBuffers, serviceDurationMinutes, statusForDay, tehranDayKey, todayHoursLabel } from "@/lib/hours";
import { gregorianToJalali, jalaliMonthGrid, shiftJalaliMonth } from "@/lib/calendar/jalali";
import { MonthGrid } from "@/components/calendar/month-grid";
import { friendlyError, saveAction } from "@/lib/save";
import { t } from "@/lib/i18n";
import {
  getBusiness,
  getCityRank,
  listBusySlots,
  listResources,
  listReviews,
  listSimilar,
} from "@/lib/server/api";
import { anyStaffGrid, eligibleResources, hasActiveResources, slotsForResource, type BusinessResource } from "@/lib/calendar/resources";
import type { BusyInterval, Business, Profile, Review } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/business/$id")({
  validateSearch: (s: Record<string, unknown>): { tattooRequestId?: string; tattooMinutes?: number } => {
    const tattooRequestId = typeof s.tattooRequestId === "string" ? s.tattooRequestId : undefined;
    const tattooMinutes = Number(s.tattooMinutes);
    return { tattooRequestId, tattooMinutes: Number.isFinite(tattooMinutes) && tattooMinutes >= 10 ? tattooMinutes : undefined };
  },
  loader: async ({ params }) => {
    const [biz, reviews, busy, similar, rank, resources] = await Promise.all([
      getBusiness({ data: { id: params.id } }),
      listReviews({ data: { businessId: params.id } }),
      listBusySlots({ data: { businessId: params.id } }),
      listSimilar({ data: { id: params.id } }),
      getCityRank({ data: { id: params.id } }),
      listResources({ data: { businessId: params.id } }).catch(() => []),
    ]);
    if (!biz) throw notFound();
    const now = new Date();
    return {
      biz,
      reviews,
      busy,
      similar,
      rank,
      resources,
      openNow: isOpenNow(biz.workHours, now),
      hoursLabel: todayHoursLabel(biz.workHours, now),
    };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.biz ? `${loaderData.biz.name} · کسب‌وکار` : "کسب‌وکار" }],
  }),
  notFoundComponent: NotFoundPage,
  component: BusinessPage,
});

const IRAN_WEEK = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

function NotFoundPage() {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">این صفحه پیدا نشد</h1>
      <p className="mt-2 text-sm text-muted">شاید کسب‌وکار حذف شده یا نشانی اشتباه است.</p>
      <Button asChild className="mt-5">
        <Link to="/">بازگشت به کشف</Link>
      </Button>
    </Shell>
  );
}

function useClientReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

function toFa(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

function BusinessPage() {
  const { biz, reviews: initialReviews, busy: initialBusy, similar, rank, resources, openNow, hoursLabel } =
    Route.useLoaderData();
  const { user } = useCurrentUserState();
  const tattooSearch = Route.useSearch();
  const favs = useFavorites();
  const [reviews, setReviews] = useState(initialReviews);
  const [busy, setBusy] = useState(initialBusy);

  useEffect(() => {
    setReviews(initialReviews);
    setBusy(initialBusy);
  }, [biz.id, initialReviews, initialBusy]);

  const vis = visibilityLabel(biz.visibility);
  const canBook = biz.visibility === "trial" || biz.visibility === "subscribed";
  const isOwner = Boolean(user && user.id === biz.ownerId);
  const saved = favs.has(biz.id);
  const tel = toTelLink(biz.phone);
  const inquiry = `سلام، از اپ کسب‌وکار می‌نویسم. درباره «${biz.name}» سؤال دارم.`;
  const quote = `سلام، از اپ کسب‌وکار می‌نویسم. لطفاً قیمت خدمات «${biz.name}» را بفرستید.`;
  const wa = toWhatsAppLink(biz.whatsapp || biz.phone, inquiry);
  const waQuote = toWhatsAppLink(biz.whatsapp || biz.phone, quote);
  const web = toWebsiteHref(biz.website);
  const nextPath = tattooSearch.tattooRequestId
    ? `/business/${biz.id}?tattooRequestId=${encodeURIComponent(tattooSearch.tattooRequestId)}${tattooSearch.tattooMinutes ? `&tattooMinutes=${tattooSearch.tattooMinutes}` : ""}`
    : `/business/${biz.id}`;

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: biz.name, url, text: biz.jobTitle ?? biz.name });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyText(url);
    toast.success("پیوند کپی شد.");
  }

  const orderedHours = [...biz.workHours].sort(
    (a, b) => IRAN_WEEK.indexOf(a.day as (typeof IRAN_WEEK)[number]) - IRAN_WEEK.indexOf(b.day as (typeof IRAN_WEEK)[number]),
  );

  return (
    <Shell>
      {!canBook ? (
        <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          {biz.visibility === "pending"
            ? "این صفحه هنوز عمومی نیست. پس از تأیید مدیریت روی نقشه می‌آید."
            : biz.visibility === "rejected"
              ? "این صفحه تأیید نشده است."
              : "دوره نمایش این صفحه تمام شده است."}
        </div>
      ) : null}

      <Cover slug={biz.categorySlug} name={biz.name} className="h-40 rounded-2xl" />

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div>
          <p className="text-sm text-muted">{biz.categoryName}</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{biz.name}</h1>
              {biz.jobTitle ? <p className="mt-1 text-muted">{biz.jobTitle}</p> : null}
            </div>
            <button
              type="button"
              aria-label={saved ? "حذف از ذخیره‌ها" : "ذخیره"}
              className={cn("grid size-11 shrink-0 place-items-center rounded-full border border-border", saved && "text-danger")}
              onClick={() => favs.toggle(biz.id)}
            >
              <Heart className={cn("size-4", saved && "fill-current")} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={openNow ? "accent" : "muted"}>{openNow ? "الان باز است" : "بسته"}</Badge>
            <Badge tone={vis.tone}>{vis.text}</Badge>
          </div>
          <div className="mt-3">
            <Stars value={biz.ratingAvg} count={biz.ratingCount} size="md" />
          </div>
          {rank ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-accent">
              <Trophy className="size-4" />
              رتبه {toFa(rank.rank)} از {toFa(rank.total)} {rank.categoryName} در {rank.city}
            </p>
          ) : null}
          {biz.offerText ? <p className="mt-3 font-medium text-accent">{biz.offerText}</p> : null}

          <p className="mt-4 flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>
              {biz.address ? `${biz.address} · ` : null}
              {biz.city}، {biz.province}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void copyText([biz.address, biz.city, biz.province].filter(Boolean).join("، ")).then(() =>
                  toast.success("نشانی کپی شد."),
                );
              }}
            >
              <Copy className="size-4" /> کپی نشانی
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
            >
              <a
                href={neshanLink(biz.latitude, biz.longitude)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openNeshan(biz.latitude, biz.longitude);
                }}
              >
                <Navigation className="size-4" /> مسیر نشان
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={googleMapsLink(biz.latitude, biz.longitude)} target="_blank" rel="noreferrer">
                مسیر گوگل‌مپ
              </a>
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:row-span-2">
          <div id="book" className="order-1 scroll-mt-24 lg:order-2">
            <BookingPanel
              biz={biz}
              busy={busy}
              resources={resources as BusinessResource[]}
              canBook={canBook}
              nextPath={nextPath}
              tattooRequestId={tattooSearch.tattooRequestId}
              tattooMinutes={tattooSearch.tattooMinutes}
              onBooked={(slot) => {
                setBusy((cur) =>
                  cur.some((x) => x.start === slot.start)
                    ? cur
                    : [...cur, { start: slot.start, end: slot.end, resourceId: slot.resourceId ?? null }],
                );
              }}
            />
          </div>
          <div className="order-2 h-56 overflow-hidden rounded-2xl border border-border lg:order-1">
            <BusinessMap businesses={[biz]} center={{ lat: biz.latitude, lng: biz.longitude }} zoom={15} selectedId={biz.id} className="h-full" />
          </div>
          <div className="order-3 hidden lg:block">
            <ActionButtons tel={tel} wa={wa} waQuote={waQuote} instagram={biz.instagram} web={web} lat={biz.latitude} lng={biz.longitude} onShare={() => void share()} />
          </div>
        </aside>

        <div>
          <p className="text-sm font-medium">{hoursLabel}</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {orderedHours.map((h) => (
              <div key={h.day} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0">
                <span>{h.day}</span>
                <span className="tabular-nums text-muted" dir="ltr">
                  {h.closed || !h.open ? "تعطیل" : `${h.open} – ${h.close === "00:00" ? "24:00" : h.close}`}
                </span>
              </div>
            ))}
          </div>

          {biz.description ? <p className="mt-5 leading-8 text-muted">{biz.description}</p> : null}

          {biz.prices.length ? (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">خدمات و قیمت</h2>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
                {biz.prices.map((p) => (
                  <li key={p.title} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{p.title}</span>
                    <strong>{formatToman(p.price)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-6 lg:hidden">
            <ActionButtons tel={tel} wa={wa} waQuote={waQuote} instagram={biz.instagram} web={web} lat={biz.latitude} lng={biz.longitude} onShare={() => void share()} />
          </div>
        </div>
      </div>

      <ReviewsBlock
        biz={biz}
        reviews={reviews}
        isOwner={isOwner}
        nextPath={nextPath}
        onChange={(rows) => {
          if (rows) setReviews(rows);
          else void saveAction<Review[]>("reviews", { businessId: biz.id }).then(setReviews);
        }}
      />

      {similar.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">مشابه‌ها در همین دسته</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {similar.map((s) => (
              <Link key={s.id} to="/business/$id" params={{ id: s.id }} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-muted">{s.city}</p>
                <strong className="mt-1 block">{s.name}</strong>
                <div className="mt-2">
                  <Stars value={s.ratingAvg} count={s.ratingCount} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 z-20 border-t border-border bg-surface/95 p-3 md:hidden bottom-16">
        <div className="grid grid-cols-3 gap-2">
          {tel ? (
            <a href={tel} className="inline-flex h-11 items-center justify-center rounded-md bg-primary text-sm text-primary-fg">
              تماس
            </a>
          ) : (
            <span />
          )}
          {wa ? (
            <a href={wa} className="inline-flex h-11 items-center justify-center rounded-md border border-border text-sm">
              واتساپ
            </a>
          ) : (
            <span />
          )}
          <a href="#book" className="inline-flex h-11 items-center justify-center rounded-md bg-accent text-sm text-accent-fg">
            رزرو نوبت
          </a>
        </div>
      </div>
    </Shell>
  );
}

function ActionButtons({
  tel,
  wa,
  waQuote,
  instagram,
  web,
  lat,
  lng,
  onShare,
}: {
  tel: string | null;
  wa: string | null;
  waQuote: string | null;
  instagram: string | null;
  web: string | null;
  lat: number;
  lng: number;
  onShare: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {tel ? (
        <a href={tel} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm text-primary-fg">
          <Phone className="size-4" /> تماس
        </a>
      ) : null}
      {wa ? (
        <a href={wa} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm">
          پیام واتساپ
        </a>
      ) : null}
      {waQuote ? (
        <a href={waQuote} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm">
          درخواست قیمت
        </a>
      ) : null}
      <a
        href={neshanLink(lat, lng)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          e.preventDefault();
          openNeshan(lat, lng);
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm"
      >
        <Navigation className="size-4" /> مسیر نشان
      </a>
      <a href={googleMapsLink(lat, lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm">
        مسیر گوگل‌مپ
      </a>
      {instagram ? (
        <a href={`https://instagram.com/${instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm">
          <Instagram className="size-4" /> اینستاگرام
        </a>
      ) : null}
      {web ? (
        <a href={web} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm">
          <Globe className="size-4" /> وب‌سایت
        </a>
      ) : null}
      <button type="button" onClick={onShare} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border text-sm">
        <Share2 className="size-4" /> ارسال پیوند
      </button>
    </div>
  );
}

function BookingPanel({
  biz,
  busy,
  resources,
  canBook,
  nextPath,
  tattooRequestId,
  tattooMinutes,
  onBooked,
}: {
  biz: Business;
  busy: BusyInterval[];
  resources: BusinessResource[];
  canBook: boolean;
  nextPath: string;
  tattooRequestId?: string;
  tattooMinutes?: number;
  onBooked: (slot: BusyInterval) => void;
}) {
  const { user } = useCurrentUserState();
  const ready = useClientReady();
  const navigate = useNavigate();
  const [dayKey, setDayKey] = useState("");
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [service, setService] = useState(biz.prices[0]?.title || biz.jobTitle || "");
  const [resourceId, setResourceId] = useState("");
  const [party, setParty] = useState(1);
  const [busySubmit, setBusySubmit] = useState(false);
  const duration = useMemo(
    () => tattooMinutes ? { minutes: tattooMinutes } : serviceDurationMinutes(biz.prices, service, biz.slotMinutes),
    [biz.prices, biz.slotMinutes, service, tattooMinutes],
  );
  const buffers = useMemo(() => serviceBuffers(biz.prices, service), [biz.prices, service]);
  const specialDays = biz.specialHours ?? [];
  const horizon = biz.bookingHorizonDays ?? DEFAULT_BOOKING_HORIZON_DAYS;
  const staffed = hasActiveResources(resources);
  const staffOptions = useMemo(() => eligibleResources(resources, service), [resources, service]);
  const now = useMemo(() => new Date(), [biz.id, service, resourceId]);
  const todayKey = tehranDayKey(now);
  const todayJ = gregorianToJalali(...(todayKey.split("-").map(Number) as [number, number, number]));
  const [month, setMonth] = useState(() => ({ jy: todayJ.jy, jm: todayJ.jm }));
  const slots = useMemo(() => {
    const hits = busy;
    const opts = { includeOccupied: true, bufferBefore: buffers.before, bufferAfter: buffers.after, specialDays };
    if (!staffed) {
      return buildSlotGrid(biz, busy, horizon, now, duration.minutes, opts);
    }
    if (!resourceId) {
      return anyStaffGrid(biz, hits, staffOptions, horizon, now, duration.minutes, {
        bufferBefore: buffers.before,
        bufferAfter: buffers.after,
        specialDays,
      });
    }
    const selected = staffOptions.find((r) => r.id === resourceId);
    return slotsForResource(biz, hits, selected ?? resourceId, true, horizon, now, duration.minutes, {
      bufferBefore: buffers.before,
      bufferAfter: buffers.after,
      specialDays,
    }, true);
  }, [biz, busy, duration.minutes, buffers.before, buffers.after, specialDays, horizon, now, staffed, resourceId, staffOptions]);
  const nextFree = useMemo(
    () => nextAvailable(biz, busy, now, duration.minutes, { bufferBefore: buffers.before, bufferAfter: buffers.after, specialDays }),
    [biz, busy, duration.minutes, buffers.before, buffers.after, specialDays, now],
  );
  const horizonKey = horizonDayKey(now, horizon);
  const monthCells = useMemo(() => {
    return jalaliMonthGrid(month.jy, month.jm).map((cell) => {
      const weekday = new Date(Date.UTC(cell.gy, cell.gm - 1, cell.gd)).getUTCDay();
      const closed = isClosedOn(biz, cell.dayKey, weekday, specialDays);
      const rows = slots.filter((s) => s.dayKey === cell.dayKey);
      return {
        cell,
        status: statusForDay(cell.dayKey, rows, { todayKey, horizonKey, closed }),
      };
    });
  }, [biz, month.jy, month.jm, slots, specialDays, todayKey, horizonKey]);
  const quickDays = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; label: string }[] = [];
    for (const s of slots) {
      if (seen.has(s.dayKey) || s.state !== "free") continue;
      seen.add(s.dayKey);
      const [y, m, d] = s.dayKey.split("-").map(Number);
      const label = s.dayKey === todayKey ? "امروز" : jalaliDayLabel(y, m, d).split("،")[0] || s.dayLabel;
      out.push({ key: s.dayKey, label });
      if (out.length >= 4) break;
    }
    return out;
  }, [slots, todayKey]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof slots>();
    for (const s of slots) {
      const arr = map.get(s.dayKey) ?? [];
      arr.push(s);
      map.set(s.dayKey, arr);
    }
    return [...map.entries()].map(([, items]) => ({
      key: items[0].dayKey,
      label: items[0].dayLabel,
      items,
    }));
  }, [slots]);
  const activeDay = dayKey;
  const daySlots = slots.filter((s) => s.dayKey === activeDay);
  const activeSlot = slot && daySlots.some((s) => s.iso === slot) ? slot : "";
  const selectedMeta = monthCells.find((c) => c.cell.dayKey === activeDay);
  const services = useMemo(() => {
    const titles = biz.prices.map((p) => p.title);
    const extra: { title: string; price: number | null }[] = [];
    if (/تاتو/.test(`${biz.jobTitle ?? ""}${biz.name}`) && !titles.includes("تاتو بدن")) {
      extra.push({ title: "تاتو بدن", price: null });
    }
    if (biz.jobTitle && !titles.includes(biz.jobTitle) && biz.jobTitle !== "تاتو بدن") {
      extra.push({ title: biz.jobTitle, price: null });
    }
    return [...extra, ...biz.prices.map((p) => ({ title: p.title, price: p.price as number | null }))];
  }, [biz.jobTitle, biz.name, biz.prices]);

  useEffect(() => {
    setService(services[0]?.title || biz.jobTitle || "");
    setDayKey("");
    setSlot("");
    setMonth({ jy: todayJ.jy, jm: todayJ.jm });
  }, [biz.id, services, biz.jobTitle, todayJ.jy, todayJ.jm]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kasb:booking-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        businessId?: string;
        name?: string;
        phone?: string;
        note?: string;
        service?: string;
        party?: number;
        slotStart?: string;
      };
      if (draft.businessId !== biz.id) return;
      if (draft.name) setName(draft.name);
      if (draft.phone) setPhone(draft.phone);
      if (draft.note) setNote(draft.note);
      if (draft.service) setService(draft.service);
      if (draft.party) setParty(draft.party);
      if (draft.slotStart) {
        const match = groups.flatMap((x) => x.items).find((s) => s.iso === draft.slotStart);
        if (match?.state === "free") {
          setDayKey(match.dayKey);
          setSlot(draft.slotStart);
        } else if (match) {
          toast.error("این زمان همین الان توسط شخص دیگری رزرو شد. زمان‌های آزاد به‌روزرسانی شدند.");
          setDayKey(match.dayKey);
          setSlot("");
        }
      }
    } catch {
      /* ignore */
    }
  }, [biz.id, groups]);

  useEffect(() => {
    if (!user) return;
    void saveAction<Profile>("profile")
      .then((p) => {
        setName((cur) => cur || p.displayName || user.displayName || "");
        setPhone((cur) => cur || p.phone || "");
      })
      .catch(() => {
        setName((cur) => cur || user.displayName || "");
      });
  }, [user]);

  if (!canBook) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
        رزرو آنلاین فعلاً برای این صفحه باز نیست.
      </div>
    );
  }

  async function submit() {
    if (!activeSlot) {
      toast.error("روز و ساعت آزاد را انتخاب کنید.");
      return;
    }
    const payload = {
      businessId: biz.id,
      slotStart: activeSlot,
      customerName: name,
      customerPhone: phone,
      note,
      serviceTitle: service || undefined,
      partySize: party,
      resourceId: resourceId || undefined,
      tattooRequestId: tattooRequestId || undefined,
    };
    try {
      sessionStorage.setItem("kasb:booking-draft", JSON.stringify({ ...payload, service, party }));
    } catch {
      /* ignore */
    }
    if (!user) {
      toast.message("برای ثبت نهایی رزرو وارد حساب شوید. انتخاب شما ذخیره شد.");
      void navigate({ to: "/login", search: { next: nextPath } });
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      toast.error("نام و نام خانوادگی را بنویسید.");
      return;
    }
    if (!phone.trim()) {
      toast.error("شماره تماس را بنویسید.");
      return;
    }
    setBusySubmit(true);
    try {
      await saveAction<{ id: string }>("booking", payload);
      try {
        sessionStorage.removeItem("kasb:booking-draft");
      } catch {
        /* ignore */
      }
      toast.success("درخواست نوبت ثبت شد. از «حساب من» می‌توانید به تقویم اضافه کنید.");
      const booked = slots.find((s) => s.iso === activeSlot);
      onBooked({ start: activeSlot, end: booked?.endIso ?? activeSlot });
      setNote("");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusySubmit(false);
    }
  }

  const canContinue = Boolean(service && activeSlot);
  const weekdayHint = groups.find((g) => g.key === activeDay)?.label ?? "";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5" data-booking-calendar="jalali-month-v1">
      <h2 className="text-lg font-semibold">رزرو وقت از {biz.jobTitle || biz.name}</h2>
      <p className="mt-1 text-sm text-muted">فقط زمان‌هایی که در تقویم واقعاً آزادند قابل انتخاب‌اند. ساعت پر، اطلاعات مشتری قبلی را نشان نمی‌دهد.</p>
      {nextFree ? (
        <p className="mt-2 text-sm">
          {t("nextFree")}: {nextFree.dayLabel}، {nextFree.label}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">در افق رزرو این صفحه وقت آزادی نیست.</p>
      )}
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">نام و نام خانوادگی</span>
          <Input placeholder="نام شما" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">شماره تماس</span>
          <Input placeholder="۰۹۱۲۱۲۳۴۵۶۷" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">خدمت</span>
          <NativeSelect
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setDayKey("");
              setSlot("");
            }}
          >
            {services.length ? (
              services.map((p) => (
                <option key={p.title} value={p.title}>
                  {p.price == null ? p.title : `${p.title} · ${formatToman(p.price)}`}
                </option>
              ))
            ) : (
              <option value={biz.name}>{biz.name}</option>
            )}
          </NativeSelect>
        </label>
        {staffed ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("staffLabel")}</span>
            <NativeSelect
              value={resourceId}
              onChange={(e) => {
                setResourceId(e.target.value);
                setDayKey("");
                setSlot("");
              }}
            >
              <option value="">{t("anyStaff")}</option>
              {staffOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <div>
          <span className="mb-1.5 block text-sm font-medium">انتخاب تاریخ</span>
          {quickDays.length ? (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {quickDays.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setDayKey(d.key);
                    setSlot("");
                    const [y, m, dd] = d.key.split("-").map(Number);
                    const j = gregorianToJalali(y, m, dd);
                    setMonth({ jy: j.jy, jm: j.jm });
                  }}
                  className={cn(
                    "h-11 shrink-0 rounded-full border px-3 text-sm",
                    activeDay === d.key ? "border-primary bg-primary text-primary-fg" : "border-border bg-bg",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          ) : null}
          <p className="mb-2 text-xs text-muted">انتخاب از تقویم</p>
          <MonthGrid
            jy={month.jy}
            jm={month.jm}
            todayKey={todayKey}
            selectedKey={activeDay}
            cells={monthCells}
            onPrev={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}
            onNext={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}
            onSelect={(cell, status) => {
              if (status === "past" || status === "beyond" || status === "closed") return;
              setDayKey(cell.dayKey);
              setSlot("");
            }}
          />
          {!monthCells.some((c) => c.cell.inMonth && (c.status === "free" || c.status === "limited")) ? (
            <p className="mt-2 text-sm text-muted">
              در این ماه زمان آزادی ثبت نشده است.
              <button type="button" className="mr-2 text-accent" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}>
                ماه بعد
              </button>
            </p>
          ) : null}
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium">
            ساعت{weekdayHint ? ` · ${weekdayHint}` : ""}
          </span>
          {!activeDay ? (
            <p className="text-sm text-muted">یک روز را از تقویم انتخاب کنید.</p>
          ) : selectedMeta?.status === "closed" ? (
            <p className="text-sm text-muted">تعطیل</p>
          ) : selectedMeta?.status === "full" || !daySlots.some((s) => s.state === "free") ? (
            <>
              <p className="text-sm">این روز پر است.</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {daySlots.map((s) => (
                  <button
                    key={s.iso}
                    type="button"
                    disabled
                    className="h-12 cursor-not-allowed rounded-md border border-border opacity-60"
                    aria-label={`${s.label} پر`}
                  >
                    <span className="block tabular-nums">{s.label}</span>
                    <span className="block text-[11px]">{t("slotFull")}</span>
                  </button>
                ))}
              </div>
              <WaitlistButton businessId={biz.id} day={activeDay} service={service} />
            </>
          ) : (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.iso}
                  type="button"
                  disabled={s.state === "full"}
                  onClick={() => {
                    if (s.state === "free") setSlot(s.iso);
                  }}
                  className={cn(
                    "h-12 rounded-md border text-sm",
                    s.state === "full" && "cursor-not-allowed opacity-60",
                    activeSlot === s.iso ? "border-primary bg-primary text-primary-fg" : "border-border bg-bg",
                  )}
                  aria-label={s.state === "full" ? `${s.label} پر` : `${s.label} آزاد`}
                >
                  <span className="block tabular-nums">{s.label}</span>
                  <span className="block text-[11px]">{s.state === "full" ? t("slotFull") : t("slotFree")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">توضیح کوتاه</span>
          <Textarea placeholder="در صورت نیاز توضیح بنویسید" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">تعداد نفر</span>
          <NativeSelect value={String(party)} onChange={(e) => setParty(Number(e.target.value))}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {toFa(n)} نفر
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button className="w-full" disabled={busySubmit || !ready || !canContinue} onClick={() => void submit()}>
          <CalendarPlus className="size-4" />
          {busySubmit
            ? "در حال ثبت…"
            : !canContinue
              ? "تاریخ و ساعت را انتخاب کنید"
              : user
                ? "ثبت درخواست رزرو"
                : "ادامه برای ثبت رزرو"}
        </Button>
        {!user ? (
          <p className="text-center text-xs text-muted">برای ثبت نهایی رزرو وارد حساب شوید. گوگل لازم نیست.</p>
        ) : null}
      </div>
    </div>
  );
}

function WaitlistButton({ businessId, day, service }: { businessId: string; day: string; service: string }) {
  const { user } = useCurrentUserState();
  const [done, setDone] = useState(false);
  if (done) return <p className="mt-2 text-xs text-muted">{t("waitlistOk")}</p>;
  return (
    <button
      type="button"
      className="mt-3 text-sm text-accent"
      onClick={() => {
        if (!user) {
          toast.message("برای خبر شدن با ایمیل وارد شوید.");
          return;
        }
        void saveAction("waitlistJoin", { businessId, day, serviceTitle: service || undefined })
          .then(() => {
            setDone(true);
            toast.success(t("waitlistOk"));
          })
          .catch((err) => toast.error(friendlyError(err)));
      }}
    >
      {t("waitlistCta")}
    </button>
  );
}

function ReviewsBlock({
  biz,
  reviews,
  isOwner,
  nextPath,
  onChange,
}: {
  biz: Business;
  reviews: Review[];
  isOwner: boolean;
  nextPath: string;
  onChange: (rows?: Review[]) => void;
}) {
  const { user, isPending } = useCurrentUserState();
  const ready = useClientReady();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const mine = reviews.find((r) => user && r.userId === user.id);

  useEffect(() => {
    if (user?.displayName) setAuthor((cur) => cur || user.displayName || "");
  }, [user]);

  async function submit() {
    if (!author.trim() || author.trim().length < 2) {
      toast.error("نام نمایشی را بنویسید.");
      return;
    }
    setBusy(true);
    try {
      const profile = author.trim().length >= 2 ? null : await saveAction<Profile>("profile").catch(() => null);
      const result = await saveAction<{ reviews: Review[] }>("review", {
        businessId: biz.id,
        rating,
        body,
        authorName: author.trim() || profile?.displayName || "کاربر",
      });
      toast.success("نظر شما ثبت شد.");
      setBody("");
      if (result.reviews) onChange(result.reviews);
      else onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">نظر مشتریان</h2>
      <div className="mt-3 space-y-3">
        {!ready || isPending ? <div className="h-24 animate-pulse rounded-xl bg-surface" /> : null}
        {ready && !isPending && !user ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
            برای نوشتن نظر با ایمیل وارد شوید.
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <Link to="/login" search={{ next: nextPath }}>
                  ورود با ایمیل
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
        {ready && user && !isOwner ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm">{mine ? "نظر قبلی شما به‌روز می‌شود." : "امتیاز و تجربه خود را بنویسید."}</p>
            <div className="mt-2">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <Input className="mt-2" placeholder="نام نمایشی" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Textarea className="mt-2" placeholder="مثلاً نوبت سر وقت بود…" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button className="mt-3" size="sm" disabled={busy} onClick={() => void submit()}>
              {busy ? "در حال ثبت…" : "ثبت نظر"}
            </Button>
          </div>
        ) : null}
        {!reviews.length ? <p className="text-sm text-muted">هنوز نظری ثبت نشده است.</p> : null}
        {reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.authorName}</p>
                <p className="text-xs text-muted">{formatFaDate(r.createdAt)}</p>
              </div>
              <Stars value={r.rating} />
            </div>
            {r.body ? <p className="mt-2 text-sm leading-7">{r.body}</p> : null}
            {r.ownerReply ? (
              <div className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm">
                <p className="text-xs text-muted">پاسخ صاحب{r.ownerReplyAt ? ` · ${formatFaDate(r.ownerReplyAt)}` : ""}</p>
                <p className="mt-1">{r.ownerReply}</p>
              </div>
            ) : null}
            {ready && isOwner && !r.ownerReply ? (
              replyFor === r.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ عمومی" />
                  <Button
                    size="sm"
                    onClick={() => {
                      void saveAction("reply", { reviewId: r.id, reply })
                        .then(() => {
                          toast.success("پاسخ ثبت شد.");
                          setReplyFor(null);
                          setReply("");
                          onChange();
                        })
                        .catch((err) => toast.error(friendlyError(err)));
                    }}
                  >
                    ارسال پاسخ
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setReplyFor(r.id)}>
                  پاسخ به نظر
                </Button>
              )
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
