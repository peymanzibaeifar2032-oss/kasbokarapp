import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ClipboardList, CreditCard, Images, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OwnerCalendar } from "@/components/calendar/owner-calendar";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { JALALI_MONTHS, gregorianToJalali, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import type { BusinessResource } from "@/lib/calendar/resources";
import { formatFaDateTime } from "@/lib/format";
import { tehranClock, tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import {
  TATTOO_ADMIN_STAGE_LABEL,
  TATTOO_SETTLEMENT_PRESETS,
  formatCardNumber,
  formatTattooToman,
  isTattooReviewOverdue,
  tattooBalance,
  tattooStage,
} from "@/lib/tattoo-flow";
import type { Booking, Business, Profile, TattooRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/admin")({ component: StudioAdminPage });

type PanelTab = "requests" | "jobs" | "calendar";
type RequestFilter = "active" | "receipt" | "booked" | "all";

function StudioAdminPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const userId = user?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
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
    void saveAction<Profile>("profile").then((next) => {
      setProfile(next);
      if (next.isAdmin) void refresh();
    });
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
  if (profile && !profile.isAdmin)
    return (
      <Shell>
        <p className="rounded-2xl border border-border bg-surface p-5">
          این صفحه فقط برای مدیر استودیو فعال است.
        </p>
      </Shell>
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

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1.5">
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
  const [message, setMessage] = useState(request.artistMessage ?? "");
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
    const keys = new Set<string>();
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
    if (status === "approved" && (!businessId || !price || !minutes || !deposit || !proposalIso()))
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
        {request.preferredDates ? <span>زمان مناسب مشتری: {request.preferredDates}</span> : null}
        {request.budgetToman ? <span>بودجه: {formatTattooToman(request.budgetToman)}</span> : null}
      </div>
      {[...request.referenceImages, ...request.bodyImages].length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          <Images className="mt-7 size-5 shrink-0 text-muted" />
          {[...request.referenceImages, ...request.bodyImages].map((src, index) => (
            <a key={`${request.id}-${index}`} href={src} target="_blank" rel="noreferrer">
              <img
                src={src}
                alt="عکس درخواست"
                className="size-24 rounded-xl border border-border object-cover"
              />
            </a>
          ))}
        </div>
      ) : null}

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
            <Field label="صفحه کسب‌وکار">
              <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                <option value="">انتخاب کنید</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
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
              placeholder="نتیجه بررسی و شرایط اجرا"
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
        <div className="flex items-center gap-2">
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

      <ManualJobForm businesses={businesses} bookings={bookings} onCreated={() => void refreshAll()} />

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
        <MonthJobCard key={`${job.id}-${job.updatedAt}-${job.paidToman}`} job={job} onChange={() => void refreshAll()} />
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

function ManualJobForm({
  businesses,
  bookings,
  onCreated,
}: {
  businesses: Business[];
  bookings: Booking[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [style, setStyle] = useState("");
  const [placement, setPlacement] = useState("");
  const [idea, setIdea] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("12:00");
  const [minutes, setMinutes] = useState("180");
  const [resourceId, setResourceId] = useState("");
  const [resources, setResources] = useState<BusinessResource[]>([]);
  const [busy, setBusy] = useState(false);
  const busyKeys = useMemo(
    () =>
      bookings
        .filter((booking) => booking.businessId === businessId && booking.status !== "cancelled")
        .map((booking) => tehranDayKey(new Date(booking.slotStart))),
    [bookings, businessId],
  );

  useEffect(() => {
    if (!businessId && businesses[0]) setBusinessId(businesses[0].id);
  }, [businesses, businessId]);

  useEffect(() => {
    if (!businessId) return;
    void saveAction<BusinessResource[]>("listResources", { businessId })
      .then((rows) => {
        const active = rows.filter((row) => row.active !== false && !/مهرداد/.test(row.name));
        setResources(active);
        if (active.length === 1) setResourceId(active[0].id);
      })
      .catch(() => setResources([]));
  }, [businessId]);

  async function submit() {
    if (name.trim().length < 2) return toast.error("نام مشتری را بنویسید.");
    if (style.trim().length < 2) return toast.error("طرح را بنویسید.");
    if (placement.trim().length < 2) return toast.error("محل اجرا را بنویسید.");
    if (!price) return toast.error("مبلغ کل را بنویسید.");
    if (!day || !time) return toast.error("تاریخ و ساعت را انتخاب کنید.");
    if (!businessId) return toast.error("صفحه کسب‌وکار را انتخاب کنید.");
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    setBusy(true);
    try {
      await saveAction("createStudioJob", {
        businessId,
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        style: style.trim(),
        idea: idea.trim() || style.trim(),
        placement: placement.trim(),
        sizeCm: sizeCm.trim() || undefined,
        priceMinToman: Number(price),
        paidToman: paid ? Number(paid) : 0,
        sessionMinutes: minutes ? Number(minutes) : 180,
        slotStart: tehranLocalToIso(y, m, d, hh, mm),
        resourceId: resourceId || undefined,
      });
      toast.success("کار به تقویم و لیست ماه اضافه شد.");
      setName("");
      setPhone("");
      setStyle("");
      setPlacement("");
      setIdea("");
      setSizeCm("");
      setPrice("");
      setPaid("");
      setDay("");
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">ثبت دستی کار عقب‌افتاده</h3>
          <p className="mt-1 text-sm text-muted">برای نوبت‌هایی که از لیست گوشی دارید و هنوز در تقویم نیستند.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "بستن فرم" : "افزودن به تقویم کاری"}
        </Button>
      </div>
      {open ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.length > 1 ? (
              <Field label="صفحه کسب‌وکار">
                <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            {resources.length > 1 ? (
              <Field label="کارشناس">
                <NativeSelect value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  {resources.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            <Field label="نام مشتری">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً محمد محمدی" />
            </Field>
            <Field label="موبایل">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="اختیاری" />
            </Field>
            <Field label="طرح">
              <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="طرح انتخابی" />
            </Field>
            <Field label="محل اجرا">
              <Input value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="ساعد، بازو…" />
            </Field>
            <Field label="اندازه">
              <Input value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} placeholder="اختیاری" />
            </Field>
            <NumberField label="مبلغ کل" hint="تومان" value={price} onChange={setPrice} />
            <NumberField label="واریز شده تا الان" hint="تومان" value={paid} onChange={setPaid} />
            <NumberField label="مدت جلسه" hint="دقیقه" value={minutes} onChange={setMinutes} />
            <Field label="تاریخ اجرا">
              <JalaliDatePicker value={day} onChange={setDay} label="انتخاب روز شمسی" busyKeys={busyKeys} />
            </Field>
            <Field label="ساعت">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="توضیح طرح">
            <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} placeholder="اختیاری" />
          </Field>
          <Button className="mt-3" disabled={busy} onClick={() => void submit()}>
            ثبت در تقویم و لیست ماه
          </Button>
        </>
      ) : null}
    </article>
  );
}

function MonthJobCard({ job, onChange }: { job: TattooRequest; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(job.customerName);
  const [style, setStyle] = useState(job.style);
  const [placement, setPlacement] = useState(job.placement);
  const [idea, setIdea] = useState(job.idea);
  const [sizeCm, setSizeCm] = useState(job.sizeCm);
  const [price, setPrice] = useState(job.priceMinToman?.toString() ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const balance = tattooBalance(job.priceMinToman, job.paidToman);
  const when = job.proposedSlotStart || job.updatedAt;
  const phone = job.customerPhone && job.customerPhone !== "09000000000" ? job.customerPhone : "";

  async function save() {
    setBusy(true);
    try {
      await saveAction("updateStudioJob", {
        id: job.id,
        customerName: name.trim(),
        style: style.trim(),
        placement: placement.trim(),
        idea: idea.trim() || undefined,
        sizeCm: sizeCm.trim() || undefined,
        priceMinToman: price ? Number(price) : undefined,
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
          {phone ? (
            <a className="mt-1 inline-block text-sm text-accent" href={`tel:${phone}`}>
              {phone}
            </a>
          ) : null}
        </div>
        <Badge tone={balance.settled ? "accent" : "muted"}>{balance.settled ? "تسویه شده" : "تسویه نشده"}</Badge>
      </div>
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

