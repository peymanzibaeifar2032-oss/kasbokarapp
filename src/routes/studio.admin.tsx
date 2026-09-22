import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ClipboardList, CreditCard, FileDown, GraduationCap, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OwnerCalendar } from "@/components/calendar/owner-calendar";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { DesignThumbs } from "@/components/studio/design-thumbs";
import { StudioApprenticeBoard } from "@/components/studio/apprentice-board";
import { StudioJobForm } from "@/components/studio/job-form";
import { StudioMonthFinance } from "@/components/studio/month-finance";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { JALALI_MONTHS, gregorianToJalali, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { formatFaDateTime, instagramProfileUrl, normalizeInstagramHandle } from "@/lib/format";
import { tehranClock, tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { downloadStudioJobsPdf } from "@/lib/studio-list-pdf";
import { thursdayBusyKeys } from "@/lib/studio-apprentices";
import {
  TATTOO_ADMIN_STAGE_LABEL,
  TATTOO_SETTLEMENT_PRESETS,
  formatCardNumber,
  formatTattooToman,
  isTattooReviewOverdue,
  studioVisitText,
  tattooBalance,
  tattooStage,
} from "@/lib/tattoo-flow";
import type { Booking, Business, Profile, TattooRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/admin")({ component: StudioAdminPage });

type PanelTab = "requests" | "jobs" | "calendar" | "money" | "apprentices";
type RequestFilter = "active" | "receipt" | "booked" | "all";

function StudioAdminPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const userId = user?.id;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [tab, setTab] = useState<PanelTab>("requests");
  const [filter, setFilter] = useState<RequestFilter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [nextBusinesses, nextBookings, nextRequests] = await Promise.all([
        saveAction<Business[]>("mine"),
        saveAction<Booking[]>("ownerBookings"),
        saveAction<TattooRequest[]>("studioTattooRequests"),
      ]);
      setBusinesses(nextBusinesses);
      setBookings(nextBookings);
      setRequests(nextRequests);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        await saveAction<Profile>("profile");
        if (cancelled) return;
        await refresh();
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const filtered = useMemo(() => {
    const rows = requests.filter((request) => {
      if (filter === "receipt") return request.paymentStatus === "receipt_submitted";
      if (filter === "booked") return request.status === "booked";
      if (filter === "active")
        return (
          request.status === "submitted" ||
          request.status === "needs_info" ||
          request.status === "approved"
        );
      return true;
    });
    return [...rows].sort((a, b) => {
      const rank = (request: TattooRequest) => {
        const stage = tattooStage(request);
        if (stage === "receipt_overdue") return 0;
        if (stage === "receipt_review") return 1;
        if (stage === "receipt_fix") return 2;
        if (request.status === "submitted") return 3;
        if (request.status === "needs_info") return 4;
        if (stage === "expired") return 5;
        if (stage === "awaiting_payment") return 6;
        if (stage === "proposal_sent") return 7;
        if (stage === "booked") return 8;
        return 9;
      };
      return rank(a) - rank(b) || +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [filter, requests]);

  if (!user)
    return (
      <SignedOutPanel
        title="مدیریت تاتو"
        next="/studio/admin"
        loading={isPending}
        error={sessionError}
        onRetry={retry}
      />
    );

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-accent">استودیو پیمان زیبائی‌فر</p>
          <h1 className="text-2xl font-bold">مدیریت تاتو و تقویم کاری</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            قیمت و زمان را بفرستید. بعد از تأیید مشتری، همان زمان ۶ ساعت قفل می‌شود. رسید که آمد تا ۱۲ ساعت قفل می‌ماند؛ با تأیید شما در تقویم قطعی می‌شود.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="size-4" /> تازه‌سازی
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">
              پنل اصلی <ChevronLeft className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1.5 sm:grid-cols-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={cn(
            "h-12 rounded-xl px-1 text-xs font-semibold sm:text-sm",
            tab === "requests" ? "bg-primary text-primary-fg" : "text-muted",
          )}
        >
          درخواست‌ها ({new Intl.NumberFormat("fa-IR").format(requests.length)})
        </button>
        <button
          type="button"
          onClick={() => setTab("jobs")}
          className={cn(
            "h-12 rounded-xl px-1 text-xs font-semibold sm:text-sm",
            tab === "jobs" ? "bg-primary text-primary-fg" : "text-muted",
          )}
        >
          <ClipboardList className="ml-1 inline size-4" /> لیست این ماه
        </button>
        <button
          type="button"
          onClick={() => setTab("calendar")}
          className={cn(
            "h-12 rounded-xl px-1 text-xs font-semibold sm:text-sm",
            tab === "calendar" ? "bg-primary text-primary-fg" : "text-muted",
          )}
        >
          <CalendarDays className="ml-1 inline size-4" /> تقویم کاری
        </button>
        <button
          type="button"
          onClick={() => setTab("apprentices")}
          className={cn(
            "h-12 rounded-xl px-1 text-xs font-semibold sm:text-sm",
            tab === "apprentices" ? "bg-primary text-primary-fg" : "text-muted",
          )}
        >
          <GraduationCap className="ml-1 inline size-4" /> پنجشنبه‌ها
        </button>
        <button
          type="button"
          onClick={() => setTab("money")}
          className={cn(
            "h-12 rounded-xl px-1 text-xs font-semibold sm:text-sm",
            tab === "money" ? "bg-primary text-primary-fg" : "text-muted",
          )}
        >
          <Wallet className="ml-1 inline size-4" /> درآمد ماه
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="mt-3" variant="outline" onClick={() => void refresh()}>
            تلاش دوباره
          </Button>
        </div>
      ) : null}
      {loading ? <p className="mt-6 text-sm text-muted">در حال دریافت اطلاعات…</p> : null}

      {!loading && !error && tab === "calendar" ? (
        <OwnerCalendar items={bookings} businesses={businesses} onChange={() => void refresh()} />
      ) : null}

      {!loading && !error && tab === "jobs" ? (
        <MonthJobsPanel businesses={businesses} bookings={bookings} onChange={() => void refresh()} />
      ) : null}

      {!loading && !error && tab === "apprentices" ? <StudioApprenticeBoard /> : null}

      {!loading && !error && tab === "money" ? <StudioMonthFinance /> : null}

      {!loading && !error && tab === "requests" ? (
        <div className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(
              [
                ["active", "در جریان"],
                ["receipt", "رسیدهای جدید"],
                ["booked", "قطعی‌شده"],
                ["all", "همه"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm",
                  filter === value
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border bg-surface",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {!filtered.length ? (
            <p className="mt-5 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
              در این بخش درخواستی وجود ندارد.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4">
            {filtered.map((request) => (
              <TattooAdminCard
                key={request.id}
                request={request}
                requests={requests}
                businesses={businesses}
                bookings={bookings}
                onChange={() => void refresh()}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function tehranDateInput(iso: string | null) {
  if (!iso) return "";
  return tehranDayKey(new Date(iso));
}

function tehranTimeInput(iso: string | null) {
  if (!iso) return "12:00";
  const clock = tehranClock(new Date(iso));
  return `${String(clock.hh).padStart(2, "0")}:${String(clock.mm).padStart(2, "0")}`;
}

function requestBadge(request: TattooRequest) {
  return TATTOO_ADMIN_STAGE_LABEL[tattooStage(request)];
}

function TattooAdminCard({
  request,
  requests,
  businesses,
  bookings,
  onChange,
}: {
  request: TattooRequest;
  requests: TattooRequest[];
  businesses: Business[];
  bookings: Booking[];
  onChange: () => void;
}) {
  const [businessId, setBusinessId] = useState(request.businessId ?? businesses[0]?.id ?? "");
  const [price, setPrice] = useState(request.priceMinToman?.toString() ?? "");
  const [sessions, setSessions] = useState(request.sessionCount?.toString() ?? "1");
  const [minutes, setMinutes] = useState(request.sessionMinutes?.toString() ?? "180");
  const [deposit, setDeposit] = useState(request.depositToman?.toString() ?? "");
  const defaultBank = TATTOO_SETTLEMENT_PRESETS[0];
  const [cardNumber, setCardNumber] = useState(request.paymentCardNumber || defaultBank.card);
  const [iban, setIban] = useState(request.paymentIban || defaultBank.iban);
  const [message, setMessage] = useState(request.artistMessage || studioVisitText());
  const [day, setDay] = useState(tehranDateInput(request.proposedSlotStart));
  const [time, setTime] = useState(tehranTimeInput(request.proposedSlotStart));
  const [busy, setBusy] = useState(false);
  const slotLocked =
    request.paymentStatus === "awaiting_payment" ||
    request.paymentStatus === "receipt_submitted" ||
    request.paymentStatus === "rejected";
  const showProposalForm =
    request.status !== "booked" && request.status !== "rejected" && !slotLocked;
  const busyKeys = useMemo(() => {
    const keys = new Set<string>(thursdayBusyKeys());
    for (const booking of bookings) {
      if (booking.businessId !== businessId || booking.status === "cancelled") continue;
      keys.add(tehranDayKey(new Date(booking.slotStart)));
    }
    for (const other of requests) {
      if (other.id === request.id || other.businessId !== businessId || !other.proposedSlotStart) continue;
      if (!["proposal_pending", "awaiting_payment", "receipt_submitted", "rejected"].includes(other.paymentStatus)) continue;
      keys.add(tehranDayKey(new Date(other.proposedSlotStart)));
    }
    return [...keys];
  }, [bookings, businessId, request.id, requests]);
  const sameDayBookings = useMemo(
    () =>
      !day
        ? []
        : bookings.filter(
            (booking) =>
              booking.businessId === businessId &&
              booking.status !== "cancelled" &&
              tehranDayKey(new Date(booking.slotStart)) === day,
          ),
    [bookings, businessId, day],
  );
  const sameDayProposals = useMemo(
    () =>
      !day
        ? []
        : requests.filter(
            (other) =>
              other.id !== request.id &&
              other.businessId === businessId &&
              other.proposedSlotStart &&
              ["proposal_pending", "awaiting_payment", "receipt_submitted", "rejected"].includes(other.paymentStatus) &&
              tehranDayKey(new Date(other.proposedSlotStart)) === day,
          ),
    [businessId, day, request.id, requests],
  );

  function proposalIso() {
    if (!day || !time) return null;
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return tehranLocalToIso(y, m, d, hh, mm);
  }

  async function decide(status: "approved" | "needs_info" | "rejected") {
    if (message.trim().length < 2) return toast.error("پیام کوتاهی برای مشتری بنویسید.");
    if (status === "approved" && (!price || !minutes || !deposit || !proposalIso()))
      return toast.error("قیمت، بیعانه، مدت جلسه و تاریخ و ساعت را کامل کنید.");
    setBusy(true);
    try {
      await saveAction("decideTattooRequest", {
        id: request.id,
        status,
        businessId: businessId || null,
        priceMinToman: price ? Number(price) : null,
        priceMaxToman: null,
        sessionMinutes: minutes ? Number(minutes) : null,
        sessionCount: sessions ? Number(sessions) : 1,
        depositToman: deposit ? Number(deposit) : null,
        paymentCardNumber: cardNumber || null,
        paymentIban: iban || null,
        proposedSlotStart: status === "approved" ? proposalIso() : null,
        artistMessage: message,
      });
      toast.success(status === "approved" ? "پیشنهاد برای مشتری ارسال شد." : "نتیجه ثبت شد.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const type =
    request.requestType === "coverup"
      ? "کاور یا بازطراحی"
      : request.requestType === "consultation"
        ? "مشاوره"
        : "تاتوی جدید";
  return (
    <article className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{request.customerName}</h2>
          <p className="text-sm text-muted">
            {type} · {request.style} · {request.placement}
          </p>
        </div>
        <Badge>{requestBadge(request)}</Badge>
      </div>
      <p className="mt-3 text-sm leading-7">{request.idea}</p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span>اندازه: {request.sizeCm}</span>
        <a className="text-accent" href={`tel:${request.customerPhone}`}>
          {request.customerPhone}
        </a>
        {request.customerPhone2 ? (
          <a className="text-accent" href={`tel:${request.customerPhone2}`}>
            دوم: {request.customerPhone2}
          </a>
        ) : null}
        {request.customerInstagram ? (
          <a
            className="text-accent"
            href={instagramProfileUrl(request.customerInstagram) ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            اینستاگرام: @{normalizeInstagramHandle(request.customerInstagram)}
          </a>
        ) : null}
        {request.preferredDates ? <span>زمان مناسب مشتری: {request.preferredDates}</span> : null}
      </div>
      <DesignThumbs
        images={[...request.referenceImages, ...request.bodyImages]}
        filePrefix={`${request.customerName}-${request.style}`}
      />

      {request.paymentStatus === "expired" ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          مهلت واریز تمام شد و این زمان آزاد شد. زمان تازه‌ای از روزهای آزاد بفرستید.
        </div>
      ) : null}
      {request.paymentStatus === "proposal_pending" && request.proposedSlotStart ? (
        <div className="mt-4 rounded-2xl border border-border bg-bg p-3 text-sm">
          <p className="font-semibold">پیشنهاد ارسال شده؛ هنوز روی تقویم قفل نشده است.</p>
          <p className="mt-1 text-muted">{formatFaDateTime(request.proposedSlotStart)}</p>
        </div>
      ) : null}
      {request.paymentStatus === "awaiting_payment" && request.proposedSlotStart ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">مشتری زمان را تأیید کرد؛ این بازه ۶ ساعت قفل است.</p>
          <p className="mt-1">{formatFaDateTime(request.proposedSlotStart)}</p>
          {request.paymentHoldUntil ? <p className="mt-1">تا {formatFaDateTime(request.paymentHoldUntil)}</p> : null}
        </div>
      ) : null}
      {request.paymentStatus === "rejected" && request.proposedSlotStart ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">رسید رد شد؛ مشتری ۶ ساعت برای اصلاح فرصت دارد. زمان هنوز قفل است.</p>
          <p className="mt-1">{formatFaDateTime(request.proposedSlotStart)}</p>
          {request.paymentHoldUntil ? <p className="mt-1">تا {formatFaDateTime(request.paymentHoldUntil)}</p> : null}
        </div>
      ) : null}

      {request.paymentStatus === "receipt_submitted" ? (
        <ReceiptReview request={request} onChange={onChange} />
      ) : null}

      {showProposalForm ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField label="قیمت نهایی" hint="تومان" value={price} onChange={setPrice} />
            <NumberField label="مبلغ بیعانه" hint="تومان" value={deposit} onChange={setDeposit} />
            <NumberField
              label="تعداد جلسات"
              hint="مثلاً ۱"
              value={sessions}
              onChange={setSessions}
            />
            <NumberField label="مدت هر جلسه" hint="دقیقه" value={minutes} onChange={setMinutes} />
            <Field label="تاریخ پیشنهادی">
              <JalaliDatePicker
                value={day}
                onChange={setDay}
                label="انتخاب روز از تقویم شمسی"
                busyKeys={busyKeys}
              />
            </Field>
            <Field label="ساعت شروع">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium">حساب واریز</p>
            <p className="mt-1 text-xs leading-6 text-muted">
              روی عنوان بانک بزنید تا هم شبا و هم کارت با هم پر شود.
            </p>
            <BankPresetButtons
              selectedCard={cardNumber}
              selectedIban={iban}
              onPick={(preset) => {
                setCardNumber(preset.card);
                setIban(preset.iban);
              }}
            />
          </div>
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            <Field label="شماره کارت">
              <Input
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                inputMode="numeric"
                dir="ltr"
                placeholder="۱۶ رقم"
              />
            </Field>
            <Field label="شماره شبا">
              <Input
                value={iban}
                onChange={(e) =>
                  setIban(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 26))
                }
                dir="ltr"
                placeholder="IR…"
              />
            </Field>
          </div>
          {day ? (
            <div className="mt-3 rounded-2xl border border-border bg-bg p-3">
              <p className="text-sm font-semibold">برنامه این روز</p>
              {sameDayBookings.length || sameDayProposals.length ? (
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {sameDayBookings.map((booking) => (
                    <li key={booking.id}>
                      {formatFaDateTime(booking.slotStart)} · {booking.customerName || "زمان بسته"}
                      {booking.status === "confirmed" ? " · قطعی" : " · قفل موقت"}
                    </li>
                  ))}
                  {sameDayProposals.map((other) => (
                    <li key={other.id}>
                      {formatFaDateTime(other.proposedSlotStart!)} · {other.customerName} · پیشنهاد
                      {other.paymentStatus === "proposal_pending" ? " (هنوز قفل نشده)" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-emerald-700">این روز هنوز نوبت ثبت‌شده ندارد.</p>
              )}
            </div>
          ) : null}
          <Field label="پیام برای مشتری">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="نتیجه بررسی. آدرس استودیو خودش به پیام مشتری اضافه می‌شود."
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void decide("approved")}>
              ارسال قیمت و زمان پیشنهادی
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => void decide("needs_info")}>
              درخواست اطلاعات بیشتر
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => void decide("rejected")}>
              عدم پذیرش
            </Button>
          </div>
        </>
      ) : request.status === "booked" ? (
        <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">این نوبت قطعی و در تقویم کاری ثبت شده است.</p>
          {request.proposedSlotStart ? (
            <p className="mt-1">{formatFaDateTime(request.proposedSlotStart)}</p>
          ) : null}
          <BookedSlotActions request={request} busyKeys={busyKeys} onChange={onChange} />
        </div>
      ) : null}
    </article>
  );
}

function ReceiptReview({ request, onChange }: { request: TattooRequest; onChange: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const overdue = isTattooReviewOverdue(request.paymentStatus, request.paymentReviewDeadline);
  async function decide(approved: boolean) {
    const text = message.trim().length >= 2
      ? message.trim()
      : approved
        ? "رسید بررسی و تأیید شد. نوبت شما قطعی است."
        : "";
    if (!approved && text.length < 2) {
      toast.error("دلیل رد رسید را بنویسید تا مشتری بتواند اصلاح کند.");
      return;
    }
    setBusy(true);
    try {
      await saveAction("decideTattooReceipt", { requestId: request.id, approved, message: text });
      toast.success(approved ? "رسید تأیید و نوبت در تقویم قطعی شد." : "رسید رد شد؛ مشتری ۶ ساعت برای اصلاح فرصت دارد.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={cn("mt-4 rounded-2xl border-2 p-4", overdue ? "border-destructive/50 bg-destructive/5" : "border-accent/40 bg-accent/5")}>
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-accent" />
        <p className="font-bold">رسید واریزی مشتری</p>
      </div>
      {request.paymentSubmittedAt ? (
        <p className="mt-1 text-xs text-muted">
          ارسال: {formatFaDateTime(request.paymentSubmittedAt)}
        </p>
      ) : null}
      {request.paymentReviewDeadline ? (
        <p className={cn("mt-1 text-sm", overdue ? "font-semibold text-destructive" : "text-muted")}>
          {overdue
            ? "مهلت ۱۲ ساعته بررسی گذشته — همین حالا تأیید یا رد کنید تا وقت بلاتکلیف نماند."
            : `مهلت بررسی: ${formatFaDateTime(request.paymentReviewDeadline)}`}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">مهلت بررسی رسید: ۱۲ ساعت از زمان ارسال</p>
      )}
      {request.proposedSlotStart ? (
        <p className="mt-1 text-sm">زمان توافق‌شده: {formatFaDateTime(request.proposedSlotStart)}</p>
      ) : null}
      {request.receiptImage ? (
        <a href={request.receiptImage} target="_blank" rel="noreferrer">
          <img
            src={request.receiptImage}
            alt="رسید پرداخت"
            className="mt-3 max-h-72 rounded-xl object-contain"
          />
        </a>
      ) : null}
      <Textarea
        className="mt-3"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="پیام تأیید، یا دلیل رد برای فرصت اصلاح"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void decide(true)}>
          تأیید رسید و ثبت قطعی در تقویم
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => void decide(false)}>
          رد رسید و فرصت اصلاح
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        placeholder={hint}
      />
    </Field>
  );
}

function BankPresetButtons({
  selectedCard,
  selectedIban,
  onPick,
}: {
  selectedCard: string;
  selectedIban: string;
  onPick: (preset: (typeof TATTOO_SETTLEMENT_PRESETS)[number]) => void;
}) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {TATTOO_SETTLEMENT_PRESETS.map((preset) => {
        const active =
          selectedCard.replace(/\D/g, "") === preset.card &&
          selectedIban.replace(/\s/g, "").toUpperCase() === preset.iban;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPick(preset)}
            className={cn(
              "min-h-11 rounded-2xl border p-3 text-right",
              active ? "border-primary bg-primary/10" : "border-border bg-bg",
            )}
          >
            <span className="block text-sm font-semibold leading-6">{preset.title}</span>
            <span className="mt-1 block text-xs text-muted" dir="ltr">
              {formatCardNumber(preset.card)}
            </span>
            <span className="block text-xs text-muted" dir="ltr">
              {preset.iban}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MonthJobsPanel({
  businesses,
  bookings,
  onChange,
}: {
  businesses: Business[];
  bookings: Booking[];
  onChange: () => void;
}) {
  const clock = tehranClock();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.day);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  const [jobs, setJobs] = useState<TattooRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await saveAction<TattooRequest[]>("studioMonthJobs", { jy: month.jy, jm: month.jm });
      setJobs(rows);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [month.jy, month.jm]);

  async function refreshAll() {
    await load();
    onChange();
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-lg font-bold">لیست کارهای این ماه</h2>
          <p className="mt-1 text-sm leading-7 text-muted">
            نام، طرح، محل اجرا، زمان، مجموع واریزی، مانده و وضعیت تسویه. واریز دوم و سوم را همین‌جا اضافه کنید.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!jobs.length}
            onClick={() => {
              try {
                downloadStudioJobsPdf(
                  jobs,
                  `لیست مشتری ${JALALI_MONTHS[month.jm - 1]} ${toFaDigits(month.jy)}`,
                );
                toast.success("فایل لیست روی گوشی ذخیره شد. اگر PDF خواستی از چاپ، ذخیره به‌صورت PDF را بزن.");
              } catch (err) {
                toast.error(friendlyError(err));
              }
            }}
          >
            <FileDown className="size-4" />
            دانلود PDF لیست
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}>
            ماه قبل
          </Button>
          <p className="min-w-28 text-center text-sm font-semibold">
            {JALALI_MONTHS[month.jm - 1]} {toFaDigits(month.jy)}
          </p>
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}>
            ماه بعد
          </Button>
        </div>
      </div>

      <StudioJobForm businesses={businesses} bookings={bookings} onCreated={() => void refreshAll()} />

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-muted">در حال دریافت لیست ماه…</p> : null}
      {!loading && !jobs.length ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm leading-7 text-muted">
          در این ماه کار رزرو‌شده‌ای نیست. کارهای عقب‌افتاده را از فرم بالا دستی وارد کنید. تاریخ‌های سه‌شنبه ۵ آبان، شنبه ۹ آبان و جمعه ۱۴ آبان را هم همین‌جا ثبت کنید.
        </p>
      ) : null}
      {jobs.map((job) => (
        <MonthJobCard
          key={`${job.id}-${job.updatedAt}-${job.paidToman}`}
          job={job}
          busyKeys={bookings
            .filter((booking) => booking.status !== "cancelled")
            .map((booking) => tehranDayKey(new Date(booking.slotStart)))}
          onChange={() => void refreshAll()}
        />
      ))}

      <ClearCalendarBox
        onCleared={() => {
          setJobs([]);
          void refreshAll();
        }}
      />
    </div>
  );
}

function BookedSlotActions({
  request,
  busyKeys,
  onChange,
}: {
  request: TattooRequest;
  busyKeys: string[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [day, setDay] = useState(tehranDateInput(request.proposedSlotStart));
  const [time, setTime] = useState(tehranTimeInput(request.proposedSlotStart));
  const [minutes, setMinutes] = useState(request.sessionMinutes?.toString() ?? "180");
  const [busy, setBusy] = useState(false);

  async function saveTime() {
    if (!day || !time) return toast.error("تاریخ و ساعت را انتخاب کنید.");
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    setBusy(true);
    try {
      await saveAction("updateStudioJob", {
        id: request.id,
        slotStart: tehranLocalToIso(y, m, d, hh, mm),
        sessionMinutes: minutes ? Number(minutes) : undefined,
      });
      toast.success("زمان نوبت عوض شد و به مشتری خبر داده شد.");
      setEditing(false);
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await saveAction("cancelStudioJob", { id: request.id });
      toast.success("نوبت از تقویم حذف شد.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="تاریخ جدید">
            <JalaliDatePicker value={day} onChange={setDay} label="انتخاب روز" busyKeys={busyKeys} />
          </Field>
          <Field label="ساعت شروع">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <NumberField label="مدت جلسه" hint="دقیقه" value={minutes} onChange={setMinutes} />
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button disabled={busy} size="sm" onClick={() => void saveTime()}>
              ذخیره زمان جدید
            </Button>
            <Button disabled={busy} size="sm" variant="outline" onClick={() => setEditing(false)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} size="sm" variant="outline" onClick={() => setEditing(true)}>
            ویرایش زمان
          </Button>
          <Button
            disabled={busy}
            size="sm"
            variant="outline"
            className={confirmDelete ? "border-destructive text-destructive" : ""}
            onClick={() => void remove()}
          >
            {confirmDelete ? "مطمئنی؟ حذف شود" : "حذف نوبت"}
          </Button>
        </div>
      )}
    </div>
  );
}

function MonthJobCard({
  job,
  busyKeys,
  onChange,
}: {
  job: TattooRequest;
  busyKeys: string[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(job.customerName);
  const [style, setStyle] = useState(job.style);
  const [placement, setPlacement] = useState(job.placement);
  const [idea, setIdea] = useState(job.idea);
  const [sizeCm, setSizeCm] = useState(job.sizeCm);
  const [price, setPrice] = useState(job.priceMinToman?.toString() ?? "");
  const [phoneEdit, setPhoneEdit] = useState(job.customerPhone && job.customerPhone !== "09000000000" ? job.customerPhone : "");
  const [phone2Edit, setPhone2Edit] = useState(job.customerPhone2 || "");
  const [instagramEdit, setInstagramEdit] = useState(job.customerInstagram || "");
  const [images, setImages] = useState<string[]>([...(job.referenceImages ?? [])]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const balance = tattooBalance(job.priceMinToman, job.paidToman);
  const when = job.proposedSlotStart || job.updatedAt;
  const phone = job.customerPhone && job.customerPhone !== "09000000000" ? job.customerPhone : "";
  const phone2 = job.customerPhone2 || "";
  const designs = [...(job.referenceImages ?? []), ...(job.bodyImages ?? [])];

  async function save() {
    setBusy(true);
    try {
      await saveAction("updateStudioJob", {
        id: job.id,
        customerName: name.trim(),
        customerPhone: phoneEdit.trim() || undefined,
        customerPhone2: phone2Edit.trim() || "",
        customerInstagram: instagramEdit.trim() || "",
        style: style.trim(),
        placement: placement.trim(),
        idea: idea.trim() || undefined,
        sizeCm: sizeCm.trim() || undefined,
        priceMinToman: price ? Number(price) : undefined,
        referenceImages: images,
      });
      toast.success("کار به‌روز شد.");
      setEditing(false);
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function addPayment() {
    if (!amount || Number(amount) <= 0) return toast.error("مبلغ واریز را بنویسید.");
    setBusy(true);
    try {
      await saveAction("addStudioPayment", {
        requestId: job.id,
        amountToman: Number(amount),
        note: note.trim() || "واریز بعدی",
      });
      toast.success("واریز به مجموع اضافه شد.");
      setAmount("");
      setNote("");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{job.customerName}</h3>
          <p className="text-sm text-muted">
            طرح {job.style}
            {job.placement ? ` · ${job.placement}` : ""}
          </p>
          <p className="mt-1 text-sm">{formatFaDateTime(when)}</p>
          <BookedSlotActions request={job} busyKeys={busyKeys} onChange={onChange} />
          {phone ? (
            <a className="mt-1 inline-block text-sm text-accent" href={`tel:${phone}`}>
              {phone}
            </a>
          ) : null}
          {phone2 ? (
            <a className="mt-1 mr-3 inline-block text-sm text-accent" href={`tel:${phone2}`}>
              دوم: {phone2}
            </a>
          ) : null}
          {job.customerInstagram ? (
            <a
              className="mt-1 mr-3 inline-block text-sm text-accent"
              href={instagramProfileUrl(job.customerInstagram) ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              @{normalizeInstagramHandle(job.customerInstagram)}
            </a>
          ) : null}
        </div>
        <Badge tone={balance.settled ? "accent" : "muted"}>{balance.settled ? "تسویه شده" : "تسویه نشده"}</Badge>
      </div>
      <DesignThumbs images={designs} filePrefix={`${job.customerName}-${job.style}`} />
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-bg p-3">
          <dt className="text-muted">مجموع واریزی</dt>
          <dd className="mt-1 font-semibold">{formatTattooToman(balance.paid)}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-bg p-3">
          <dt className="text-muted">مبلغ کل</dt>
          <dd className="mt-1 font-semibold">{formatTattooToman(balance.total)}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-bg p-3">
          <dt className="text-muted">مانده</dt>
          <dd className="mt-1 font-semibold">{formatTattooToman(balance.remaining)}</dd>
        </div>
      </dl>
      {job.payments?.length ? (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {job.payments.map((payment) => (
            <li key={payment.id}>
              {formatTattooToman(payment.amountToman)}
              {payment.note ? ` · ${payment.note}` : ""}
              {payment.createdAt ? ` · ${formatFaDateTime(payment.createdAt)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
          {editing ? "بستن ویرایش" : "ویرایش طرح، محل اجرا و واریزی"}
        </Button>
      </div>
      {editing ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="شماره تماس">
              <Input value={phoneEdit} onChange={(e) => setPhoneEdit(e.target.value)} dir="ltr" />
            </Field>
            <Field label="شماره دوم">
              <Input value={phone2Edit} onChange={(e) => setPhone2Edit(e.target.value)} dir="ltr" />
            </Field>
            <Field label="اینستاگرام">
              <Input value={instagramEdit} onChange={(e) => setInstagramEdit(e.target.value)} dir="ltr" placeholder="بدون @" />
            </Field>
            <Field label="طرح">
              <Input value={style} onChange={(e) => setStyle(e.target.value)} />
            </Field>
            <Field label="محل اجرا">
              <Input value={placement} onChange={(e) => setPlacement(e.target.value)} />
            </Field>
            <Field label="اندازه">
              <Input value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} />
            </Field>
            <NumberField label="مبلغ کل" hint="تومان" value={price} onChange={setPrice} />
            <Field label="توضیح طرح">
              <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} />
            </Field>
          </div>
          <DesignThumbs
            images={images}
            filePrefix={`${name}-${style}`}
            onFiles={(urls) => setImages((current) => [...current, ...urls].slice(0, 3))}
            onRemove={(index) => setImages((current) => current.filter((_, i) => i !== index))}
          />
          <Button className="mt-3" disabled={busy} onClick={() => void save()}>
            ذخیره تغییرات
          </Button>
          <div className="mt-4 rounded-2xl border border-border bg-bg p-3">
            <p className="text-sm font-semibold">ثبت واریز بعدی</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="مبلغ واریز" hint="تومان" value={amount} onChange={setAmount} />
              <Field label="یادداشت">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً واریز دوم" />
              </Field>
            </div>
            <Button className="mt-3" variant="outline" disabled={busy} onClick={() => void addPayment()}>
              افزودن به مجموع واریزی
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ClearCalendarBox({ onCleared }: { onCleared: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function clear() {
    if (confirm !== "پاک شود") {
      toast.error('برای تأیید بنویسید: پاک شود');
      return;
    }
    setBusy(true);
    try {
      await saveAction("clearStudioCalendar", { confirm: "پاک شود" });
      toast.success("ثبت‌های تقویم کاری پاک شد. لیست تمیز است؛ نوبت‌ها را دستی وارد کنید.");
      setConfirm("");
      onCleared();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="font-semibold text-destructive">پاک‌کردن ثبت‌های تقویم کاری</h3>
      <p className="mt-2 text-sm leading-7 text-muted">
        نوبت‌های ثبت‌شده تا الان لغو می‌شوند تا لیست تمیز شود. درخواست‌های مشتری سر جایشان می‌مانند. تاریخ‌های ۵، ۹ و ۱۴ آبان را بعداً دستی وارد کنید.
      </p>
      <Field label='برای تأیید بنویسید: پاک شود'>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="پاک شود" />
      </Field>
      <Button className="mt-3" variant="danger" disabled={busy || confirm !== "پاک شود"} onClick={() => void clear()}>
        پاک‌کردن تقویم کاری
      </Button>
    </article>
  );
}

