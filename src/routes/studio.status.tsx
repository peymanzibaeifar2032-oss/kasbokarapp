import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StudioTopBar } from "@/components/studio/top-bar";
import { useStudioAdminEntry } from "@/components/studio/use-studio-admin";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addBookingToPhoneCalendar, formatFaDateTime } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import { ensureStudioPhoneNotices, inStudioApp, phoneNoticesEnabled, scheduleTattooPrepNotices } from "@/lib/studio-notices";
import { STUDIO_ADDRESS, tattooStage } from "@/lib/tattoo-flow";
import type { NotificationItem, TattooRequest } from "@/lib/types";
import { RequestCard } from "@/routes/studio.request";

export const Route = createFileRoute("/studio/status")({
  component: StudioStatusPage,
  head: () => ({
    meta: [{ title: "بررسی وضعیت نوبت تاتو | پیمان زیبائی‌فر" }],
  }),
});

function StudioStatusPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const { showAdmin } = useStudioAdminEntry();
  const userId = user?.id;
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [notices, setNotices] = useState<NotificationItem[]>([]);
  const [phoneOn, setPhoneOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const inFlight = useRef(false);
  const loadedOnce = useRef(false);

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
        setNotices(tattoo);
        const unreadIds = tattoo.filter((item) => !item.readAt).map((item) => item.id);
        if (unreadIds.length) void saveAction("notificationsRead", { ids: unreadIds });
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
      <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
        <StudioTopBar compact />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <h1 className="text-2xl font-black">بررسی وضعیت نوبت</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              {sessionError
                ? "بارگذاری وضعیت انجام نشد."
                : isPending
                  ? "در حال بررسی ورود…"
                  : "برای دیدن تأییدها، پیام‌ها و زمان قطعی وارد حساب شو."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {sessionError && retry ? (
                <button
                  type="button"
                  className="inline-flex h-11 items-center rounded-full border border-white/15 px-4 text-sm"
                  onClick={retry}
                >
                  تلاش دوباره
                </button>
              ) : null}
              <a
                href="/login?next=%2Fstudio%2Fstatus"
                className="inline-flex h-11 items-center rounded-full bg-[#b7955b] px-5 text-sm font-bold text-black"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign("/login?next=/studio/status");
                }}
              >
                ورود / ثبت‌نام
              </a>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const booked = requests.filter((r) => tattooStage(r) === "booked" && r.proposedSlotStart);

  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
        {showAdmin ? (
          <Link
            to="/studio/admin"
            className="flex items-center justify-between rounded-3xl bg-[#b7955b] px-5 py-4 text-black"
          >
            <span>
              <strong className="block text-base">این صفحه مال مشتری است</strong>
              <span className="mt-1 block text-sm font-medium opacity-80">برای درخواست‌ها، تقویم و درآمد ماه برو به پنل ادمین</span>
            </span>
            <ChevronLeft className="size-5 shrink-0" />
          </Link>
        ) : null}
        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <p className="text-xs tracking-[.18em] text-[#b7955b]">STATUS</p>
          <h1 className="mt-2 text-3xl font-black">بررسی وضعیت نوبت</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            اینجا تأیید پیمان، پیام‌ها، مهلت پرداخت و زمان قطعی را می‌بینی. بعد از قطعی شدن وقت، همان
            زمان را به تقویم گوشی اضافه کن. روز قبل از اجرا، اعلان گوشی یادآوری آمادگی را می‌آورد.
            مراقبت قبل و بعد در بخش آموزش است.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <p className="rounded-2xl border border-[#b7955b]/30 bg-[#b7955b]/10 px-4 py-3 text-sm leading-7 text-[#e5d2ae]">
              {phoneOn || inStudioApp()
                ? "اعلان گوشی از داخل خود اپ روشن است. بعد از هر تأیید، بالای صفحه و نوار اعلان گوشی خبر می‌دهد."
                : "اگر اعلان نیامد، اجازه اعلان را در پنجره گوشی تأیید کن. لازم نیست از تنظیمات جداگانه چیزی را دستی روشن کنی."}
            </p>
            <Button variant="outline" className="h-11 border-white/15 bg-transparent text-[#e5d2ae]" onClick={refresh}>
              تازه کردن وضعیت
            </Button>
          </div>
        </section>

        {booked.map((request) => (
          <section key={`cal-${request.id}`} className="rounded-3xl border border-[#b7955b]/35 bg-[#b7955b]/12 p-5">
            <p className="font-bold text-[#e5d2ae]">زمان نوبت قطعی شد</p>
            <p className="mt-2 text-sm text-white/70">{formatFaDateTime(request.proposedSlotStart!)}</p>
            <Button
              className="mt-4 h-12 w-full bg-[#b7955b] text-black"
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

        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
          <h2 className="font-bold">پیام‌ها و تأییدها</h2>
          {loading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-white/45">
              <Loader2 className="size-4 animate-spin" /> در حال خواندن وضعیت…
            </p>
          ) : null}
          {loadError ? (
            <p className="mt-4 text-sm leading-7 text-red-300">
              {loadError}
              <button type="button" className="mr-2 font-bold text-[#e5d2ae]" onClick={refresh}>
                تلاش دوباره
              </button>
            </p>
          ) : null}
          {!loading && !loadError && !notices.length ? (
            <p className="mt-4 text-sm text-white/45">هنوز پیامی ثبت نشده. بعد از بررسی پیمان اینجا می‌آید.</p>
          ) : null}
          <div className="mt-4 grid gap-3">
            {notices.map((n) => (
              <article key={n.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{n.title}</strong>
                  {!n.readAt ? (
                    <span className="rounded-full bg-[#b7955b]/20 px-2 py-0.5 text-[11px] text-[#e5d2ae]">جدید</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-7 text-white/65">{n.body}</p>
                <p className="mt-2 text-xs text-white/35">{formatFaDateTime(n.createdAt)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="font-bold">درخواست‌های شما</h2>
          {!loading && !requests.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 text-sm text-white/55">
              هنوز درخواستی ثبت نشده.
              <Link to="/studio/request" className="mt-3 block font-bold text-[#e5d2ae]">
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
