import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, CreditCard, Images, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OwnerCalendar } from "@/components/calendar/owner-calendar";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDateTime, formatToman } from "@/lib/format";
import { tehranLocalToIso } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import type { Booking, Business, Profile, TattooRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/admin")({ component: StudioAdminPage });

type PanelTab = "requests" | "calendar";
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

  const filtered = useMemo(() => requests.filter((request) => {
    if (filter === "receipt") return request.paymentStatus === "receipt_submitted";
    if (filter === "booked") return request.status === "booked";
    if (filter === "active") return request.status === "submitted" || request.status === "needs_info" || request.status === "approved";
    return true;
  }), [filter, requests]);

  if (!user) return <SignedOutPanel title="مدیریت تاتو" next="/studio/admin" loading={isPending} error={sessionError} onRetry={retry} />;
  if (profile && !profile.isAdmin) return <Shell><p className="rounded-2xl border border-border bg-surface p-5">این صفحه فقط برای مدیر استودیو فعال است.</p></Shell>;

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-accent">استودیو پیمان زیبائی‌فر</p>
          <h1 className="text-2xl font-bold">مدیریت تاتو و تقویم کاری</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="size-4" /> تازه‌سازی</Button>
          <Button asChild variant="outline" size="sm"><Link to="/dashboard">پنل اصلی <ChevronLeft className="size-4" /></Link></Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1.5">
        <button type="button" onClick={() => setTab("requests")} className={cn("h-12 rounded-xl text-sm font-semibold", tab === "requests" ? "bg-primary text-primary-fg" : "text-muted")}>
          درخواست‌ها ({new Intl.NumberFormat("fa-IR").format(requests.length)})
        </button>
        <button type="button" onClick={() => setTab("calendar")} className={cn("h-12 rounded-xl text-sm font-semibold", tab === "calendar" ? "bg-primary text-primary-fg" : "text-muted")}>
          <CalendarDays className="ml-1 inline size-4" /> تقویم کاری
        </button>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm text-destructive">{error}</p><Button className="mt-3" variant="outline" onClick={() => void refresh()}>تلاش دوباره</Button></div> : null}
      {loading ? <p className="mt-6 text-sm text-muted">در حال دریافت اطلاعات…</p> : null}

      {!loading && !error && tab === "calendar" ? <OwnerCalendar items={bookings} businesses={businesses} onChange={() => void refresh()} /> : null}

      {!loading && !error && tab === "requests" ? (
        <div className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {([ ["active", "در جریان"], ["receipt", "رسیدهای جدید"], ["booked", "قطعی‌شده"], ["all", "همه"] ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={cn("h-10 shrink-0 rounded-full border px-4 text-sm", filter === value ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface")}>{label}</button>
            ))}
          </div>
          {!filtered.length ? <p className="mt-5 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">در این بخش درخواستی وجود ندارد.</p> : null}
          <div className="mt-4 grid gap-4">
            {filtered.map((request) => <TattooAdminCard key={request.id} request={request} businesses={businesses} bookings={bookings} onChange={() => void refresh()} />)}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function TattooAdminCard({ request, businesses, bookings, onChange }: { request: TattooRequest; businesses: Business[]; bookings: Booking[]; onChange: () => void }) {
  const [businessId, setBusinessId] = useState(request.businessId ?? businesses[0]?.id ?? "");
  const [price, setPrice] = useState(request.priceMinToman?.toString() ?? "");
  const [sessions, setSessions] = useState(request.sessionCount?.toString() ?? "1");
  const [minutes, setMinutes] = useState(request.sessionMinutes?.toString() ?? "180");
  const [deposit, setDeposit] = useState(request.depositToman?.toString() ?? "");
  const [cardNumber, setCardNumber] = useState(request.paymentCardNumber ?? "");
  const [iban, setIban] = useState(request.paymentIban ?? "");
  const [message, setMessage] = useState(request.artistMessage ?? "");
  const [day, setDay] = useState(request.proposedSlotStart?.slice(0, 10) ?? "");
  const [time, setTime] = useState(request.proposedSlotStart ? new Date(request.proposedSlotStart).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false }) : "12:00");
  const [busy, setBusy] = useState(false);
  const sameDayBookings = useMemo(() => !day ? [] : bookings.filter((booking) => booking.businessId === businessId && booking.status !== "cancelled" && new Date(booking.slotStart).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }) === day), [bookings, businessId, day]);

  function proposalIso() {
    if (!day || !time) return null;
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return tehranLocalToIso(y, m, d, hh, mm);
  }

  async function decide(status: "approved" | "needs_info" | "rejected") {
    if (message.trim().length < 2) return toast.error("پیام کوتاهی برای مشتری بنویسید.");
    if (status === "approved" && (!businessId || !price || !minutes || !deposit || !proposalIso())) return toast.error("قیمت، بیعانه، مدت جلسه و تاریخ و ساعت را کامل کنید.");
    setBusy(true);
    try {
      await saveAction("decideTattooRequest", {
        id: request.id, status, businessId: businessId || null,
        priceMinToman: price ? Number(price) : null, priceMaxToman: null,
        sessionMinutes: minutes ? Number(minutes) : null,
        sessionCount: sessions ? Number(sessions) : 1,
        depositToman: deposit ? Number(deposit) : null,
        paymentCardNumber: cardNumber || null, paymentIban: iban || null,
        proposedSlotStart: status === "approved" ? proposalIso() : null,
        artistMessage: message,
      });
      toast.success(status === "approved" ? "پیشنهاد برای مشتری ارسال شد." : "نتیجه ثبت شد.");
      onChange();
    } catch (err) { toast.error(friendlyError(err)); }
    finally { setBusy(false); }
  }

  const type = request.requestType === "coverup" ? "کاور یا بازطراحی" : request.requestType === "consultation" ? "مشاوره" : "تاتوی جدید";
  return (
    <article className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold">{request.customerName}</h2><p className="text-sm text-muted">{type} · {request.style} · {request.placement}</p></div>
        <Badge>{request.status === "booked" ? "قطعی" : request.paymentStatus === "receipt_submitted" ? "رسید جدید" : request.status === "approved" ? "منتظر مشتری" : "در انتظار بررسی"}</Badge>
      </div>
      <p className="mt-3 text-sm leading-7">{request.idea}</p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted"><span>اندازه: {request.sizeCm}</span><a className="text-accent" href={`tel:${request.customerPhone}`}>{request.customerPhone}</a>{request.preferredDates ? <span>زمان مناسب مشتری: {request.preferredDates}</span> : null}{request.budgetToman ? <span>بودجه: {formatToman(request.budgetToman)}</span> : null}</div>
      {[...request.referenceImages, ...request.bodyImages].length ? <div className="mt-4 flex gap-2 overflow-x-auto"><Images className="mt-7 size-5 shrink-0 text-muted" />{[...request.referenceImages, ...request.bodyImages].map((src, index) => <a key={`${request.id}-${index}`} href={src} target="_blank" rel="noreferrer"><img src={src} alt="عکس درخواست" className="size-24 rounded-xl border border-border object-cover" /></a>)}</div> : null}

      {request.paymentStatus === "receipt_submitted" ? <ReceiptReview request={request} onChange={onChange} /> : null}

      {request.status !== "booked" ? <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="صفحه کسب‌وکار"><NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}><option value="">انتخاب کنید</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</NativeSelect></Field>
          <NumberField label="قیمت نهایی" hint="تومان" value={price} onChange={setPrice} />
          <NumberField label="مبلغ بیعانه" hint="تومان" value={deposit} onChange={setDeposit} />
          <NumberField label="تعداد جلسات" hint="مثلاً ۱" value={sessions} onChange={setSessions} />
          <NumberField label="مدت هر جلسه" hint="دقیقه" value={minutes} onChange={setMinutes} />
          <Field label="تاریخ پیشنهادی"><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="ساعت شروع"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label="شماره کارت"><Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))} inputMode="numeric" dir="ltr" placeholder="۱۶ رقم" /></Field>
          <Field label="شماره شبا"><Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 26))} dir="ltr" placeholder="IR…" /></Field>
        </div>
        {day ? <div className="mt-3 rounded-2xl border border-border bg-bg p-3"><p className="text-sm font-semibold">برنامه این روز</p>{sameDayBookings.length ? <ul className="mt-2 space-y-1 text-sm text-muted">{sameDayBookings.map((booking) => <li key={booking.id}>{formatFaDateTime(booking.slotStart)} · {booking.customerName || "زمان بسته"}</li>)}</ul> : <p className="mt-1 text-sm text-emerald-700">این روز هنوز نوبت ثبت‌شده ندارد.</p>}</div> : null}
        <Field label="پیام برای مشتری"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="نتیجه بررسی و شرایط اجرا" /></Field>
        <div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void decide("approved")}>ارسال قیمت و زمان پیشنهادی</Button><Button disabled={busy} variant="outline" onClick={() => void decide("needs_info")}>درخواست اطلاعات بیشتر</Button><Button disabled={busy} variant="outline" onClick={() => void decide("rejected")}>عدم پذیرش</Button></div>
      </> : <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">این نوبت قطعی و در تقویم کاری ثبت شده است.</p>{request.proposedSlotStart ? <p className="mt-1">{formatFaDateTime(request.proposedSlotStart)}</p> : null}</div>}
    </article>
  );
}

