import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BusinessForm } from "@/components/business/form";
import { OwnerCalendar } from "@/components/calendar/owner-calendar";
import { FinancePanel } from "@/components/finance/panel";
import { visibilityLabel } from "@/components/business/card";
import { Stars } from "@/components/business/stars";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDate, formatFaDateTime, formatToman, toWhatsAppLink } from "@/lib/format";
import { profileCompleteness, tehranLocalToIso } from "@/lib/hours";
import { t, type MessageKey } from "@/lib/i18n";
import type { CompletenessField } from "@/lib/search/completeness";
import { friendlyError, saveAction } from "@/lib/save";
import type { Booking, Business, Category, OwnerStats, Profile, TattooRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>): { lat?: number; lng?: number } => {
    const lat = Number(s.lat);
    const lng = Number(s.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return {};
  },
  component: Dashboard,
  pendingComponent: function DashboardPending() {
    return <SignedOutPanel title="پنل کسب‌وکار" next="/dashboard" loading />;
  },
  errorComponent: function DashboardError() {
    return <SignedOutPanel title="پنل کسب‌وکار" next="/dashboard" error />;
  },
});

function Dashboard() {
  const pin = Route.useSearch();
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const [tab, setTab] = useState<"list" | "new" | "bookings" | "calendar" | "finance" | "tattoo" | "me">(
    pin.lat != null && pin.lng != null ? "new" : "list",
  );
  const [editing, setEditing] = useState<Business | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mine, setMine] = useState<Business[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [tattooRequests, setTattooRequests] = useState<TattooRequest[]>([]);

  function refresh() {
    void saveAction<Business[]>("mine").then(setMine);
    void saveAction<Booking[]>("ownerBookings").then(setBookings);
    void saveAction<OwnerStats>("ownerStats").then(setStats);
    void saveAction<TattooRequest[]>("studioTattooRequests").then(setTattooRequests).catch(() => undefined);
  }

  useEffect(() => {
    if (!user) return;
    void saveAction<Profile>("profile").then(setProfile);
    void saveAction<Category[]>("categories").then(setCats);
    refresh();
  }, [user]);

  if (!user) {
    const next =
      pin.lat != null && pin.lng != null ? `/dashboard?lat=${pin.lat}&lng=${pin.lng}` : "/dashboard";
    return (
      <SignedOutPanel
        title="پنل کسب‌وکار"
        next={next}
        error={sessionError}
        loading={isPending}
        onRetry={retry}
      />
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">پنل کسب‌وکار</h1>
          <p className="mt-1 text-sm">
            وارد شده‌اید: <strong>{profile?.displayName || user.displayName || user.primaryEmail || "حساب شما"}</strong>
          </p>
          <p className="mt-1 text-sm text-muted">ویرایش صفحه، نوبت‌ها، پیشنهاد ویژه و آمار.</p>
        </div>
        {profile?.isAdmin ? (
          <Link to="/admin" className="text-sm text-accent">
            ورود به مدیریت تأییدها
          </Link>
        ) : null}
      </div>

      {stats ? (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="در انتظار تأیید" value={stats.requested} />
          <Stat label="رزرو تأییدشده" value={stats.confirmed} />
          <Stat label="انجام‌شده" value={stats.done} />
          <Stat label="میانگین امتیاز" value={stats.ratingAvg} rating />
        </div>
      ) : null}

      <div className="mt-5 flex gap-2 overflow-x-auto">
        {(
          ([
            ["list", "کسب‌وکارهای من"],
            ["new", "ثبت جدید"],
            ["calendar", t("navCalendar")],
            ["bookings", "رزروها"],
            ["finance", "مالی"],
            ...(profile?.isAdmin ? [["tattoo", "درخواست‌های تاتو"]] : []),
            ["me", "حساب"],
          ] as [typeof tab, string][])
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setEditing(null);
            }}
            className={cn(
              "h-11 shrink-0 rounded-full border px-4 text-sm",
              tab === id && !editing ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {editing ? (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">ویرایش {editing.name}</h2>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              انصراف
            </Button>
          </div>
          <BusinessForm
            key={editing.id}
            categories={cats}
            initial={editing}
            onSaved={() => {
              setEditing(null);
              setTab("list");
              refresh();
            }}
          />
        </div>
      ) : null}

      {!editing && tab === "list" ? (
        <MineList
          items={mine}
          onRefresh={refresh}
          onEdit={(b) => setEditing(b)}
          onCreate={() => setTab("new")}
        />
      ) : null}
      {!editing && tab === "new" ? (
        <BusinessForm
          key={pin.lat != null ? `${pin.lat},${pin.lng}` : "new"}
          categories={cats}
          presetLocation={pin.lat != null && pin.lng != null ? { lat: pin.lat, lng: pin.lng } : undefined}
          onSaved={() => {
            refresh();
            setTab("list");
          }}
        />
      ) : null}
      {!editing && tab === "calendar" ? (
        <OwnerCalendar items={bookings} businesses={mine} onChange={() => void saveAction<Booking[]>("ownerBookings").then(setBookings)} />
      ) : null}
      {!editing && tab === "bookings" ? (
        <OwnerBookings
          items={bookings}
          businesses={mine}
          onChange={() => void saveAction<Booking[]>("ownerBookings").then(setBookings)}
        />
      ) : null}
      {!editing && tab === "finance" ? <FinancePanel action="financeMine" /> : null}
      {!editing && tab === "tattoo" ? <TattooRequests items={tattooRequests} businesses={mine} onChange={refresh} /> : null}
      {!editing && tab === "me" && profile ? (
        <ProfileForm
          profile={profile}
          email={user.primaryEmail}
          onSaved={() => void saveAction<Profile>("profile").then(setProfile)}
        />
      ) : null}
    </Shell>
  );
}

function Stat({ label, value, rating }: { label: string; value: number; rating?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      {rating ? (
        <div className="mt-2">
          <Stars value={value} size="md" />
        </div>
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{new Intl.NumberFormat("fa-IR").format(value)}</p>
      )}
    </div>
  );
}

function MineList({
  items,
  onRefresh,
  onEdit,
  onCreate,
}: {
  items: Business[];
  onRefresh: () => void;
  onEdit: (b: Business) => void;
  onCreate: () => void;
}) {
  if (!items.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="font-medium">هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <p className="mt-1 text-sm text-muted">۳ قدم: ثبت صفحه، تأیید مدیریت، نمایش روی نقشه با ۷ روز رایگان.</p>
        <ol className="mx-auto mt-5 max-w-md space-y-2 text-right text-sm text-muted">
          <li>۱. نام، دسته، محل روی نقشه و یک خدمت را پر کنید.</li>
          <li>۲. بعد از تأیید، صفحه برای مشتری دیده می‌شود.</li>
          <li>۳. نوبت‌ها را از همین پنل تأیید یا لغو کنید.</li>
        </ol>
        <Button className="mt-5" onClick={onCreate}>
          شروع ثبت کسب‌وکار
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-6 grid gap-3">
      {items.map((b) => {
        const vis = visibilityLabel(b.visibility);
        const complete = profileCompleteness(b);
        const completeLabel: Record<CompletenessField, MessageKey> = {
          name: "completeName",
          category: "completeCategory",
          phone: "completePhone",
          place: "completePlace",
          address: "completeAddress",
          coords: "completeCoords",
          hours: "completeHours",
          prices: "completePrices",
          description: "completeDescription",
        };
        return (
          <article key={b.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{b.name}</h2>
                <p className="text-sm text-muted">
                  {b.city} · {b.categoryName}
                </p>
                <div className="mt-1">
                  <Stars value={b.ratingAvg} count={b.ratingCount} />
                </div>
              </div>
              <Badge tone={vis.tone}>{vis.text}</Badge>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted">
                <span>{t("completeLabel")}</span>
                <span>{new Intl.NumberFormat("fa-IR").format(complete.score)}٪</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg">
                <div className="h-full bg-accent" style={{ width: `${complete.score}%` }} />
              </div>
              {complete.missing.length ? (
                <p className="mt-2 text-xs text-muted">
                  {t("completeHint")}{" "}
                  {complete.missing.map((k) => t(completeLabel[k])).join("، ")}
                </p>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-muted">
              {b.approvalStatus === "pending"
                ? "منتظر تأیید مدیریت است. پس از تأیید، ۷ روز نمایش رایگان شروع می‌شود."
                : `آزمایشی تا ${b.trialEndsAt ? formatFaDate(b.trialEndsAt) : "—"}`}
              {b.subscriptionEndsAt ? ` · اشتراک تا ${formatFaDate(b.subscriptionEndsAt)}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/business/$id" params={{ id: b.id }}>
                  مشاهده صفحه
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(b)}>
                ویرایش
              </Button>
              {b.approvalStatus === "approved" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void saveAction("setActive", { id: b.id, isActive: !b.isActive })
                      .then(() => {
                        toast.success(b.isActive ? "از نقشه برداشته شد." : "دوباره روی نقشه آمد.");
                        onRefresh();
                      })
                      .catch((err) => toast.error(friendlyError(err)));
                  }}
                >
                  {b.isActive ? "توقف نمایش" : "نمایش دوباره"}
                </Button>
              ) : null}
              {b.approvalStatus === "approved" && b.visibility !== "subscribed" ? (
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => {
                    void saveAction("demoPlan", { id: b.id })
                      .then(() => {
                        toast.success("دوره نمایشی ۳۰ روزه فعال شد.");
                        onRefresh();
                      })
                      .catch((err) => toast.error(friendlyError(err)));
                  }}
                >
                  فعال‌سازی دوره نمایشی ۳۰ روزه
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ownerWaText(b: Booking) {
  const when = formatFaDateTime(b.slotStart);
  if (b.status === "requested") {
    return `سلام ${b.customerName ?? ""}، درخواست نوبت شما در «${b.businessName}» برای ${when} دریافت شد.`;
  }
  if (b.status === "confirmed") {
    return `سلام ${b.customerName ?? ""}، نوبت شما در «${b.businessName}» برای ${when} تأیید شد.`;
  }
  if (b.status === "cancelled") {
    return `سلام ${b.customerName ?? ""}، نوبت ${when} در «${b.businessName}» لغو شد.`;
  }
  return `سلام ${b.customerName ?? ""}، از حضور شما در «${b.businessName}» ممنونیم.`;
}

function TattooRequests({ items, businesses, onChange }: { items: TattooRequest[]; businesses: Business[]; onChange: () => void }) {
  const ordered = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  if (!ordered.length) return <p className="mt-6 text-sm text-muted">هنوز درخواست تاتویی ثبت نشده است.</p>;
  return <div className="mt-6 grid gap-4">{ordered.map((request) => <TattooRequestReview key={request.id} request={request} businesses={businesses} onChange={onChange} />)}</div>;
}

function TattooRequestReview({ request, businesses, onChange }: { request: TattooRequest; businesses: Business[]; onChange: () => void }) {
  const [businessId, setBusinessId] = useState(request.businessId ?? businesses[0]?.id ?? "");
  const [priceMin, setPriceMin] = useState(request.priceMinToman?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(request.priceMaxToman?.toString() ?? "");
  const [sessions, setSessions] = useState(request.sessionCount?.toString() ?? "");
  const [minutes, setMinutes] = useState(request.sessionMinutes?.toString() ?? "");
  const [deposit, setDeposit] = useState(request.depositToman?.toString() ?? "");
  const [message, setMessage] = useState(request.artistMessage ?? "");
  const [busy, setBusy] = useState(false);

  async function decideRequest(status: "approved" | "needs_info" | "rejected") {
    if (message.trim().length < 2) {
      toast.error("ابتدا پیام کوتاهی برای مشتری بنویسید.");
      return;
    }
    if (status === "approved" && (!businessId || !priceMin || !deposit)) {
      toast.error("برای تأیید، صفحه کسب‌وکار، حداقل قیمت و بیعانه را کامل کنید.");
      return;
    }
    setBusy(true);
    try {
      await saveAction("decideTattooRequest", {
        id: request.id,
        status,
        businessId: businessId || null,
        priceMinToman: priceMin ? Number(priceMin) : null,
        priceMaxToman: priceMax ? Number(priceMax) : null,
        sessionMinutes: minutes ? Number(minutes) : null,
        sessionCount: sessions ? Number(sessions) : null,
        depositToman: deposit ? Number(deposit) : null,
        artistMessage: message,
      });
      toast.success("نتیجه برای مشتری ثبت شد.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const type = request.requestType === "coverup" ? "کاور یا بازطراحی" : request.requestType === "consultation" ? "مشاوره" : "تاتوی جدید";
  return <article className="rounded-2xl border border-border bg-surface p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{request.customerName}</h3><p className="text-sm text-muted">{type} · {request.style} · {request.placement}</p></div><Badge>{request.status === "submitted" ? "در انتظار" : request.status === "needs_info" ? "اطلاعات بیشتر" : request.status === "approved" ? "تأییدشده" : request.status === "rejected" ? "ردشده" : "رزرو قطعی"}</Badge></div>
    <p className="mt-3 text-sm leading-7">{request.idea}</p>
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted"><span>اندازه: {request.sizeCm}</span><a className="text-accent" href={`tel:${request.customerPhone}`}>{request.customerPhone}</a>{request.preferredDates ? <span>زمان مناسب: {request.preferredDates}</span> : null}{request.budgetToman ? <span>بودجه: {formatToman(request.budgetToman)}</span> : null}</div>
    {[...request.referenceImages, ...request.bodyImages].length ? <div className="mt-4 flex gap-2 overflow-x-auto">{[...request.referenceImages, ...request.bodyImages].map((src, i) => <a key={`${request.id}-${i}`} href={src} target="_blank" rel="noreferrer"><img src={src} alt="عکس درخواست" className="size-24 rounded-xl border border-border object-cover" /></a>)}</div> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1.5 text-sm"><span className="font-medium">صفحه کسب‌وکار</span><NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)} aria-label="صفحه کسب‌وکار"><option value="">انتخاب صفحه کسب‌وکار</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</NativeSelect></label>
      <ReviewNumberField label="حداقل قیمت" hint="تومان" value={priceMin} onChange={setPriceMin} />
      <ReviewNumberField label="حداکثر قیمت" hint="تومان؛ اختیاری" value={priceMax} onChange={setPriceMax} />
      <ReviewNumberField label="تعداد جلسات" hint="مثلاً ۱ یا ۲ جلسه" value={sessions} onChange={setSessions} />
      <ReviewNumberField label="مدت هر جلسه" hint="به دقیقه؛ مثلاً ۱۸۰" value={minutes} onChange={setMinutes} />
      <ReviewNumberField label="مبلغ بیعانه" hint="تومان" value={deposit} onChange={setDeposit} />
    </div>
    <label className="mt-3 grid gap-1.5 text-sm"><span className="font-medium">پیام برای مشتری</span><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="نتیجه بررسی، شرایط اجرا یا توضیح بیعانه را بنویسید" /></label>
    {request.paymentStatus === "receipt_submitted" ? <ReceiptReview request={request} onChange={onChange} /> : null}
    <div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void decideRequest("approved")}>تأیید و بازکردن انتخاب زمان</Button><Button disabled={busy} variant="outline" onClick={() => void decideRequest("needs_info")}>درخواست اطلاعات بیشتر</Button><Button disabled={busy} variant="outline" onClick={() => void decideRequest("rejected")}>عدم پذیرش</Button></div>
  </article>;
}

function ReceiptReview({ request, onChange }: { request: TattooRequest; onChange: () => void }) {
  const [message, setMessage] = useState("رسید بررسی و تأیید شد.");
  const [busy, setBusy] = useState(false);
  async function decide(approved: boolean) {
    setBusy(true);
    try { await saveAction("decideTattooReceipt", { requestId: request.id, approved, message }); toast.success(approved ? "رزرو قطعی شد." : "رسید رد شد."); onChange(); }
    catch (err) { toast.error(friendlyError(err)); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-3"><p className="font-semibold">رسید پرداخت برای بررسی</p>{request.paymentReviewDeadline ? <p className="mt-1 text-xs text-muted">مهلت بررسی: {formatFaDateTime(request.paymentReviewDeadline)}</p> : null}{request.receiptImage ? <a href={request.receiptImage} target="_blank" rel="noreferrer"><img src={request.receiptImage} alt="رسید پرداخت مشتری" className="mt-3 max-h-64 rounded-xl object-contain" /></a> : null}<Textarea className="mt-3" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="پیام نتیجه بررسی" /><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => void decide(true)}>تأیید رسید و قطعی‌کردن</Button><Button disabled={busy} variant="outline" onClick={() => void decide(false)}>رد رسید</Button></div></div>;
}

function ReviewNumberField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><Input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} placeholder={hint} inputMode="numeric" /></label>;
}

function OwnerBookings({
  items,
  businesses,
  onChange,
}: {
  items: Booking[];
  businesses: Business[];
  onChange: () => void;
}) {
  const ordered = [...items].sort((a, b) => {
    const rank: Record<Booking["status"], number> = { requested: 0, confirmed: 1, done: 2, no_show: 3, cancelled: 4 };
    return rank[a.status] - rank[b.status] || +new Date(a.slotStart) - +new Date(b.slotStart);
  });
  return (
    <div className="mt-6 grid gap-3">
      {businesses.length ? <BlockForm businesses={businesses} onChange={onChange} /> : null}
      {!items.length ? <p className="text-sm text-muted">هنوز رزروی برای کسب‌وکارهای شما نیامده است.</p> : null}
      {ordered.map((b) => {
        const isBlock = b.kind === "block";
        const wa = isBlock ? null : toWhatsAppLink(b.customerPhone, ownerWaText(b));
        return (
          <article key={b.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex justify-between gap-3">
              <div>
                {isBlock ? (
                  <strong>{t("blockLabel")}</strong>
                ) : (
                  <strong>{b.customerName}</strong>
                )}
                <p className="text-sm text-muted">{b.businessName}</p>
                {b.serviceTitle ? <p className="text-sm">{b.serviceTitle}</p> : null}
                {!isBlock && b.partySize > 1 ? (
                  <p className="text-sm text-muted">{new Intl.NumberFormat("fa-IR").format(b.partySize)} نفر</p>
                ) : null}
              </div>
              <Badge>{isBlock ? t("blockLabel") : statusFa(b.status)}</Badge>
            </div>
            <p className="mt-2 text-sm">
              {formatFaDateTime(b.slotStart)}
              {b.slotEnd ? ` – ${formatFaDateTime(b.slotEnd)}` : ""}
            </p>
            {!isBlock && b.customerPhone ? (
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                <a href={`tel:${b.customerPhone}`} className="text-accent">
                  {b.customerPhone}
                </a>
                {wa ? (
                  <a href={wa} className="text-accent">
                    واتساپ
                  </a>
                ) : null}
              </div>
            ) : null}
            {b.note ? <p className="mt-2 text-sm text-muted">{b.note}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {!isBlock && b.status === "requested" ? (
                <Button size="sm" onClick={() => void decide(b.id, "confirmed", onChange)}>
                  تأیید
                </Button>
              ) : null}
              {b.status !== "cancelled" && b.status !== "done" ? (
                <Button size="sm" variant="outline" onClick={() => void decide(b.id, "cancelled", onChange)}>
                  {isBlock ? "برداشتن بستن" : "لغو"}
                </Button>
              ) : null}
              {!isBlock && b.status === "confirmed" ? (
                <Button size="sm" variant="accent" onClick={() => void decide(b.id, "done", onChange)}>
                  انجام شد
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function BlockForm({ businesses, onChange }: { businesses: Business[]; onChange: () => void }) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!businessId && businesses[0]) setBusinessId(businesses[0].id);
  }, [businesses, businessId]);

  return (
    <article className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <h3 className="font-semibold">{t("blockInterval")}</h3>
      <p className="mt-1 text-sm text-muted">{t("blockHint")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)} aria-label="کسب‌وکار">
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} dir="ltr" />
        <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} dir="ltr" />
      </div>
      <Input className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح اختیاری" />
      <Button
        className="mt-3"
        disabled={busy}
        onClick={() => {
          if (!businessId || !day || !start || !end) {
            toast.error("تاریخ و ساعت شروع و پایان را بنویسید.");
            return;
          }
          const [ys, ms, ds] = day.split("-").map(Number);
          const [sh, sm] = start.split(":").map(Number);
          const [eh, em] = end.split(":").map(Number);
          if (![ys, ms, ds, sh, sm, eh, em].every((n) => Number.isFinite(n))) {
            toast.error("تاریخ یا ساعت نامعتبر است.");
            return;
          }
          setBusy(true);
          void saveAction("blockInterval", {
            businessId,
            slotStart: tehranLocalToIso(ys, ms, ds, sh, sm),
            slotEnd: tehranLocalToIso(ys, ms, ds, eh, em),
            note: note.trim() || undefined,
          })
            .then(() => {
              toast.success("بازه بسته شد.");
              setNote("");
              onChange();
            })
            .catch((err) => toast.error(friendlyError(err)))
            .finally(() => setBusy(false));
        }}
      >
        {t("blockSubmit")}
      </Button>
    </article>
  );
}

async function decide(id: string, status: "confirmed" | "cancelled" | "done", onChange: () => void) {
  try {
    await saveAction("bookingStatus", { id, status });
    toast.success("وضعیت رزرو به‌روز شد.");
    onChange();
  } catch (err) {
    toast.error(friendlyError(err));
  }
}

function statusFa(s: Booking["status"]) {
  if (s === "requested") return "در انتظار";
  if (s === "confirmed") return "تأییدشده";
  if (s === "cancelled") return "لغو";
  if (s === "no_show") return t("noShow");
  return "انجام‌شده";
}

function ProfileForm({
  profile,
  email,
  onSaved,
}: {
  profile: Profile;
  email?: string | null;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  return (
    <div className="mt-6 max-w-md space-y-3 rounded-2xl border border-border bg-surface p-5">
      {email ? <p className="text-sm text-muted">{email}</p> : null}
      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="نام نمایشی" />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="موبایل" />
      <Button
        onClick={() => {
          void saveAction("updateProfile", {
            displayName: displayName.trim(),
            phone: phone.trim(),
          })
            .then(() => {
              toast.success("ذخیره شد.");
              onSaved();
            })
            .catch((err) => toast.error(friendlyError(err)));
        }}
      >
        ذخیره مشخصات
      </Button>
    </div>
  );
}
