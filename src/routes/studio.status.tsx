import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GuestPayCard, type GuestStatus } from "@/components/studio/guest-pay-card";
import { StudioTopBar } from "@/components/studio/top-bar";
import { useStudioAdminEntry } from "@/components/studio/use-studio-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addBookingToPhoneCalendar, formatFaDateTime } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import { ensureStudioPhoneNotices, inStudioApp, phoneNoticesEnabled, scheduleTattooPrepNotices } from "@/lib/studio-notices";
import { STUDIO_ADDRESS, TATTOO_REPLY_WAIT_NOTE, tattooStage } from "@/lib/tattoo-flow";
import type { NotificationItem, TattooRequest } from "@/lib/types";
import { RequestCard } from "@/routes/studio.request";

export const Route = createFileRoute("/studio/status")({
  component: StudioStatusPage,
  head: () => ({
    meta: [{ title: "بررسی وضعیت نوبت تاتو | پیمان زیبائی‌فر" }],
  }),
});

function stageRank(item: GuestStatus) {
  const stage = tattooStage({
    status: item.status,
    paymentStatus: item.paymentStatus || "not_required",
    paymentReviewDeadline: item.paymentReviewDeadline,
  });
  if (stage === "booked") return 0;
  if (stage === "rejected" || stage === "expired") return 2;
  return 1;
}