function ReceiptReview({ request, onChange }: { request: TattooRequest; onChange: () => void }) {
  const [message, setMessage] = useState("رسید بررسی و تأیید شد. نوبت شما قطعی است.");
  const [busy, setBusy] = useState(false);
  async function decide(approved: boolean) {
    setBusy(true);
    try { await saveAction("decideTattooReceipt", { requestId: request.id, approved, message }); toast.success(approved ? "رسید تأیید و نوبت در تقویم قطعی شد." : "رسید رد شد."); onChange(); }
    catch (err) { toast.error(friendlyError(err)); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 rounded-2xl border-2 border-accent/40 bg-accent/5 p-4"><div className="flex items-center gap-2"><CreditCard className="size-5 text-accent" /><p className="font-bold">رسید واریزی مشتری</p></div>{request.paymentSubmittedAt ? <p className="mt-1 text-xs text-muted">ارسال: {formatFaDateTime(request.paymentSubmittedAt)}</p> : null}{request.receiptImage ? <a href={request.receiptImage} target="_blank" rel="noreferrer"><img src={request.receiptImage} alt="رسید پرداخت" className="mt-3 max-h-72 rounded-xl object-contain" /></a> : null}<Textarea className="mt-3" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} /><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => void decide(true)}>تأیید رسید و ثبت قطعی در تقویم</Button><Button disabled={busy} variant="outline" onClick={() => void decide(false)}>رد رسید</Button></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-3 grid gap-1.5 text-sm"><span className="font-medium">{label}</span>{children}</label>; }
function NumberField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><Input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={hint} /></Field>; }