function StudioStatusPage() {
  const { user } = useCurrentUserState();
  const { showAdmin } = useStudioAdminEntry();
  const userId = user?.id;
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [notices, setNotices] = useState<NotificationItem[]>([]);
  const [phoneOn, setPhoneOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const inFlight = useRef(false);
  const loadedOnce = useRef(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [guestItems, setGuestItems] = useState<GuestStatus[]>([]);
  const [lookupBusy, setLookupBusy] = useState(false);

  async function lookupStatus(phone = lookupPhone) {
    setLookupBusy(true);
    try {
      const res = await fetch("/api/tattoo-public?op=status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; items?: GuestStatus[] } | null;
      if (!res.ok) throw new Error(data?.error || "وضعیت پیدا نشد.");
      const items = (data?.items ?? []).slice().sort((a, b) => stageRank(a) - stageRank(b));
      setGuestItems(items);
      try {
        localStorage.setItem("studio-status-phone", phone);
      } catch {
        /* private mode */
      }
      for (const item of items) {
        if (tattooStage({ status: item.status, paymentStatus: item.paymentStatus || "not_required" }) === "booked" && item.proposedSlotStart) {
          scheduleTattooPrepNotices(item.proposedSlotStart, item.customerName || "مشتری");
        }
      }
      if (!items.length) toast.message("با این شماره هنوز درخواستی ثبت نشده.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLookupBusy(false);
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studio-status-phone");
      if (!saved) return;
      setLookupPhone(saved);
      void lookupStatus(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function refresh() {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    if (!loadedOnce.current) setLoading(true);
    setLoadError("");
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("خواندن وضعیت طول کشید. دوباره بزن.")), 12000);
    });
    Promise.race([
      Promise.all([
        saveAction<TattooRequest[]>("myTattooRequests"),
        saveAction<{ items: NotificationItem[] }>("notifications"),
      ]),
      timeout,
    ])
      .then(([reqs, n]) => {
        setRequests(reqs ?? []);
        for (const request of reqs ?? []) {
          if (tattooStage(request) === "booked" && request.proposedSlotStart) {
            scheduleTattooPrepNotices(request.proposedSlotStart, request.customerName || "مشتری");
          }
        }
        const tattoo = (n.items ?? []).filter((item) => item.kind.startsWith("tattoo"));
        setNotices(tattoo.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
        void saveAction("notificationsRead", {});
      })
      .catch((err) => {
        const message = friendlyError(err);
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        inFlight.current = false;
        loadedOnce.current = true;
        setLoading(false);
      });
  }

  useEffect(() => {
    setPhoneOn(phoneNoticesEnabled() || inStudioApp());
    if (!userId) return;
    void ensureAutoNotices();
    refresh();
  }, [userId]);

  async function ensureAutoNotices() {
    try {
      await ensureStudioPhoneNotices();
      setPhoneOn(true);
    } catch {
      setPhoneOn(phoneNoticesEnabled() || inStudioApp());
    }
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-[#f4efe6] text-[#1c1917]" dir="rtl">
        <StudioTopBar compact light />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-black">بررسی وضعیت نوبت</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              همان شماره‌ای را بنویس که در فرم درخواست وارد کردی. ورود با ایمیل لازم نیست. از همین صفحه
              زمان را تأیید کن و عکس رسید را بفرست.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#1c3d52]">{TATTOO_REPLY_WAIT_NOTE}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Input
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                inputMode="tel"
                dir="ltr"
                placeholder="۰۹…"
                className="h-12"
              />
              <Button
                className="h-12 bg-[#2f80ed] text-white"
                disabled={lookupBusy}
                onClick={() => void lookupStatus()}
              >
                {lookupBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                دیدن وضعیت
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {guestItems.map((item) => (
                <GuestPayCard key={item.id} item={item} phone={lookupPhone} onRefresh={() => void lookupStatus()} />
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  const booked = requests.filter((r) => tattooStage(r) === "booked" && r.proposedSlotStart);

  return (
    <div className="min-h-dvh bg-[#f4efe6] text-[#1c1917]" dir="rtl">
      <StudioTopBar compact light />
      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-black">وضعیت با شماره موبایل</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            همان شماره‌ای را بزن که موقع درخواست نوشتی. تأیید نهایی و زمان قطعی همین‌جا می‌آید.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              inputMode="tel"
              dir="ltr"
              placeholder="۰۹…"
              className="h-12"
            />
            <Button className="h-12 bg-[#2f80ed] text-white" disabled={lookupBusy} onClick={() => void lookupStatus()}>
              {lookupBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              دیدن وضعیت
            </Button>
          </div>
          <div className="mt-5 grid gap-3">
            {guestItems.map((item) => (
              <GuestPayCard key={item.id} item={item} phone={lookupPhone} onRefresh={() => void lookupStatus()} />
            ))}
          </div>
        </section>
        {showAdmin ? (
          <Link
            to="/studio/admin"
            className="flex items-center justify-between rounded-3xl bg-[#2f80ed] px-5 py-4 text-white"
          >
            <span>
              <strong className="block text-base">این صفحه مال مشتری است</strong>
              <span className="mt-1 block text-sm font-medium opacity-80">برای درخواست‌ها، تقویم و درآمد ماه برو به پنل ادمین</span>
            </span>
            <ChevronLeft className="size-5 shrink-0" />
          </Link>
        ) : null}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <p className="text-xs tracking-[.18em] text-[#2f80ed]">STATUS</p>
          <h1 className="mt-2 text-3xl font-black">بررسی وضعیت نوبت</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            اینجا تأیید پیمان، پیام‌ها، مهلت پرداخت و زمان قطعی را می‌بینی. بعد از قطعی شدن وقت، همان
            زمان را به تقویم گوشی اضافه کن. روز قبل از اجرا، اعلان گوشی یادآوری آمادگی را می‌آورد.{" "}
            <Link to="/studio/care" className="text-[#1c3d52]">
              مراقبت قبل و بعد
            </Link>{" "}
            را جدا بخوان.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <p className="rounded-2xl border border-[#2f80ed]/30 bg-[#2f80ed]/10 px-4 py-3 text-sm leading-7 text-[#1c3d52]">
              {phoneOn || inStudioApp()
                ? "اعلان گوشی از داخل خود اپ روشن است. بعد از هر تأیید، بالای صفحه و نوار اعلان گوشی خبر می‌دهد."
                : "اگر اعلان نیامد، اجازه اعلان را در پنجره گوشی تأیید کن. لازم نیست از تنظیمات جداگانه چیزی را دستی روشن کنی."}
            </p>
            <Button variant="outline" className="h-11 border-slate-200 bg-transparent text-[#1c3d52]" onClick={refresh}>
              تازه کردن وضعیت
            </Button>
          </div>
        </section>

        {booked.map((request) => (
          <section key={`cal-${request.id}`} className="rounded-3xl border border-[#2f80ed]/30 bg-[#2f80ed]/10 p-5">
            <p className="font-bold text-[#1c3d52]">زمان نوبت قطعی شد</p>
            <p className="mt-2 text-sm text-slate-600">{formatFaDateTime(request.proposedSlotStart!)}</p>
            <Button
              className="mt-4 h-12 w-full bg-[#2f80ed] text-white"
              onClick={() =>
                addBookingToPhoneCalendar({
                  title: "نوبت تاتو · پیمان زیبائی‌فر",
                  startIso: request.proposedSlotStart!,
                  minutes: calendarMinutes(request),
                  location: STUDIO_ADDRESS,
                  description: [request.style, request.artistMessage].filter(Boolean).join(" — "),
                  fileName: `tattoo-${request.id}.ics`,
                })
              }
            >
              <CalendarPlus className="size-5" />
              افزودن این زمان به تقویم گوشی
            </Button>
          </section>
        ))}

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">پیام‌ها و تأییدها</h2>
          {loading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> در حال خواندن وضعیت…
            </p>
          ) : null}
          {loadError ? (
            <p className="mt-4 text-sm leading-7 text-red-600">
              {loadError}
              <button type="button" className="mr-2 font-bold text-[#1c3d52]" onClick={refresh}>
                تلاش دوباره
              </button>
            </p>
          ) : null}
          {!loading && !loadError && !notices.length ? (
            <p className="mt-4 text-sm text-slate-400">هنوز پیامی ثبت نشده. بعد از بررسی پیمان اینجا می‌آید.</p>
          ) : null}
          <div className="mt-4 grid gap-3">
            {notices.map((n) => (
              <article key={n.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{n.title}</strong>
                  {!n.readAt ? (
                    <span className="rounded-full bg-[#2f80ed]/10 px-2 py-0.5 text-[11px] text-[#1c3d52]">جدید</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{n.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatFaDateTime(n.createdAt)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="font-bold">درخواست‌های شما</h2>
          {!loading && !requests.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              هنوز درخواستی ثبت نشده.
              <Link to="/studio/request" className="mt-3 block font-bold text-[#1c3d52]">
                رفتن به فرم درخواست
              </Link>
            </div>
          ) : null}
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} onChange={refresh} />
          ))}
        </section>
      </main>
    </div>
  );
}

export function calendarMinutes(request: TattooRequest) {
  if (request.proposedSlotStart && request.proposedSlotEnd) {
    const ms = new Date(request.proposedSlotEnd).getTime() - new Date(request.proposedSlotStart).getTime();
    if (Number.isFinite(ms) && ms > 0) return Math.max(10, Math.round(ms / 60000));
  }
  return request.sessionMinutes || 120;
}
