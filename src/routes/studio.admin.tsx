import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, CreditCard, FileDown, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { OwnerCalendar } from "@/components/calendar/owner-calendar";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { InstagramChip } from "@/components/studio/instagram-chip";
import { DesignThumbs } from "@/components/studio/design-thumbs";
import { StudioApprenticeBoard } from "@/components/studio/apprentice-board";
import { StudioArtistBoard, StudioChairShare } from "@/components/studio/artist-board";
import { StudioFillInBoard } from "@/components/studio/fill-in-board";
import { StudioTomorrowDesk } from "@/components/studio/tomorrow-desk";
import { CustomerFileDetails, isUnreliableCustomer, UnreliableBadge, type CustomerFileBrief } from "@/components/studio/customer-file-brief";
import { ConsentSignature } from "@/components/studio/consent-signature";
import { DurationFields, formatSitting } from "@/components/studio/duration-fields";
import { ConsentBoard } from "@/components/studio/consent-board";
import { ReferralAdmin } from "@/components/studio/referral-admin";
import { StudioJobForm } from "@/components/studio/job-form";
import { StudioMonthFinance } from "@/components/studio/month-finance";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { JALALI_MONTHS, gregorianToJalali, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { formatFaDateTime, toSmsLink, toTelLink } from "@/lib/format";
import { firstOpenCustomerDay, jalaliDayLabel, shiftTehranDayKey, tehranClock, tehranDayKey, tehranLocalToIso, tehranWeekBounds } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { phoneTail, pieceMinutes, suggestWaitlist } from "@/lib/fill-gap";
import { isTehranThursday, thursdayBusyKeys } from "@/lib/studio-apprentices";
import type { StudioFillIn } from "@/lib/server/studio-fill-ins";
import { compressImage } from "@/lib/design-images";
import type { CustomerFileSummary } from "@/lib/customer-file-summary";
import { downloadStudioJobsPdf } from "@/lib/studio-list-pdf";
import { TATTOO_REQUEST_LABEL } from "@/lib/tattoo-estimate";
import { isStudioOwnerEmail } from "@/lib/studio-owner";
import type { StudioArtistCard } from "@/lib/studio-artists";
import {
  TATTOO_ADMIN_STAGE_LABEL,
  TATTOO_SETTLEMENT_PRESETS,
  bookingConfirmSms,
  sessionFoodSms,
  honorificForName,
  digitsOnly,
  fillInMissedCallSms,
  formatCardNumber,
  formatGroupedDigits,
  formatTattooToman,
  isTattooReviewOverdue,
  aftercareSms,
  aftercareGuideSms,
  balanceSms,
  depositCardSms,
  bookingReminderSms,
  proposalSeenSms,
  paymentDetailsText,
  studioVisitText,
  STUDIO_ADDRESS,
  STUDIO_CONTACT_PHONE,
  tattooBalance,
  tattooStage,
} from "@/lib/tattoo-flow";
import type { Booking, Business, Profile, TattooRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

type PanelTab = "requests" | "messages" | "jobs" | "contacts" | "calendar" | "money" | "apprentices" | "fill" | "artists" | "consent" | "club";

const panelTabs: PanelTab[] = ["requests", "messages", "jobs", "contacts", "calendar", "money", "apprentices", "fill", "artists", "consent", "club"];

export const Route = createFileRoute("/studio/admin")({
  validateSearch: (search: Record<string, unknown>): { tab?: PanelTab } => {
    if (typeof search.tab === "string" && panelTabs.includes(search.tab as PanelTab)) return { tab: search.tab as PanelTab };
    return {};
  },
  component: StudioAdminPage,
});
type RequestFilter = "active" | "receipt" | "booked" | "consultation" | "all";

function ReadyMessages() {
  const boxes = [
    {
      title: "۱. مشخصات واریز",
      text: paymentDetailsText(),
    },
    {
      title: "۲. آدرس",
      text: ["آدرس استودیو", STUDIO_ADDRESS, `تلفن: ${STUDIO_CONTACT_PHONE}`].join("\n"),
    },
    {
      title: "۳. لینک درخواست مشتری",
      text: "https://kasbokarapp.com/studio/request",
      ltr: true,
    },
    {
      title: "روزهای خالی برای استوری",
      text: "https://kasbokarapp.com/studio/open",
      ltr: true,
    },
    {
      title: "۴. لینک پنل ادمین",
      text: "https://kasbokarapp.com/studio/admin",
      ltr: true,
    },
    {
      title: "۵. آماده‌سازی شب قبل از اجرا",
      text: [
        "آماده‌سازی برای روز تاتو",
        "",
        "از حالا تا روز اجرا این‌ها را نخورید: قهوه، قرص آسپرین، نوشابه گازدار و مشروب. مشروب پوست را کم‌آب می‌کند و رنگ را بد می‌گیرد.",
        "",
        "اگر می‌توانید یک کرم آبرسان بگیرید و پوست محل تاتو را با آن نرم نگه دارید.",
        "",
        "شب قبل از تاتو، از ساعت ۱۰ شب بخوابید و ۸ ساعت خواب کامل داشته باشید تا خواب عمیق باشد.",
        "",
        "شب قبل، سرم قندی‌نمکی به همراه آمپول دگزامتازون بزنید تا التهاب کمتر شود.",
        "",
        "صبح روز اجرا غذای کافی همراه بیاورید تا وسط کار ضعف نکنید.",
      ].join("\n"),
    },
    {
      title: "۶. لوکیشن سالن",
      text: "https://maps.google.com/maps?q=83HH%2BRW2%D8%8C%2B%DA%A9%D8%B1%D9%85%D8%A7%D9%86%D8%B4%D8%A7%D9%87%D8%8C%2B%D8%A7%D8%B3%D8%AA%D8%A7%D9%86%2B%DA%A9%D8%B1%D9%85%D8%A7%D9%86%D8%B4%D8%A7%D9%87%D8%8C%2B%D8%A7%DB%8C%D8%B1%D8%A7%D9%86&sll=34.32978347498267,47.07965947687626",
      ltr: true,
    },
    {
      title: "۷. آدرس بسته‌های پستی",
      text: [
        "پیمان زیبائی‌فر",
        STUDIO_CONTACT_PHONE,
        "کرمانشاه، گلایول، بلوار ۱۷ شهریور، بلوار ارشاد (چهارراه ارشاد)، چهارراه بسیج، بغل موتورسیکلت‌فروشی فقیرزاده، مجتمع ارشاد، طبقه ۴، واحد ۱۶",
        "کد پستی: 6714619524",
      ].join("\n"),
    },
  ];
  return (
    <div className="mt-5 grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      <p className="text-sm leading-7 text-muted">هر متن را با دکمهٔ کپی بردار و در پیام مشتری بفرست.</p>
      {boxes.map((box) => (
        <CopyBox key={box.title} title={box.title} text={box.text} ltr={box.ltr} />
      ))}
    </div>
  );
}

function CopyBox({ title, text, ltr }: { title: string; text: string; ltr?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success("متن کپی شد.");
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("کپی نشد. متن را دستی انتخاب کنید.");
    }
  }
  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 text-sm font-bold">{title}</h3>
        <button type="button" onClick={() => void copy()} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-primary/30 px-3 text-xs font-bold">
          <Copy className="size-3.5" />
          {done ? "کپی شد" : "کپی"}
        </button>
      </div>
      <div className="mt-3 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-bg p-3 text-sm leading-7">
        {text.split("\n").map((line, index) => (
          <CopyLine key={`${index}-${line}`} line={line} ltr={ltr} />
        ))}
      </div>
    </section>
  );
}

function CopyLine({ line, ltr }: { line: string; ltr?: boolean }) {
  if (!line) return <p className="h-3" />;
  if (ltr || line.startsWith("http")) {
    return <p dir="ltr" className="break-all text-left">{line}</p>;
  }
  const split = line.match(/^(.*?\S)\s+((?:IR)?[0-9][0-9\s-]{5,})$/);
  if (split) {
    return (
      <p className="break-words">
        {split[1]} <span dir="ltr" className="inline-block break-all">{split[2]}</span>
      </p>
    );
  }
  return <p className="break-words">{line}</p>;
}

function StudioAdminPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const userId = user?.id;
  const owner = isStudioOwnerEmail(user?.primaryEmail);
  const [chairArtist, setChairArtist] = useState<StudioArtistCard | null>(null);
  const [accessReady, setAccessReady] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [tab, setTabState] = useState<PanelTab>(search.tab ?? "calendar");
  const [filter, setFilter] = useState<RequestFilter>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function setTab(next: PanelTab) {
    setTabState(next);
    void navigate({ search: { tab: next }, replace: true });
  }

  useEffect(() => {
    if (search.tab && search.tab !== tab) setTabState(search.tab);
  }, [search.tab, tab]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [nextBusinesses, nextBookings] = await Promise.all([
        saveAction<Business[]>("mine"),
        saveAction<Booking[]>("ownerBookings"),
      ]);
      setBusinesses(nextBusinesses);
      setBookings(nextBookings);
      setLoading(false);
      try {
        const nextRequests = await saveAction<TattooRequest[]>("studioTattooRequests");
        setRequests(nextRequests);
      } catch (err) {
        setError(friendlyError(err));
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    if (owner) {
      setChairArtist(null);
      setAccessReady(true);
      return;
    }
    let cancelled = false;
    void saveAction<StudioArtistCard | null>("studioWhoami")
      .then((row) => {
        if (!cancelled) setChairArtist(row);
      })
      .catch(() => {
        if (!cancelled) setChairArtist(null);
      })
      .finally(() => {
        if (!cancelled) setAccessReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, owner]);

  const staff = owner || Boolean(chairArtist);
  const ownPanel = !owner && Boolean(chairArtist);
  const panelName = chairArtist?.email?.toLowerCase() === "hanazibaeifar88h@gmail.com" ? "هانا زیبائی‌فر" : chairArtist?.name;

  useEffect(() => {
    if (!userId || !staff) return;
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
  }, [userId, staff]);

  const filtered = useMemo(() => {
    const rows = requests.filter((request) => {
      if (!customerQueryMatch(query, request)) return false;
      if (filter === "consultation") return request.requestType === "consultation";
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
  }, [filter, query, requests]);

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

  if (!owner && !accessReady)
    return (
      <Shell>
        <p className="text-sm text-muted">در حال بررسی دسترسی…</p>
      </Shell>
    );

  if (!staff)
    return (
      <Shell>
        <h1 className="text-2xl font-bold">مدیریت تاتو</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
          این صفحه فقط با ایمیل مدیر استودیو، یا ایمیلی که به‌عنوان همکار صندلی ثبت شده، باز می‌شود.
        </p>
        <Button asChild className="mt-6">
          <Link to="/studio/request">رفتن به فرم درخواست</Link>
        </Button>
      </Shell>
    );

  return (
    <Shell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">{ownPanel ? "پنل شخصی" : "استودیو"}</p>
          <h1 className="text-2xl font-bold">{owner ? "میز کار" : panelName || "همکار"}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="size-4" /> تازه‌سازی
        </Button>
      </div>

      <div className="mt-4 grid gap-2">
        {(
          [
            [
              ["calendar", "امروز"],
              ["jobs", "نوبت‌ها"],
              ["requests", `ورودی ${new Intl.NumberFormat("fa-IR").format(requests.length)}`],
              ["contacts", "مشتریان"],
            ],
            [
              ["money", owner || ownPanel ? "صندوق" : "سهم من"],
              ["fill", "انتظار"],
              ["consent", "رضایت‌نامه"],
              ["club", "باشگاه"],
              ["apprentices", "هنرجوها"],
              ["messages", "پیام‌ها"],
              ["artists", "همکاران"],
            ],
          ] as const
        ).map((row, rowIndex) => (
          <div key={rowIndex} className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
            {row
              .filter(([id]) => owner || (id !== "artists" && id !== "club" && (ownPanel || id !== "apprentices")))
              .map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "h-11 shrink-0 rounded-xl px-4 text-sm font-bold",
                    tab === id ? "bg-white text-black shadow-sm" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
          </div>
        ))}
      </div>

      {tab === "messages" ? <ReadyMessages /> : null}
      {tab === "consent" ? <ConsentBoard /> : null}
      {tab === "club" && owner ? <ReferralAdmin /> : null}

      {!loading && !error && (tab === "calendar" || tab === "jobs" || tab === "requests") ? (
        <StudioTomorrowDesk
          requests={requests}
          showToday={tab === "calendar" || tab === "jobs"}
          onOpenReceipts={() => {
            setTab("requests");
            setFilter("receipt");
          }}
        />
      ) : null}

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
        <OwnerCalendar items={bookings} businesses={businesses} onChange={() => void refresh()} personal={ownPanel} />
      ) : null}

      {!loading && !error && tab === "jobs" ? (
        <MonthJobsPanel businesses={businesses} bookings={bookings} onChange={() => void refresh()} personal={ownPanel} canEnroll={owner} />
      ) : null}

      {!loading && !error && tab === "contacts" ? <YearContactsPanel /> : null}

      {!loading && !error && tab === "fill" ? <StudioFillInBoard bookings={bookings} onPlaced={() => void refresh()} /> : null}

      {!loading && !error && tab === "apprentices" && (owner || ownPanel) ? <StudioApprenticeBoard /> : null}

      {!loading && !error && tab === "artists" && owner ? <StudioArtistBoard /> : null}

      {!loading && !error && tab === "money" ? (owner || ownPanel ? <StudioMonthFinance /> : <StudioChairShare />) : null}

      {!loading && !error && tab === "requests" ? (
        <div className="mt-5">
          <CustomerTempPassword />
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
            {(
              [
                ["active", "در جریان"],
                ["consultation", "مشاوره"],
                ["receipt", "رسیدها"],
                ["booked", "قطعی"],
                ["all", "همه"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "h-10 shrink-0 rounded-xl px-4 text-sm font-bold",
                  filter === value ? "bg-white text-black shadow-sm" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی اسم یا شماره"
            className="mt-3"
          />
          <p className="mt-2 text-xs leading-6 text-muted">
            چند نوبت برای یک نفر پاک نمی‌شود. فول‌هند و فول‌بک چند جلسهٔ واقعی است، نه تکرار اشتباه.
            {filter === "consultation" ? " مشاوره تخصصی همین‌جا جدا آمده تا با نوبت اجرا قاطی نشود." : ""}
          </p>
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
                canEnroll={owner}
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

function oneMonthLaterKey(iso: string | null) {
  const clock = tehranClock(iso ? new Date(iso) : new Date());
  const next = new Date(Date.UTC(clock.y, clock.m, clock.day));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function StoredConsent({ request }: { request: TattooRequest }) {
  const [image, setImage] = useState(request.consentImage || "");
  const [busy, setBusy] = useState(false);
  if (!request.hasConsentImage && !image) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">رضایت‌نامه</p>
      {image ? (
        <DesignThumbs images={[image]} filePrefix={`${request.customerName}-rezayat`} kindLabel="رضایت‌نامه" />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-11"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void saveAction<{ consentImage?: string }>("studioRequestImages", { id: request.id })
              .then((row) => setImage(row.consentImage || ""))
              .catch((err) => toast.error(friendlyError(err)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "در حال باز کردن رضایت‌نامه…" : "نمایش رضایت‌نامه"}
        </Button>
      )}
    </div>
  );
}

function StoredDesigns({ request }: { request: TattooRequest }) {
  const ready = [...request.referenceImages, ...request.bodyImages];
  const [loaded, setLoaded] = useState<string[] | null>(ready.length ? ready : null);
  const [busy, setBusy] = useState(false);
  const count = request.imageCount ?? ready.length;
  if (!count && !loaded?.length) return null;
  return (
    <div className="mt-3">
      {loaded?.length ? (
        <DesignThumbs images={loaded} filePrefix={`${request.customerName}-${request.style}`} />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void saveAction<{ referenceImages: string[]; bodyImages: string[] }>("studioRequestImages", { id: request.id })
              .then((row) => setLoaded([...(row.referenceImages ?? []), ...(row.bodyImages ?? [])]))
              .catch((err) => toast.error(friendlyError(err)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "در حال باز کردن طرح…" : "نمایش طرح ذخیره‌شده"}
        </Button>
      )}
    </div>
  );
}

function ReplySeen({ request }: { request: TattooRequest }) {
  const text = (request.artistMessage || "").trim();
  if (!text || text === "ثبت دستی از تقویم کاری" || text === "جلسه دوم") return null;
  if (request.messageSeenAt) {
    return (
      <p className="mt-2 text-sm font-semibold text-emerald-700">
        مشاهده شد · {formatFaDateTime(request.messageSeenAt)}
      </p>
    );
  }
  return <p className="mt-2 text-sm font-semibold text-amber-700">هنوز مشاهده نشده</p>;
}

function requestBadge(request: TattooRequest) {
  return TATTOO_ADMIN_STAGE_LABEL[tattooStage(request)];
}

function TattooAdminCard({
  request,
  requests,
  businesses,
  bookings,
  canEnroll,
  onChange,
}: {
  request: TattooRequest;
  requests: TattooRequest[];
  businesses: Business[];
  bookings: Booking[];
  canEnroll?: boolean;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const slotLocked =
    request.paymentStatus === "awaiting_payment" ||
    request.paymentStatus === "receipt_submitted" ||
    request.paymentStatus === "rejected";
  const showProposalForm =
    request.status !== "booked" && request.status !== "rejected" && !slotLocked;
  const busyKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const booking of bookings) {
      if (booking.businessId !== businessId || booking.status === "cancelled" || booking.kind !== "booking") continue;
      keys.add(tehranDayKey(new Date(booking.slotStart)));
    }
    for (const other of requests) {
      if (other.id === request.id || other.businessId !== businessId || !other.proposedSlotStart) continue;
      if (!["proposal_pending", "awaiting_payment", "receipt_submitted", "rejected"].includes(other.paymentStatus)) continue;
      keys.add(tehranDayKey(new Date(other.proposedSlotStart)));
    }
    return [...keys];
  }, [bookings, businessId, request.id, requests]);
  useEffect(() => {
    if (day) return;
    setDay(firstOpenCustomerDay(busyKeys, thursdayBusyKeys()));
  }, [busyKeys, day]);
  const sameDayBookings = useMemo(
    () =>
      !day
        ? []
        : bookings.filter(
            (booking) =>
              booking.businessId === businessId &&
              booking.status !== "cancelled" &&
              booking.kind === "booking" &&
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

  async function removeRequest() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await saveAction("deleteTattooRequest", { id: request.id });
      toast.success("درخواست از لیست حذف شد.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  const type = TATTOO_REQUEST_LABEL[request.requestType] || "تاتوی جدید";
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
      <ReplySeen request={request} />
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
        {request.customerInstagram ? <InstagramChip handle={request.customerInstagram} /> : null}
        {request.preferredDates ? <span>زمان مناسب مشتری: {request.preferredDates}</span> : null}
        {canEnroll ? (
          <button
            type="button"
            className="text-sm font-semibold text-accent"
            onClick={() => enrollReferrer(request.customerName, request.customerPhone)}
          >
            عضو باشگاه معرفین
          </button>
        ) : null}
      </div>
      <StoredDesigns request={request} />

      {request.paymentStatus === "expired" ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          مهلت واریز تمام شد و این زمان آزاد شد. زمان تازه‌ای از روزهای آزاد بفرستید.
        </div>
      ) : null}
      {request.paymentStatus === "proposal_pending" && request.proposedSlotStart ? (
        <div className="mt-4 rounded-2xl border border-border bg-bg p-3 text-sm">
          <p className="font-semibold">پیشنهاد ارسال شده؛ هنوز روی تقویم قفل نشده است.</p>
          <p className="mt-1 text-muted">{formatFaDateTime(request.proposedSlotStart)}</p>
          {toSmsLink(request.customerPhone, " ") ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-bold text-primary-fg"
                href={toSmsLink(request.customerPhone, proposalSeenSms(request.customerName, request.customerPhone, "آقا")) ?? undefined}
              >
                پیامک برای آقا
              </a>
              <a
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-3 text-sm font-bold"
                href={toSmsLink(request.customerPhone, proposalSeenSms(request.customerName, request.customerPhone, "خانم")) ?? undefined}
              >
                پیامک برای خانم
              </a>
            </div>
          ) : null}
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
            <NumberField label="قیمت نهایی" hint="تومان" value={price} onChange={setPrice} money />
            <NumberField label="مبلغ بیعانه" hint="تومان" value={deposit} onChange={setDeposit} money />
            <NumberField
              label="تعداد جلسات"
              hint="مثلاً ۱"
              value={sessions}
              onChange={setSessions}
            />
            <div className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">مدت هر جلسه</span>
              <DurationFields minutes={Number(minutes) || 0} onChange={(value) => setMinutes(String(value))} />
              <p className="text-xs text-muted">{formatSitting(Number(minutes))}</p>
            </div>
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
      {request.status !== "booked" ? (
        <div className="mt-4">
          <Button
            disabled={busy}
            variant="outline"
            className={confirmDelete ? "border-destructive text-destructive" : ""}
            onClick={() => void removeRequest()}
          >
            {confirmDelete ? "مطمئنی؟ این درخواست پاک شود" : "حذف درخواست"}
          </Button>
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
  money = false,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  money?: boolean;
}) {
  return (
    <Field label={label}>
      <Input
        value={money ? formatGroupedDigits(value) : value}
        onChange={(e) => onChange(money ? digitsOnly(e.target.value) : e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        dir={money ? "ltr" : undefined}
        className={money ? "text-left tracking-wide" : undefined}
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

function customerQueryMatch(query: string, request: Pick<TattooRequest, "customerName" | "customerPhone" | "customerPhone2" | "customerInstagram">) {
  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!needle) return true;
  const hay = [request.customerName, request.customerPhone, request.customerPhone2, request.customerInstagram]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
  const fold = (value: string) =>
    value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  return fold(hay).includes(fold(needle));
}

function CustomerTempPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/customer-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) throw new Error(data?.error || "ذخیره نشد.");
      toast.success(data?.message || "رمز موقت ذخیره شد.");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ذخیره نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mb-4 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="text-sm font-semibold">رمز موقت مشتری</h2>
      <p className="mt-1 text-xs leading-6 text-muted">
        اگر مشتری گفت ایمیل ثبت است ولی رمز را ندارد و نامهٔ بازیابی هم نرسیده، همین‌جا رمز جدید بگذار و به خودش بگو. نوبت‌ها و لیست پاک نمی‌شود.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل مشتری" dir="ltr" />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز موقت، حداقل ۸ حرف" dir="ltr" />
        <Button type="submit" disabled={busy}>
          {busy ? "..." : "ذخیره"}
        </Button>
      </div>
    </form>
  );
}

function CustomerFileSummaryPanel() {
  const [data, setData] = useState<CustomerFileSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void saveAction<CustomerFileSummary>("studioCustomerFileSummary")
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-bold">جمع‌بندی پرونده‌ها</h2>
      <p className="mt-1 text-sm leading-7 text-muted">
        ارتباط بین پوست، درد، رنگ و گروه خونی. اسم کسی اینجا نیست. این تجربهٔ پرونده‌های خودت است، نه قانون پزشکی.
      </p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {!data ? <p className="mt-3 text-sm text-muted">در حال سنجیدن ارتباط‌ها…</p> : null}
      {data && !data.relations.length ? (
        <p className="mt-3 text-sm leading-7 text-muted">برای مقایسه هنوز حداقل دو گروه، مثلاً پوست روشن و سبزه، با هم پر نشده.</p>
      ) : null}
      {data?.relations.map((item) => (
        <article key={item.title} className="mt-4 rounded-2xl border border-border bg-bg p-3">
          <h3 className="text-sm font-bold">{item.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-7">{item.finding}</p>
          <div className="mt-2 grid gap-1">
            {item.rows.map((row) => (
              <p key={row} className="text-sm leading-7 text-muted">{row}</p>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function YearContactsPanel() {
  const clock = tehranClock();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.day);
  const [span, setSpan] = useState<"year" | "month" | "week">("year");
  const [year, setYear] = useState(todayJ.jy);
  const [month, setMonth] = useState(todayJ.jm);
  const [weekOffset, setWeekOffset] = useState(0);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [rows, setRows] = useState<YearContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const week = tehranWeekBounds(weekOffset);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const payload =
      span === "week"
        ? { jy: year, start: week.start, end: week.end, mine: true }
        : span === "month"
          ? { jy: year, jm: month, mine: true }
          : { jy: year, mine: true };
    void saveAction<YearContact[]>("studioYearContacts", payload)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [span, year, month, weekOffset, week.start, week.end]);

  const nameNeedle = nameQuery.trim();
  const phoneDigits = digitsOnly(phoneQuery);
  const visible = rows.filter((row) => {
    if (phoneDigits.length >= 3 && !`${row.phone}${row.phone2}`.includes(phoneDigits)) return false;
    if (!nameNeedle) return true;
    const hay = [row.name, row.instagram, row.placements.join(" "), fileSummary(row.file).join(" "), row.file.notes].join(" ");
    return hay.includes(nameNeedle);
  });
  const paid = visible.reduce((sum, row) => sum + row.paidToman, 0);
  const period =
    span === "week" ? `هفته ${weekRangeLabel(week.startKey)}` : span === "month" ? `${JALALI_MONTHS[month - 1]} ${toFaDigits(year)}` : `سال ${toFaDigits(year)}`;

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">مشتریان</h2>
        <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-bold">
          {(
            [
              ["year", "سال"],
              ["month", "ماه"],
              ["week", "هفته"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`rounded-xl px-3 py-2 ${span === id ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setSpan(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-sm font-semibold text-muted">{period}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[#2f80ed] p-4 text-white">
          <p className="text-sm text-white/80">مشتری</p>
          <p className="mt-2 text-2xl font-bold">{toFaDigits(visible.length)}</p>
        </div>
        <div className="rounded-3xl bg-[#1f8a4c] p-4 text-white">
          <p className="text-sm text-white/80">دریافتی</p>
          <p className="mt-2 text-xl font-bold">{formatTattooToman(paid)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
          {span === "week" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset((value) => value - 1)}>
                هفته قبل
              </Button>
              <p className="min-w-28 text-center text-sm font-semibold">{weekRangeLabel(week.startKey)}</p>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset((value) => value + 1)}>
                هفته بعد
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setYear((value) => value - 1)}>
                سال قبل
              </Button>
              <p className="min-w-16 text-center text-sm font-semibold">{toFaDigits(year)}</p>
              <Button variant="outline" size="sm" onClick={() => setYear((value) => value + 1)}>
                سال بعد
              </Button>
              {span === "month" ? (
                <label className="text-sm">
                  <span className="sr-only">ماه</span>
                  <select
                    className="h-9 rounded-xl border border-border bg-bg px-3"
                    value={month}
                    onChange={(event) => setMonth(Number(event.target.value))}
                  >
                    {JALALI_MONTHS.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          )}
      </div>
      <CustomerFileSummaryPanel />
      <Input value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="جستجو با اسم، اینستاگرام یا محل تاتو" />
      <Input
        value={phoneQuery}
        onChange={(event) => setPhoneQuery(event.target.value)}
        placeholder="جستجو با شماره تماس یا موبایل"
        inputMode="tel"
        dir="ltr"
      />
      {error ? <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">در حال جمع کردن مخاطبین…</p> : null}
      {!loading && !rows.length ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm leading-7 text-muted">در این بازه مشتری ثبت‌شده‌ای نیست.</p>
      ) : null}
      {!loading && rows.length > 0 && !visible.length ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">با این اسم یا شماره کسی پیدا نشد.</p>
      ) : null}
      {visible.map((row) => (
        <ContactCard
          key={row.key}
          row={row}
          onSaved={(file) => setRows((list) => list.map((item) => (item.key === row.key ? { ...item, file } : item)))}
        />
      ))}
    </div>
  );
}

type CustomerFile = {
  skinTone: string;
  inkHold: string;
  fade: string;
  alcohol: string;
  sleepNote: string;
  arrival: string;
  pain: string;
  healing: string;
  inflammation: string;
  notes: string;
  numbing: string;
  bleeding: string;
  sensitivity: string;
  bloodType: string;
  toleranceHours: string;
  hydration: string;
  healedImage: string;
  hasHealedImage: boolean;
};

type YearContact = {
  key: string;
  name: string;
  phone: string;
  phone2: string;
  instagram: string;
  sessions: number;
  paidToman: number;
  placements: string[];
  lastSlot: string;
  file: CustomerFile;
};

function fileSummary(file: CustomerFile) {
  return [
    file.skinTone ? `پوست ${file.skinTone}` : "",
    file.inkHold,
    file.fade,
    file.alcohol,
    file.sleepNote ? `خواب: ${file.sleepNote}` : "",
    file.arrival,
    file.pain,
    file.healing,
    file.inflammation,
    file.numbing,
    file.bleeding ? `خونریزی ${file.bleeding}` : "",
    file.bloodType ? `گروه ${file.bloodType}` : "",
    file.toleranceHours ? `تحمل ${file.toleranceHours}` : "",
    file.hydration,
    file.sensitivity,
  ].filter(Boolean);
}

function ContactCard({ row, onSaved }: { row: YearContact; onSaved: (file: CustomerFile) => void }) {
  const [open, setOpen] = useState(false);
  const summary = fileSummary(row.file);
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-base font-bold">
          {isUnreliableCustomer(row.file.arrival) ? <UnreliableBadge /> : null}
          <span>{row.name}</span>
        </h3>
        <p className="text-sm font-semibold">{toFaDigits(row.sessions)} جلسه</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        {row.phone ? (
          <a className="font-semibold text-accent" href={`tel:${row.phone}`} dir="ltr">
            {row.phone}
          </a>
        ) : (
          <span className="text-muted">شماره ندارد</span>
        )}
        {row.phone2 ? (
          <a className="text-accent" href={`tel:${row.phone2}`} dir="ltr">
            دوم: {row.phone2}
          </a>
        ) : null}
      </div>
      {row.instagram ? <p className="mt-1 text-sm text-muted" dir="ltr">{row.instagram}</p> : null}
      <p className="mt-2 text-sm">دریافتی: {formatTattooToman(row.paidToman)}</p>
      <p className="mt-1 text-sm leading-7 text-muted">
        محل تاتو: {row.placements.length ? row.placements.join("، ") : "ثبت نشده"}
      </p>
      {row.lastSlot ? <p className="mt-1 text-xs text-muted">آخرین جلسه: {formatFaDateTime(row.lastSlot)}</p> : null}
      <p className="mt-2 text-sm leading-7 text-muted">
        {summary.length ? summary.join(" · ") : "پرونده هنوز نوشته نشده"}
      </p>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? "بستن پرونده" : "پرونده و ویرایش"}
      </Button>
      {open ? <CustomerFileForm contactKey={row.key} file={row.file} onSaved={onSaved} /> : null}
    </article>
  );
}

function CustomerFileForm({
  contactKey,
  file,
  onSaved,
}: {
  contactKey: string;
  file: CustomerFile;
  onSaved: (file: CustomerFile) => void;
}) {
  const [draft, setDraft] = useState(file);
  const [busy, setBusy] = useState(false);
  const [imageTouched, setImageTouched] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!file.hasHealedImage) return;
    let cancelled = false;
    void saveAction<{ image: string }>("studioCustomerHealedImage", { contactKey })
      .then((result) => {
        if (!cancelled && result.image) setDraft((current) => ({ ...current, healedImage: result.image, hasHealedImage: true }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [contactKey, file.hasHealedImage]);

  function setField(field: keyof CustomerFile, value: string) {
    setDraft((current) => ({ ...current, [field]: current[field] === value ? "" : value }));
  }

  async function pickHealed(list: FileList | null) {
    const picked = list?.[0];
    if (!picked) return;
    try {
      const image = await compressImage(picked);
      setImageTouched(true);
      setDraft((current) => ({ ...current, healedImage: image, hasHealedImage: true }));
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function save() {
    setBusy(true);
    try {
      const { hasHealedImage, healedImage, ...rest } = draft;
      await saveAction("saveStudioCustomerFile", {
        contactKey,
        ...rest,
        ...(imageTouched ? { healedImage } : {}),
      });
      onSaved({ ...draft, hasHealedImage: imageTouched ? Boolean(healedImage) : hasHealedImage });
      toast.success("پرونده ذخیره شد و برای کار بعدی می‌ماند.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const steps = ["پوست و رنگ", "جلسه", "ترمیم", "بقیه"];
  const hours = digitsOnly(draft.toleranceHours).slice(0, 2);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="grid grid-cols-4 gap-1">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            className={cn("h-10 rounded-xl px-1 text-[11px] font-bold", step === index ? "bg-primary text-primary-fg" : "border border-border text-muted")}
            onClick={() => setStep(index)}
          >
            {label}
          </button>
        ))}
      </div>
      {step === 0 ? (
        <>
          <Choice label="رنگ پوست" value={draft.skinTone} options={["روشن", "گندمی", "تیره"]} onChange={(value) => setField("skinTone", value)} />
          <Choice label="گرفتن رنگ" value={draft.inkHold} options={["خوب رنگ می‌گیرد", "معمولی بود", "سخت رنگ می‌گیرد", "رنگ نمی‌گیرد"]} onChange={(value) => setField("inkHold", value)} />
          <Choice label="ماندن رنگ روی بدن" value={draft.fade} options={["ماندگار می‌ماند", "معمولی بود", "کمی کمرنگ می‌شود", "زود کمرنگ می‌شود"]} onChange={(value) => setField("fade", value)} />
          <Choice label="آب پوست" value={draft.hydration} options={["پوست کم‌آب", "پوست معمولی", "پوست آبدار"]} onChange={(value) => setField("hydration", value)} />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Choice label="آمدن به استودیو" value={draft.arrival} options={["سر وقت می‌آید", "معمولاً دیر می‌آید", "زودتر می‌آید", "بدقول است"]} onChange={(value) => setField("arrival", value)} />
          <Choice label="تحمل درد" value={draft.pain} options={["درد را راحت تحمل می‌کند", "تحمل معمولی", "درد داشت"]} onChange={(value) => setField("pain", value)} />
          <label className="mt-3 block text-sm font-semibold">
            تحمل جلسه، ساعت
            <Input
              className="mt-2"
              inputMode="numeric"
              dir="ltr"
              value={hours}
              placeholder="مثلاً ۱۰ یا ۱۲"
              onChange={(event) => {
                const next = Math.min(16, Number(digitsOnly(event.target.value).slice(0, 2)) || 0);
                setDraft((current) => ({ ...current, toleranceHours: next ? `${toFaDigits(next)} ساعت` : "" }));
              }}
            />
            <span className="mt-1 block text-xs font-normal text-muted">هر ساعتی که جلسه طول کشید، حتی ۱۰ یا ۱۲. گزینه‌های دیگر این بخش سر جایش است.</span>
          </label>
          <Choice label="بی‌حسی" value={draft.numbing} options={["نزدم", "زدم و خوب بود", "زدم و پوست را خراب کرد"]} onChange={(value) => setField("numbing", value)} />
          <Choice label="خونریزی" value={draft.bleeding} options={["کم", "معمولی", "زیاد"]} onChange={(value) => setField("bleeding", value)} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Choice label="مراقبت و ترمیم" value={draft.healing} options={["مراقبت خوب", "مراقبت معمولی", "مراقبت بد", "مراقبت خیلی بد"]} onChange={(value) => setField("healing", value)} />
          <Choice label="التهاب" value={draft.inflammation} options={["التهاب نداشت", "التهاب داشت", "در آخر کار التهاب پیدا کرد", "از همان ابتدا التهاب داشت"]} onChange={(value) => setField("inflammation", value)} />
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Choice label="مشروب" value={draft.alcohol} options={["مشروب نمی‌خورد", "گاهی می‌خورد", "قبل از جلسه خورده بود"]} onChange={(value) => setField("alcohol", value)} />
          <label className="mt-3 block text-sm font-semibold">
            ساعت خواب
            <Input
              className="mt-2"
              value={draft.sleepNote}
              onChange={(event) => setDraft((current) => ({ ...current, sleepNote: event.target.value }))}
              placeholder="مثلاً ۵ ساعت، شب قبل دیر خوابیده"
            />
          </label>
          <Choice label="گروه خونی" value={draft.bloodType} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "نمی‌داند"]} onChange={(value) => setField("bloodType", value)} />
          <p className="mt-1 text-xs leading-6 text-muted">برای مقایسه تحمل و سرعت ترمیم بین مشتری‌هاست، نه برای کار پزشکی.</p>
          <label className="mt-3 block text-sm font-semibold">
            دارو یا حساسیت پوست
            <Input
              className="mt-2"
              value={draft.sensitivity}
              onChange={(event) => setDraft((current) => ({ ...current, sensitivity: event.target.value }))}
              placeholder="مثلاً آسپرین می‌خورد، یا پوستش به چسب حساس است"
            />
          </label>
          <div className="mt-3">
            <p className="text-sm font-semibold">عکس بعد از ترمیم</p>
            {draft.healedImage ? <img src={draft.healedImage} alt="تاتو بعد از ترمیم" className="mt-2 max-h-64 rounded-2xl object-contain" /> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-border px-3 text-sm">
                انتخاب عکس
                <input type="file" accept="image/*" className="hidden" onChange={(event) => void pickHealed(event.target.files)} />
              </label>
              {draft.healedImage || draft.hasHealedImage ? (
                <Button type="button" size="sm" variant="outline" onClick={() => { setImageTouched(true); setDraft((current) => ({ ...current, healedImage: "", hasHealedImage: false })); }}>
                  حذف عکس
                </Button>
              ) : null}
            </div>
          </div>
          <label className="mt-3 block text-sm font-semibold">
            نکته برای کار بعدی
            <Textarea className="mt-2" rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="هر چیزی که جلسه بعد باید یادت بماند" />
          </label>
        </>
      ) : null}
      <div className="mt-4 flex gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
            قبلی
          </Button>
        ) : null}
        {step < 3 ? (
          <Button type="button" onClick={() => setStep((value) => value + 1)}>
            بعدی
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "در حال ذخیره…" : "ذخیره پرونده"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              value === option ? "border-primary bg-primary text-primary-fg" : "border-border text-muted",
            )}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function daysBetweenKeys(fromKey: string, toKey: string) {
  const [y, m, d] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  if (!y || !ty) return -1;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
}

function AftercareReminders({ jobs }: { jobs: Array<TattooRequest & { customerFile?: CustomerFileBrief | null }> }) {
  const today = tehranDayKey();
  const due = jobs
    .map((job) => {
      const day = jobDayKey(job);
      const age = daysBetweenKeys(day, today);
      const stage = age === 1 ? "wash" : age === 4 ? "itch" : age === 5 ? "month" : null;
      return stage ? { job, stage, age } : null;
    })
    .filter((row): row is { job: TattooRequest & { customerFile?: CustomerFileBrief | null }; stage: "wash" | "itch" | "month"; age: number } => Boolean(row))
    .sort((a, b) => a.age - b.age || jobStamp(a.job) - jobStamp(b.job));
  if (!due.length) return null;
  return (
    <section className="rounded-3xl border border-amber-400 bg-amber-50 p-4 text-amber-950">
      <h2 className="text-base font-bold">مراقبت بعد تاتو را تذکر بده</h2>
      <p className="mt-1 text-sm leading-7">این‌ها مشتری امروز نیستند. رنگ این بخش با نوبت امروز فرق دارد.</p>
      <div className="mt-3 grid gap-3">
        {due.map(({ job, stage, age }) => {
          const phone = job.customerPhone && job.customerPhone !== "09000000000" ? job.customerPhone : "";
          const label = age === 1 ? "مشتری دیروز" : age === 4 ? "چهار روز بعد از اجرا" : "پنج روز بعد از اجرا";
          return (
            <article key={`${job.id}-${stage}`} className="rounded-2xl border border-amber-300 bg-white/70 p-3">
              <p className="text-xs font-bold text-amber-800">{label}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-bold">
                {isUnreliableCustomer(job.customerFile?.arrival) ? <UnreliableBadge /> : null}
                <span>{job.customerName}</span>
              </p>
              <p className="text-sm text-amber-900">{formatFaDateTime(job.proposedSlotStart || job.updatedAt)}</p>
              {phone ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-900 px-3 text-sm font-bold text-amber-50" href={toSmsLink(phone, aftercareSms(stage, job.customerName, "آقا")) ?? undefined}>
                    پیامک برای آقا
                  </a>
                  <a className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-800 px-3 text-sm font-bold text-amber-950" href={toSmsLink(phone, aftercareSms(stage, job.customerName, "خانم")) ?? undefined}>
                    پیامک برای خانم
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-sm">شماره ندارد.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function enrollReferrer(name: string, phone: string) {
  void saveAction<{ code: string }>("setReferralMember", {
    name,
    phone,
    active: true,
    tier: "active",
  })
    .then((saved) => toast.success(`عضو باشگاه شد. کد ${saved.code}`))
    .catch((err) => toast.error(friendlyError(err)));
}

function jobVisitStatus(job: TattooRequest, bookings: Booking[], whenIso: string) {
  const booking = job.bookingId ? bookings.find((row) => row.id === job.bookingId) : undefined;
  if (booking?.status === "cancelled" || job.status === "rejected") return { label: "لغو", tone: "muted" as const };
  if (booking?.status === "no_show") return { label: "نیامد", tone: "danger" as const };
  const day = whenIso ? tehranDayKey(new Date(whenIso)) : "";
  if (day && day < tehranDayKey()) return { label: "انجام شد", tone: "accent" as const };
  return { label: "قطعی", tone: "primary" as const };
}

function TomorrowReminders({ bookings }: { bookings: Booking[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TattooRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const day = shiftTehranDayKey(tehranDayKey(), 1);
      const next = shiftTehranDayKey(day, 1);
      const [y, m, d] = day.split("-").map(Number);
      const [ey, em, ed] = next.split("-").map(Number);
      const jobs = await saveAction<TattooRequest[]>("studioMonthJobs", {
        start: tehranLocalToIso(y, m, d, 0, 0),
        end: tehranLocalToIso(ey, em, ed, 0, 0),
        mine: true,
      });
      setRows(jobs);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  const dayLabel = dayHeading(shiftTehranDayKey(tehranDayKey(), 1));
  const listed = rows
    .filter((job) => {
      const booking = job.bookingId ? bookings.find((row) => row.id === job.bookingId) : undefined;
      return booking?.status !== "cancelled" && booking?.status !== "no_show";
    })
    .sort((a, b) => jobStamp(a, bookings) - jobStamp(b, bookings));

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <Button type="button" onClick={() => void load()}>
        {open ? "بستن یادآوری فردا" : "یادآوری فردا"}
      </Button>
      {open ? (
        <div className="mt-3 grid gap-3">
          <p className="text-sm leading-7 text-muted">نوبت‌های {dayLabel}. با زدن پیامک، متن یادآوری داخل پیامک گوشی باز می‌شود. خودبه‌خود ارسال نمی‌شود.</p>
          {loading ? <p className="text-sm text-muted">در حال آوردن نوبت‌های فردا…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !listed.length ? <p className="text-sm text-muted">برای فردا نوبتی نیست.</p> : null}
          {listed.map((job) => {
            const when = job.bookingId
              ? bookings.find((row) => row.id === job.bookingId)?.slotStart || job.proposedSlotStart
              : job.proposedSlotStart;
            const money = tattooBalance(job.priceMinToman, job.paidToman);
            const phone = usablePhone(job.customerPhone) || usablePhone(job.customerPhone2);
            const text = bookingReminderSms({
              honorific: honorificForName(job.customerName),
              name: job.customerName,
              when,
              remainingToman: money.remaining,
            });
            const href = phone ? toSmsLink(phone, text) : null;
            const clock = when
              ? new Date(when).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" })
              : "";
            return (
              <article key={job.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <strong>{job.customerName}</strong>
                  <span className="text-sm text-muted">{clock}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{job.placement || job.style}</p>
                {href ? (
                  <a className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-fg" href={href}>
                    پیامک یادآوری
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-muted">شماره‌ای برای پیامک نیست.</p>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function MonthJobsPanel({
  businesses,
  bookings,
  onChange,
  personal = false,
  canEnroll = false,
}: {
  businesses: Business[];
  bookings: Booking[];
  onChange: () => void;
  personal?: boolean;
  canEnroll?: boolean;
}) {
  const clock = tehranClock();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.day);
  const [span, setSpan] = useState<"month" | "week" | "yesterday">("month");
  const [weekOffset, setWeekOffset] = useState(0);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  const [jobs, setJobs] = useState<Array<TattooRequest & { customerFile?: CustomerFileBrief | null }>>([]);
  const [careJobs, setCareJobs] = useState<Array<TattooRequest & { customerFile?: CustomerFileBrief | null }>>([]);
  const [waiting, setWaiting] = useState<StudioFillIn[]>([]);
  const [briefs, setBriefs] = useState<Record<string, CustomerFileBrief>>({});
  const [jobQuery, setJobQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const week = tehranWeekBounds(weekOffset);
      const yesterdayKey = shiftTehranDayKey(tehranDayKey(), -1);
      const [yy, ym, yd] = yesterdayKey.split("-").map(Number);
      const yEnd = shiftTehranDayKey(yesterdayKey, 1);
      const [ey, em, ed] = yEnd.split("-").map(Number);
      const rows = await saveAction<TattooRequest[]>(
        "studioMonthJobs",
        span === "yesterday"
          ? { start: tehranLocalToIso(yy, ym, yd, 0, 0), end: tehranLocalToIso(ey, em, ed, 0, 0), mine: true }
          : span === "week"
            ? { start: week.start, end: week.end, mine: true }
            : { jy: month.jy, jm: month.jm, mine: true },
      );
      setJobs(rows);
      try {
        const today = tehranDayKey();
        const startKey = shiftTehranDayKey(today, -5);
        const [sy, sm, sd] = startKey.split("-").map(Number);
        const [ty, tm, td] = today.split("-").map(Number);
        const recent = await saveAction<TattooRequest[]>("studioMonthJobs", {
          start: tehranLocalToIso(sy, sm, sd, 0, 0),
          end: tehranLocalToIso(ty, tm, td, 0, 0),
          mine: true,
        });
        setCareJobs(recent);
      } catch {
        setCareJobs([]);
      }
      const phones = rows.flatMap((job) => [job.customerPhone, job.customerPhone2 || ""]);
      const names = rows.map((job) => job.customerName);
      const nextBriefs = await saveAction<Record<string, CustomerFileBrief>>("studioCustomerFileBriefs", { phones, names });
      setBriefs(nextBriefs);
      try {
        const fills = await saveAction<StudioFillIn[]>("listStudioFillIns");
        setWaiting(fills.filter((row) => row.status === "waiting"));
      } catch {
        setWaiting([]);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [span, weekOffset, month.jy, month.jm]);

  const week = tehranWeekBounds(weekOffset);
  const weekTitle = weekRangeLabel(week.startKey);
  const visibleJobs = jobs.filter((job) => customerQueryMatch(jobQuery, job));
  const todayKey = tehranDayKey();
  const upcomingJobs = visibleJobs
    .filter((job) => jobDayKey(job, bookings) >= todayKey)
    .sort((a, b) => jobStamp(a, bookings) - jobStamp(b, bookings));
  const pastJobs = visibleJobs
    .filter((job) => jobDayKey(job, bookings) < todayKey)
    .sort((a, b) => jobStamp(a, bookings) - jobStamp(b, bookings));
  const chronological = span === "month" || (span === "week" && weekOffset >= 0);
  const orderedJobs = [...visibleJobs].sort((a, b) => jobStamp(a, bookings) - jobStamp(b, bookings));
  const dayGroups = groupByDay(chronological ? orderedJobs : upcomingJobs, bookings);
  const pastWeek = span === "week" && weekOffset < 0;
  const focusedPast = pastWeek || span === "yesterday";
  const pastWeekLabel =
    span === "yesterday"
      ? "دیروز"
      : weekOffset === -1
        ? "هفته قبل"
        : weekOffset === -2
          ? "۲ هفته قبل"
          : weekOffset === -3
            ? "۳ هفته قبل"
            : weekTitle;

  const viewingToday = !focusedPast && (span === "week" ? weekOffset === 0 : month.jy === todayJ.jy && month.jm === todayJ.jm);

  async function refreshAll() {
    await load();
    onChange();
  }

  const jobDue = visibleJobs.reduce((sum, job) => sum + Math.max(0, (job.priceMinToman || 0) - (job.paidToman || 0)), 0);

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">نوبت‌ها</h2>
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 text-sm font-bold">
          <button type="button" className={`shrink-0 rounded-xl px-3 py-2 ${span === "yesterday" ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setSpan("yesterday")}>دیروز</button>
          {(
            [
              [0, "این هفته"],
              [-1, "هفته قبل"],
            ] as const
          ).map(([offset, label]) => (
            <button
              key={offset}
              type="button"
              className={`shrink-0 rounded-xl px-3 py-2 ${span === "week" && weekOffset === offset ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => {
                setWeekOffset(offset);
                setSpan("week");
              }}
            >
              {label}
            </button>
          ))}
          <button type="button" className={`shrink-0 rounded-xl px-3 py-2 ${span === "month" ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setSpan("month")}>این ماه</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">
          {span === "yesterday" ? "دیروز" : span === "week" ? weekTitle : `${JALALI_MONTHS[month.jm - 1]} ${toFaDigits(month.jy)}`}
        </p>
        <div className="flex items-center gap-2">
          {span === "week" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setSpan("week"); setWeekOffset((value) => value - 1); }}>قبل</Button>
              <Button variant="outline" size="sm" onClick={() => { setSpan("week"); setWeekOffset((value) => value + 1); }}>بعد</Button>
            </>
          ) : span === "month" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}>ماه قبل</Button>
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}>ماه بعد</Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={!orderedJobs.length}
            onClick={() => {
              try {
                const mode = downloadStudioJobsPdf(
                  chronological ? orderedJobs : [...upcomingJobs, ...pastJobs],
                  span === "yesterday" ? "لیست دیروز" : span === "week" ? `لیست هفته ${weekTitle}` : `لیست مشتری ${JALALI_MONTHS[month.jm - 1]} ${toFaDigits(month.jy)}`,
                );
                toast.success(
                  mode === "apk"
                    ? "در حال ذخیره PDF در پوشه دانلود گوشی."
                    : "پنجره چاپ باز شد. ذخیره به‌صورت PDF را بزن.",
                );
              } catch (err) {
                toast.error(friendlyError(err));
              }
            }}
          >
            <FileDown className="size-4" />
            PDF
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[#2f80ed] p-4 text-white">
          <p className="text-sm text-white/80">نوبت</p>
          <p className="mt-2 text-2xl font-bold">{toFaDigits(visibleJobs.length)}</p>
        </div>
        <div className="rounded-3xl bg-[#eb5757] p-4 text-white">
          <p className="text-sm text-white/80">ماندهٔ تسویه</p>
          <p className="mt-2 text-xl font-bold">{formatTattooToman(jobDue)}</p>
        </div>
      </div>

      <AftercareReminders jobs={careJobs} />

      <TomorrowReminders bookings={bookings} />

      {focusedPast ? (
        <section className="grid gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <h3 className="font-bold">{pastWeekLabel}</h3>
            <p className="mt-1 text-sm text-muted">
              {span === "yesterday" ? "کارهای دیروز. همین‌جا می‌توانی ویرایش یا منتقل کنی." : `${weekTitle}. همین‌جا می‌توانی مشخصات را ویرایش کنی.`}
            </p>
          </div>
          {!loading && !pastJobs.length ? (
            <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
              {span === "yesterday" ? "دیروز نوبتی ثبت نشده." : "در این هفته نوبتی ثبت نشده."}
            </p>
          ) : null}
          {pastJobs.map((job) => (
            <MonthJobCard
              key={`past-${job.id}-${job.updatedAt}-${job.paidToman}`}
              job={job}
              busyKeys={bookings
                .filter((booking) => booking.status !== "cancelled" && booking.kind === "booking")
                .map((booking) => tehranDayKey(new Date(booking.slotStart)))}
              bookings={bookings}
              peers={jobs}
              onChange={() => void refreshAll()}
              file={fileForJob(briefs, job)}
              canEnroll={canEnroll}
            />
          ))}
        </section>
      ) : null}

      <StudioJobForm businesses={businesses} bookings={bookings} onCreated={() => void refreshAll()} personal={personal} />

      <Input
        value={jobQuery}
        onChange={(e) => setJobQuery(e.target.value)}
        placeholder={span === "yesterday" ? "جستجوی اسم یا شماره در دیروز" : span === "week" ? "جستجوی اسم یا شماره در این هفته" : "جستجوی اسم یا شماره در این ماه"}
      />

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-muted">{span === "yesterday" ? "در حال دریافت دیروز…" : span === "week" ? "در حال دریافت لیست هفته…" : "در حال دریافت لیست ماه…"}</p> : null}
      {!loading && !jobs.length && !focusedPast ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm leading-7 text-muted">
          {span === "week"
            ? "در این هفته کار رزرو‌شده‌ای نیست."
            : "در این ماه کار رزرو‌شده‌ای نیست. کارهای عقب‌افتاده را از فرم بالا دستی وارد کنید. تاریخ‌های سه‌شنبه ۵ آبان، شنبه ۹ آبان و جمعه ۱۴ آبان را هم همین‌جا ثبت کنید."}
        </p>
      ) : null}
      {!loading && jobs.length > 0 && !upcomingJobs.length && !pastJobs.length ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          {span === "week"
            ? "با این اسم یا شماره در این هفته نوبتی نیست."
            : "با این اسم یا شماره در این ماه نوبتی نیست. نوبت‌های دیگر همان مشتری حذف نشده‌اند."}
        </p>
      ) : null}
      {chronological ? null : viewingToday && !dayGroups.some((group) => group.day === todayKey) ? (
        <DayGap day={todayKey} jobs={[]} waiting={waiting} />
      ) : null}
      {dayGroups.map((group, index) => {
        const previous = dayGroups[index - 1];
        const next = dayGroups[index + 1];
        const holes = !jobQuery.trim() && next ? daysBetween(group.day, next.day) : [];
        const todayMissing = chronological && viewingToday && !dayGroups.some((item) => item.day === todayKey);
        const showTodayBefore = todayMissing && !previous && group.day > todayKey;
        return (
        <div key={group.day} className="grid gap-4">
          {showTodayBefore ? <DayGap day={todayKey} jobs={[]} waiting={waiting} /> : null}
          {chronological ? (
            <p className="text-sm font-bold text-muted">
              {dayHeading(group.day)}
              {group.day === todayKey ? " · امروز" : ""}
            </p>
          ) : null}
          {group.jobs.map((job) => (
            <MonthJobCard
              key={`${job.id}-${job.updatedAt}-${job.paidToman}`}
              job={job}
              busyKeys={bookings
                .filter((booking) => booking.status !== "cancelled" && booking.kind === "booking")
                .map((booking) => tehranDayKey(new Date(booking.slotStart)))}
              bookings={bookings}
              peers={jobs}
              onChange={() => void refreshAll()}
              file={fileForJob(briefs, job)}
              canEnroll={canEnroll}
            />
          ))}
          <DayGap day={group.day} jobs={group.jobs} waiting={waiting} />
          {holes.map((day) => (
            <EmptyDayOffer key={day} day={day} waiting={waiting} onBooked={() => void refreshAll()} />
          ))}
        </div>
        );
      })}
      {chronological && viewingToday && !dayGroups.some((group) => group.day >= todayKey) ? (
        <DayGap day={todayKey} jobs={[]} waiting={waiting} />
      ) : null}
      {!chronological && !focusedPast && pastJobs.length ? <p className="pt-2 text-sm font-semibold text-muted">قبل از امروز</p> : null}
      {!chronological && !focusedPast
        ? pastJobs.map((job) => (
            <MonthJobCard
              key={`${job.id}-${job.updatedAt}-${job.paidToman}`}
              job={job}
              busyKeys={bookings
                .filter((booking) => booking.status !== "cancelled" && booking.kind === "booking")
                .map((booking) => tehranDayKey(new Date(booking.slotStart)))}
              bookings={bookings}
              peers={jobs}
              onChange={() => void refreshAll()}
              file={fileForJob(briefs, job)}
              canEnroll={canEnroll}
            />
          ))
        : null}

    </div>
  );
}

function daysBetween(from: string, to: string) {
  const out: string[] = [];
  let cursor = shiftTehranDayKey(from, 1);
  for (let guard = 0; cursor && cursor < to && guard < 40; guard += 1) {
    if (cursor >= tehranDayKey()) out.push(cursor);
    cursor = shiftTehranDayKey(cursor, 1);
  }
  return out;
}

function dayHeading(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return jalaliDayLabel(y, m, d);
}

function EmptyDayOffer({ day, waiting, onBooked }: { day: string; waiting: StudioFillIn[]; onBooked: () => void }) {
  const [time, setTime] = useState("10:30");
  const [busy, setBusy] = useState(false);
  const title = dayHeading(day);
  if (isTehranThursday(day)) {
    return (
      <aside className="rounded-2xl border border-violet-400/40 bg-violet-50 p-4 text-violet-950">
        <p className="font-bold">این روز خالی از مشتری است</p>
        <p className="mt-1 text-sm leading-7">{title} · پنجشنبه، روز هنرجوها. مشتری اینجا ثبت نمی‌شود.</p>
      </aside>
    );
  }
  const open = waiting
    .filter((row) => {
      const minutes = row.sessionMinutes >= 30 ? row.sessionMinutes : row.historyMinutes;
      return minutes >= 30 && minutes <= 8 * 60;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  async function book(row: StudioFillIn) {
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    if (!y || Number.isNaN(hh)) return toast.error("ساعت این روز را مشخص کن.");
    const minutes = row.sessionMinutes >= 30 ? row.sessionMinutes : row.historyMinutes;
    setBusy(true);
    try {
      const created = await saveAction<{ paidToman?: number }>("createStudioJob", {
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerPhone2: row.customerPhone2 || undefined,
        style: "سایر",
        idea: row.note || row.idea || "پر کردن روز خالی",
        placement: row.placement || "هماهنگ در استودیو",
        sizeCm: row.designs?.map((design) => design.sizeCm).filter(Boolean).join(" / ") || row.sizeCm || undefined,
        priceMinToman: row.designs?.length ? row.designs.reduce((sum, design) => sum + (design.priceToman || 0), 0) : row.priceToman || 0,
        paidToman: row.paidToman || 0,
        fillInId: row.id,
        sessionMinutes: minutes,
        slotStart: tehranLocalToIso(y, m, d, hh || 10, mm || 0),
        referenceImages: (row.designs?.map((design) => design.image).filter((image) => image.startsWith("data:image/") && image.length <= 900_000) || (row.designImage?.startsWith("data:image/") ? [row.designImage] : [])).slice(0, 3),
        customerInstagram: row.customerInstagram || undefined,
      });
      await saveAction("markStudioFillIn", { id: row.id, mark: "came" });
      toast.success(
        (created?.paidToman || 0) > 0
          ? `${row.customerName} برای ${title} ثبت شد. واریزی هم آمد و در لیست انتظار ماند.`
          : `${row.customerName} برای ${title} ثبت شد و در لیست انتظار ماند.`,
      );
      onBooked();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="rounded-2xl border border-emerald-700/30 bg-emerald-50 p-4 text-emerald-950">
      <p className="font-bold">این روز خالی است</p>
      <p className="mt-1 text-sm leading-7">{title}</p>
      <label className="mt-3 block text-sm font-semibold">
        ساعت شروع
        <Input className="mt-2 max-w-[140px] bg-white" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
      </label>
      {open.length ? (
        <div className="mt-3 grid gap-2">
          {open.slice(0, 3).map((row) => {
            const minutes = row.sessionMinutes >= 30 ? row.sessionMinutes : row.historyMinutes;
            return (
              <div key={row.id} className="rounded-xl border border-emerald-800/15 bg-white/70 p-3">
                <p className="text-sm leading-7">
                  {row.customerName} · {formatSitting(minutes)}
                  {row.placement ? ` · ${row.placement}` : ""}
                </p>
                <Button className="mt-2" size="sm" disabled={busy} onClick={() => void book(row)}>
                  ثبت این روز برای این مشتری
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm leading-7">در لیست انتظار کسی با مدت مشخص نیست. اول در لیست انتظار مدت کار را ذخیره کن.</p>
      )}
    </aside>
  );
}

function groupByDay(jobs: TattooRequest[], bookings: Booking[] = []) {
  const groups: { day: string; jobs: TattooRequest[] }[] = [];
  for (const job of jobs) {
    const day = jobDayKey(job, bookings);
    const last = groups[groups.length - 1];
    if (!last || last.day !== day) groups.push({ day, jobs: [job] });
    else last.jobs.push(job);
  }
  return groups;
}

function DayGap({ day, jobs, waiting }: { day: string; jobs: TattooRequest[]; waiting: StudioFillIn[] }) {
  if (day < tehranDayKey() || isTehranThursday(day)) return null;
  if (jobs.some((job) => !job.sessionMinutes)) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-4 text-sm leading-7">
        مدت یکی از نوبت‌های این روز ثبت نشده. تا ساعتش معلوم نباشد پیشنهاد نمی‌دهم، تا روز از ۸ ساعت رد نشود.
      </p>
    );
  }
  const used = jobs.reduce((sum, job) => sum + (job.sessionMinutes || 0), 0);
  const remaining = Math.max(0, 8 * 60 - used);
  if (remaining < 60) return null;
  const busy = new Set(jobs.flatMap((job) => [phoneTail(job.customerPhone), phoneTail(job.customerPhone2 || "")]).filter(Boolean));
  const { primary, alternate, bothFit } = suggestWaitlist(
    remaining,
    waiting.map((row) => {
      const piece = pieceMinutes(row.sessionMinutes || 0, row.historyMinutes || 0);
      return {
        id: row.id,
        name: row.customerName,
        phone: row.customerPhone,
        phone2: row.customerPhone2,
        minutes: piece.minutes,
        createdAt: row.createdAt,
        missedCount: row.missedCount || 0,
        ongoing: row.ongoing,
        source: piece.source === "none" ? undefined : piece.source,
      };
    }),
    busy,
  );
  return (
    <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold">پیشنهاد لیست انتظار</p>
      <p className="mt-1 text-sm leading-7">
        این روز {used ? formatSitting(used) : "هنوز کاری"} دارد. {formatSitting(remaining)} تا سقف ۸ ساعت بدن مانده.
      </p>
      {primary ? (
        <>
          <SuggestionLine row={primary} />
          {alternate ? (
            <>
              <SuggestionLine row={alternate} muted />
              <p className="mt-1 text-sm leading-7 text-muted">
                {bothFit
                  ? "جمع این دو در ۸ ساعت می‌ماند، ولی فقط اگر ساعت‌ها روی هم نیفتند."
                  : "این دو را با هم نگذار. از توان ۸ ساعت رد می‌شود."}
              </p>
            </>
          ) : null}
          <p className="mt-2 text-xs leading-6 text-muted">
            هنوز در تقویم نرفته. اگر آمد، از لیست انتظار ساعت را بزن. اگر روی نوبت دیگری بیفتد، ثبت نمی‌شود.
            {primary.ongoing ? " کار ادامه‌دار بعد از این تکه در لیست می‌ماند." : " کار یک‌جلسه‌ای بعد از تأیید از لیست می‌رود."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm leading-7 text-muted">
          در لیست انتظار کاری که در این {formatSitting(remaining)} جا شود نیست. اگر مدت کسی خالی است، در ویرایش لیست بنویس.
        </p>
      )}
    </aside>
  );
}

function SuggestionLine({ row, muted = false }: { row: { name: string; phone: string; phone2?: string; minutes: number; source?: "piece" | "history"; missedCount?: number }; muted?: boolean }) {
  const tel = toTelLink(row.phone);
  const sms = toSmsLink(row.phone, fillInMissedCallSms(row.name));
  const why = row.source === "history" ? "از جلسه قبلی همین مشتری" : "مدت همین تکه";
  return (
    <div className={muted ? "mt-2 text-sm leading-7 text-muted" : "mt-2 text-sm leading-7"}>
      <p>
        {muted ? "یا " : "پیشنهاد: "}
        {row.name}، {formatSitting(row.minutes)}. {why}.
        {row.missedCount ? ` ${toFaDigits(row.missedCount)} بار مراجعه نکرده.` : ""}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {tel ? (
          <a className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface text-sm font-bold" href={tel}>
            تماس
          </a>
        ) : null}
        {sms ? (
          <a className="inline-flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-fg" href={sms}>
            پیام بی‌جواب
          </a>
        ) : null}
      </div>
    </div>
  );
}

function jobStamp(job: TattooRequest, bookings: Booking[] = []) {
  const linked = job.bookingId
    ? bookings.find((row) => row.id === job.bookingId && row.kind === "booking" && row.status !== "cancelled")
    : undefined;
  const when = linked?.slotStart || job.proposedSlotStart || job.updatedAt;
  const time = Date.parse(when);
  return Number.isFinite(time) ? time : 0;
}

function jobDayKey(job: TattooRequest, bookings: Booking[] = []) {
  const stamp = jobStamp(job, bookings);
  return stamp ? tehranDayKey(new Date(stamp)) : "";
}

function weekRangeLabel(startKey: string) {
  const [y, m, d] = startKey.split("-").map(Number);
  const start = gregorianToJalali(y, m, d);
  const endKey = shiftTehranDayKey(startKey, 6);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const end = gregorianToJalali(ey, em, ed);
  const startText = `${toFaDigits(start.jd)} ${JALALI_MONTHS[start.jm - 1]}`;
  const endText = `${toFaDigits(end.jd)} ${JALALI_MONTHS[end.jm - 1]}`;
  return `${startText} تا ${endText}`;
}

function usablePhone(raw: string | null | undefined) {
  const phone = (raw || "").trim();
  return phone && phone !== "09000000000" ? phone : "";
}

function BookingSmsActions({ request }: { request: TattooRequest }) {
  const phone = usablePhone(request.customerPhone);
  const phone2 = usablePhone(request.customerPhone2);
  if (!phone && !phone2) return null;
  const paid = (request.paidToman ?? 0) > 0 ? request.paidToman : request.depositToman;
  const honorific = honorificForName(request.customerName);

  function open(raw: string, kind: "confirm" | "food" | "card" | "care" | "balance") {
    if (!request.proposedSlotStart && kind === "confirm") {
      toast.error("اول تاریخ و ساعت اجرا را ثبت کن، بعد پیامک را بفرست.");
      return;
    }
    const text =
      kind === "food"
        ? sessionFoodSms(request.customerName)
        : kind === "card"
          ? depositCardSms(request.customerName)
          : kind === "care"
            ? aftercareGuideSms(request.customerName)
            : kind === "balance"
              ? balanceSms(request.customerName, request.priceMinToman, request.paidToman)
              : bookingConfirmSms({
                  honorific,
                  name: request.customerName,
                  when: request.proposedSlotStart,
                  paidToman: paid,
                });
    const href = toSmsLink(raw, text);
    if (!href) {
      toast.error("شماره برای پیامک معتبر نیست.");
      return;
    }
    window.location.assign(href);
  }

  return (
    <div className="mb-3 rounded-2xl border border-border bg-bg p-3">
      <p className="text-sm font-semibold">پیامک از گوشی خودت</p>
      <p className="mt-1 text-xs leading-6 text-muted">خطاب از روی اسم انتخاب می‌شود. ارسال را خودت در پیامک تأیید می‌کنی.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {phone ? (
          <>
            <Button type="button" size="sm" onClick={() => open(phone, "confirm")}>
              پیامک قطعی نوبت
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone, "food")}>
              تغذیه زمان اجرا
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone, "card")}>
              کارت و شبا
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone, "care")}>
              مراقبت بعد تاتو
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone, "balance")}>
              مبلغ و مانده
            </Button>
          </>
        ) : null}
        {phone2 ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone2, "confirm")}>
              شماره دوم، قطعی
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone2, "food")}>
              شماره دوم، تغذیه
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone2, "card")}>
              شماره دوم، کارت
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone2, "care")}>
              شماره دوم، مراقبت
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open(phone2, "balance")}>
              شماره دوم، مانده
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BookedSlotActions({
  request,
  busyKeys,
  onChange,
  showSms = true,
}: {
  request: TattooRequest;
  busyKeys: string[];
  onChange: () => void;
  showSms?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [follow, setFollow] = useState(false);
  const [carryOn, setCarryOn] = useState(false);
  const [carry, setCarry] = useState<{ price: number; paid: number; remaining: number; settled: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [day, setDay] = useState(tehranDateInput(request.proposedSlotStart));
  const [time, setTime] = useState(tehranTimeInput(request.proposedSlotStart));
  const [followDay, setFollowDay] = useState(oneMonthLaterKey(request.proposedSlotStart));
  const [followTime, setFollowTime] = useState(tehranTimeInput(request.proposedSlotStart));
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

  async function saveFollow(continuation = false) {
    if (!followDay || !followTime) return toast.error("تاریخ و ساعت را انتخاب کنید.");
    const [y, m, d] = followDay.split("-").map(Number);
    const [hh, mm] = followTime.split(":").map(Number);
    setBusy(true);
    try {
      await saveAction("followUpStudioJob", {
        id: request.id,
        slotStart: tehranLocalToIso(y, m, d, hh, mm),
        sessionMinutes: minutes ? Number(minutes) : undefined,
        continuation,
        carryToman: continuation ? carry?.remaining ?? 0 : undefined,
      });
      toast.success(continuation ? "ادامه کار ثبت شد." : "جلسه دوم با همان مشخصات ثبت شد.");
      setFollow(false);
      setCarryOn(false);
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function openCarry() {
    setCarryOn(true);
    setFollow(false);
    setEditing(false);
    try {
      const next = await saveAction<{ price: number; paid: number; remaining: number; settled: boolean }>("studioContinuationBalance", {
        phone: request.customerPhone,
        phone2: request.customerPhone2,
      });
      setCarry(next);
    } catch (err) {
      toast.error(friendlyError(err));
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
      {showSms ? <BookingSmsActions request={request} /> : null}
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="تاریخ جدید">
            <JalaliDatePicker value={day} onChange={setDay} label="انتخاب روز" busyKeys={busyKeys} />
          </Field>
          <Field label="ساعت شروع">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <div className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">مدت جلسه</span>
            <DurationFields minutes={Number(minutes) || 0} onChange={(value) => setMinutes(String(value))} />
            <p className="text-xs text-muted">{formatSitting(Number(minutes))}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button disabled={busy} size="sm" onClick={() => void saveTime()}>
              ذخیره زمان جدید
            </Button>
            <Button disabled={busy} size="sm" variant="outline" onClick={() => setEditing(false)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : follow || carryOn ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <p className="text-sm leading-7 text-muted sm:col-span-3">
            {carryOn
              ? carry?.settled
                ? "این کار تسویه شده. ادامهٔ کار بدون مبلغ ثبت می‌شود."
                : carry
                  ? `مانده ${formatTattooToman(carry.remaining)} روی نوبت جدید می‌ماند تا بعداً بگیریش.`
                  : "در حال حساب مانده…"
              : "نام، شماره، اینستاگرام، طرح، محل، ابعاد، عکس، قیمت و واریزی همین کار می‌آید. فقط تاریخ جلسه دوم را عوض کن."}
          </p>
          <Field label="تاریخ جلسه دوم">
            <JalaliDatePicker value={followDay} onChange={setFollowDay} label="انتخاب روز" busyKeys={busyKeys} />
          </Field>
          <Field label="ساعت شروع">
            <Input type="time" value={followTime} onChange={(e) => setFollowTime(e.target.value)} />
          </Field>
          <div className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">مدت جلسه</span>
            <DurationFields minutes={Number(minutes) || 0} onChange={(value) => setMinutes(String(value))} />
            <p className="text-xs text-muted">{formatSitting(Number(minutes))}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button disabled={busy} size="sm" onClick={() => void saveFollow(carryOn)}>
              {carryOn ? "ثبت ادامه کار" : "ثبت جلسه دوم"}
            </Button>
            <Button disabled={busy} size="sm" variant="outline" onClick={() => { setFollow(false); setCarryOn(false); }}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} size="sm" variant="outline" onClick={() => setEditing(true)}>
            ویرایش زمان
          </Button>
          <Button disabled={busy} size="sm" variant="outline" onClick={() => { setFollow(true); setCarryOn(false); }}>
            ثبت جلسه دوم
          </Button>
          <Button disabled={busy} size="sm" variant="outline" onClick={() => void openCarry()}>
            ادامه کار
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

function fileForJob(briefs: Record<string, CustomerFileBrief>, job: TattooRequest) {
  const name = job.customerName.replace(/\s+/g, " ").trim();
  const keys = [briefPhoneKey(job.customerPhone), briefPhoneKey(job.customerPhone2 || ""), name ? `name:${name}` : ""].filter(Boolean);
  return keys.map((key) => briefs[key]).find(Boolean) ?? null;
}

function briefPhoneKey(raw: string) {
  const digits = digitsOnly(raw);
  if (!digits || digits === "09000000000") return "";
  return digits.length > 10 ? `0${digits.slice(-10)}` : digits;
}

function RealDurationFix({ job, onChange }: { job: TattooRequest; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(job.sessionMinutes ?? 180);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (minutes < 10) return toast.error("مدت واقعی را کامل بنویس.");
    setBusy(true);
    try {
      await saveAction("updateStudioJob", { id: job.id, sessionMinutes: minutes });
      toast.success("مدت واقعی ذخیره شد. ساعت نوبت جابه‌جا نشد.");
      setOpen(false);
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? "بستن ساعت واقعی" : "ساعت واقعی این جلسه"}
      </Button>
      {open ? (
        <div className="mt-2 max-w-sm">
          <DurationFields minutes={minutes} onChange={setMinutes} />
          <p className="mt-1 text-xs leading-6 text-muted">{formatSitting(minutes) || "ساعت و دقیقه را بنویس."} ساعت شروع همان می‌ماند و به مشتری پیام نمی‌رود.</p>
          <Button className="mt-2" size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? "در حال ذخیره…" : "ذخیره ساعت واقعی"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function jobFileKey(job: { customerName: string; customerPhone: string; customerPhone2?: string }) {
  const primary = (job.customerPhone || "").replace(/\D/g, "");
  const second = (job.customerPhone2 || "").replace(/\D/g, "");
  const digits = primary && primary !== "09000000000" ? primary : second;
  if (digits) return digits.length > 10 ? `0${digits.slice(-10)}` : digits;
  return `name:${job.customerName.replace(/\s+/g, " ").trim()}`;
}

function briefToCustomerFile(file: CustomerFileBrief | null): CustomerFile {
  return {
    skinTone: file?.skinTone || "",
    inkHold: file?.inkHold || "",
    fade: file?.fade || "",
    alcohol: file?.alcohol || "",
    sleepNote: file?.sleepNote || "",
    arrival: file?.arrival || "",
    pain: file?.pain || "",
    healing: file?.healing || "",
    inflammation: file?.inflammation || "",
    notes: file?.notes || "",
    numbing: file?.numbing || "",
    bleeding: file?.bleeding || "",
    sensitivity: file?.sensitivity || "",
    bloodType: file?.bloodType || "",
    toleranceHours: file?.toleranceHours || "",
    hydration: file?.hydration || "",
    healedImage: "",
    hasHealedImage: false,
  };
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-border">
      <button type="button" className="flex h-11 w-full items-center justify-between px-3 text-right text-sm font-semibold" onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <span className="text-xs text-muted">{open ? "بستن" : "باز کردن"}</span>
      </button>
      {open ? <div className="border-t border-border px-3 py-3">{children}</div> : null}
    </div>
  );
}

function MonthJobCard({
  job,
  busyKeys,
  bookings,
  peers = [],
  onChange,
  file,
  canEnroll = false,
}: {
  job: TattooRequest & { customerFile?: CustomerFileBrief | null };
  busyKeys: string[];
  bookings: Booking[];
  peers?: TattooRequest[];
  onChange: () => void;
  file: CustomerFileBrief | null;
  canEnroll?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
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
  const [consentImage, setConsentImage] = useState<string | undefined>(undefined);
  const [shotQuotes, setShotQuotes] = useState<{ price: string; sizeCm: string }[]>(
    (job.referenceImages ?? []).map((_, index) => ({
      price: job.designQuotes?.[index]?.priceToman ? String(job.designQuotes[index].priceToman) : "",
      sizeCm: job.designQuotes?.[index]?.sizeCm || "",
    })),
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveDay, setMoveDay] = useState(tehranDateInput(job.proposedSlotStart));
  const [moveTime, setMoveTime] = useState(tehranTimeInput(job.proposedSlotStart));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [details, setDetails] = useState(false);
  const balance = tattooBalance(job.priceMinToman, job.paidToman);
  const linked = bookings.find((booking) => booking.id === job.bookingId && booking.kind === "booking" && booking.status !== "cancelled");
  const when = linked?.slotStart || job.proposedSlotStart || job.updatedAt;
  const visit = jobVisitStatus(job, bookings, when);
  const phone = job.customerPhone && job.customerPhone !== "09000000000" ? job.customerPhone : "";
  const phone2 = job.customerPhone2 || "";
  const unreliable = isUnreliableCustomer((job.customerFile ?? file)?.arrival) || bookings.some((booking) => booking.id === job.bookingId && (booking.status === "no_show" || booking.unreliable));
  const missedVisit = bookings.some((booking) => booking.id === job.bookingId && booking.status === "no_show");

  async function copyToWaitlist() {
    setBusy(true);
    try {
      const saved = await saveAction<{ already?: boolean }>("copyStudioJobToFillIn", { id: job.id });
      toast.success(saved?.already ? "این مشتری همین حالا در لیست انتظار هست. نوبت دست نخورده." : "یک نسخه در لیست انتظار نشست. نوبت سر جایش ماند.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function markMissed() {
    setBusy(true);
    try {
      await saveAction("markStudioNoShow", { id: job.id });
      toast.success("ثبت شد. از این به بعد جلوی اسمش می‌ماند: مشتری بدقول");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

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
        ...(images.length
          ? {
              referenceImages: images,
              designQuotes: shotQuotes.map((quote) => ({
                priceToman: quote.price ? Number(String(quote.price).replace(/[^\d]/g, "")) : 0,
                sizeCm: quote.sizeCm.trim(),
              })),
            }
          : {}),
        ...(consentImage !== undefined ? { consentImage } : {}),
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
    const toman = Number(digitsOnly(amount));
    if (!toman) return toast.error("مبلغ واریز را بنویسید.");
    setBusy(true);
    try {
      const saved = await saveAction<TattooRequest>("addStudioPayment", {
        requestId: job.id,
        amountToman: toman,
        note: note.trim() || "واریز بعدی",
      });
      const next = tattooBalance(saved.priceMinToman ?? job.priceMinToman, saved.paidToman);
      toast.success(`واریز ثبت شد. مجموع ${formatTattooToman(next.paid)} و مانده ${formatTattooToman(next.remaining)}.`);
      setAmount("");
      setNote("");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function moveJob() {
    if (!moveDay || !moveTime) return toast.error("تاریخ و ساعت جدید را انتخاب کن.");
    const partner = swapPartners.length === 1 ? swapPartners[0] : null;
    if (partner) {
      await swapJob(partner.id, partner.customerName || "این مشتری");
      return;
    }
    const [y, m, d] = moveDay.split("-").map(Number);
    const [hh, mm] = moveTime.split(":").map(Number);
    setBusy(true);
    try {
      const saved = await saveAction<{ rightName?: string }>("updateStudioJob", {
        id: job.id,
        slotStart: tehranLocalToIso(y, m, d, hh, mm),
        sessionMinutes: job.sessionMinutes ?? undefined,
        exchangeDay: true,
      });
      toast.success(
        saved?.rightName
          ? `روز ${job.customerName} با ${saved.rightName} عوض شد. مشخصات هر کدام سر جایش ماند.`
          : "منتقل شد. روز قبلی در تقویم و لیست خالی شد.",
      );
      setMoving(false);
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function swapJob(otherBookingId: string, otherName: string) {
    setBusy(true);
    try {
      await saveAction("swapStudioJobs", { id: job.id, otherBookingId });
      toast.success(`روز ${job.customerName} با ${otherName} عوض شد. ساعت هر کدام سر جای خودش ماند.`);
      setMoving(false);
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const swapPartners = (() => {
    const rows = new Map<string, { id: string; customerName: string }>();
    for (const booking of bookings) {
      if (booking.kind !== "booking" || booking.status === "cancelled" || booking.id === job.bookingId) continue;
      if (tehranDayKey(new Date(booking.slotStart)) !== moveDay) continue;
      rows.set(booking.id, { id: booking.id, customerName: booking.customerName || "این مشتری" });
    }
    for (const peer of peers) {
      if (peer.id === job.id || !peer.bookingId || !peer.proposedSlotStart) continue;
      if (tehranDayKey(new Date(peer.proposedSlotStart)) !== moveDay) continue;
      if (!rows.has(peer.bookingId)) rows.set(peer.bookingId, { id: peer.bookingId, customerName: peer.customerName });
    }
    return [...rows.values()];
  })();

  async function removeJob() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await saveAction("cancelStudioJob", { id: job.id });
      toast.success("این نوبت حذف شد و روز در تقویم خالی شد.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">
            <Badge tone={visit.tone}>{visit.label}</Badge>
            {unreliable ? <UnreliableBadge /> : null}
            <span>{job.customerName}</span>
          </h3>
          <p className="mt-1 text-sm">{formatFaDateTime(when)}</p>
          <p className="mt-1 text-sm text-muted">
            {job.style}
            {job.placement ? ` · ${job.placement}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#e8f6ee] px-3 py-2">
              <p className="text-xs text-[#1f8a4c]">واریزی</p>
              <p className="font-bold text-[#1f8a4c]">{formatTattooToman(balance.paid)}</p>
            </div>
            <div className={`rounded-2xl px-3 py-2 ${balance.settled ? "bg-slate-100" : "bg-[#fde8e8]"}`}>
              <p className={`text-xs ${balance.settled ? "text-muted" : "text-[#eb5757]"}`}>مانده</p>
              <p className={`font-bold ${balance.settled ? "" : "text-[#eb5757]"}`}>{balance.settled ? "تسویه" : formatTattooToman(balance.remaining)}</p>
            </div>
          </div>
          {job.hasConsentImage ? <p className="mt-2 text-xs font-semibold text-accent">رضایت‌نامه ذخیره شده</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => { setMoving((value) => !value); setConfirmDelete(false); }}>
          {moving ? "بستن انتقال" : "انتقال به روز دیگر"}
        </Button>
        {missedVisit ? null : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void markMissed()}>
            مشتری نیامد
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setDetails((value) => !value)}>
          {details ? "بستن جزئیات" : "جزئیات بیشتر"}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void copyToWaitlist()}>
          کپی در لیست انتظار
        </Button>
      </div>
      {moving ? (
        <div className="mt-3 grid gap-3 rounded-2xl border border-border p-3">
          <p className="text-xs leading-6 text-muted">
            {swapPartners.length
              ? `اگر ذخیره را بزنی، فقط روز ${job.customerName} با ${swapPartners.map((partner) => partner.customerName).join(" و ")} عوض می‌شود. طرح، عکس و واریزی هر کدام سر جایش می‌ماند.`
              : "اگر این روز خالی باشد فقط همین مشتری منتقل می‌شود. اگر مشتری دیگری همان ساعت را داشته باشد، روزشان با هم عوض می‌شود و مشخصات قاطی نمی‌شود."}
          </p>
          <Field label="تاریخ جدید">
            <JalaliDatePicker value={moveDay} onChange={setMoveDay} label="انتخاب روز" busyKeys={busyKeys} />
          </Field>
          <Field label="ساعت شروع">
            <Input type="time" value={moveTime} onChange={(e) => setMoveTime(e.target.value)} />
          </Field>
          <Button size="sm" disabled={busy} onClick={() => void moveJob()}>
            {busy
              ? "در حال جابه‌جایی…"
              : swapPartners.length === 1
                ? `جابه‌جایی روز با ${swapPartners[0]?.customerName}`
                : "ذخیره در روز جدید"}
          </Button>
        </div>
      ) : null}
      {details ? (
      <>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className={confirmDelete ? "border-destructive text-destructive" : ""}
          onClick={() => void removeJob()}
        >
          {confirmDelete ? "مطمئنی؟ این روز حذف شود" : "حذف این نوبت"}
        </Button>
        {canEnroll && phone ? (
          <Button size="sm" variant="outline" onClick={() => enrollReferrer(job.customerName, phone)}>
            عضو باشگاه معرفین
          </Button>
        ) : null}
      </div>
      <Fold title="امضای رضایت‌نامه">
        <ConsentSignature
          sheet={consentImage || ""}
          loadSheet={
            consentImage === undefined && job.hasConsentImage
              ? async () => {
                  const row = await saveAction<{ consentImage?: string }>("studioRequestImages", { id: job.id });
                  return row.consentImage || "";
                }
              : undefined
          }
          busy={busy}
          onPick={(url) => {
            setBusy(true);
            void saveAction("updateStudioJob", { id: job.id, consentImage: url })
              .then(() => {
                toast.success("امضا داخل کادر برگه نشست. متن برگه سر جایش ماند.");
                onChange();
              })
              .catch((err) => toast.error(friendlyError(err)))
              .finally(() => setBusy(false));
          }}
        />
        <StoredConsent request={job} />
      </Fold>
      <Fold title="مشخصات">
        <ReplySeen request={job} />
        {job.sessionMinutes ? <p className="text-sm">مدت ثبت‌شده: {formatSitting(job.sessionMinutes)}</p> : null}
        <RealDurationFix job={job} onChange={onChange} />
        {job.artistMessage === "جلسه دوم" ? <p className="mt-1 text-xs font-semibold text-accent">جلسه دوم · مشخصات از جلسه قبل</p> : null}
        {job.isContinuation ? (
          <p className="mt-1 text-xs font-semibold text-accent">
            ادامه کار · {balance.remaining > 0 ? `مانده ${formatTattooToman(balance.remaining)}` : "قبلاً تسویه شده"}
          </p>
        ) : null}
        {job.carryClosed ? <p className="mt-1 text-xs font-semibold text-accent">مانده این کار به نوبت ادامه منتقل شده</p> : null}
        {phone ? (
          <a className="mt-2 inline-block text-sm font-semibold text-accent" href={`tel:${phone}`} dir="ltr">
            {phone}
          </a>
        ) : null}
        {phone2 ? (
          <a className="mt-1 mr-3 inline-block text-sm text-accent" href={`tel:${phone2}`}>
            دوم: {phone2}
          </a>
        ) : null}
        {job.customerInstagram ? <InstagramChip handle={job.customerInstagram} /> : null}
        {job.sizeCm ? <p className="mt-2 text-sm">اندازه: {job.sizeCm}</p> : null}
        {job.idea ? <p className="mt-1 text-sm leading-7">{job.idea}</p> : null}
        <StoredDesigns request={job} />
        {(job.designQuotes ?? []).some((quote) => quote.priceToman || quote.sizeCm) ? (
          <div className="mt-2 grid gap-1">
            {(job.designQuotes ?? []).map((quote, index) => {
              if (!quote?.priceToman && !quote?.sizeCm) return null;
              return (
                <p key={index} className="text-sm">
                  طرح {index + 1}
                  {quote.sizeCm ? ` · اندازه ${quote.sizeCm}` : ""}
                  {quote.priceToman ? ` · قیمت ${formatTattooToman(quote.priceToman)}` : ""}
                </p>
              );
            })}
          </div>
        ) : null}
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing((value) => !value);
              if (!images.length && (job.imageCount ?? 0) > 0) {
                void saveAction<{ referenceImages: string[] }>("studioRequestImages", { id: job.id })
                  .then((row) => {
                    const next = row.referenceImages ?? [];
                    if (!next.length) return;
                    setImages(next);
                    setShotQuotes(
                      next.map((_, index) => ({
                        price: job.designQuotes?.[index]?.priceToman ? String(job.designQuotes[index].priceToman) : "",
                        sizeCm: job.designQuotes?.[index]?.sizeCm || "",
                      })),
                    );
                  })
                  .catch((err) => toast.error(friendlyError(err)));
              }
            }}
          >
            {editing ? "بستن ویرایش" : "ویرایش طرح و محل اجرا"}
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
              <NumberField label="مبلغ کل" hint="تومان" value={price} onChange={setPrice} money />
              <Field label="توضیح طرح">
                <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} />
              </Field>
            </div>
            <DesignThumbs
              images={images}
              filePrefix={`${name}-${style}`}
              onFiles={(urls) => {
                setImages((current) => [...current, ...urls].slice(0, 3));
                setShotQuotes((current) => [...current, ...urls.map(() => ({ price: "", sizeCm: "" }))].slice(0, 3));
              }}
              onRemove={(index) => {
                setImages((current) => current.filter((_, i) => i !== index));
                setShotQuotes((current) => current.filter((_, i) => i !== index));
              }}
            />
            {images.map((src, index) => (
              <div key={`${src.slice(-16)}-${index}`} className="mt-2 grid gap-2 rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">طرح {index + 1}</p>
                <Input
                  value={shotQuotes[index]?.sizeCm || ""}
                  onChange={(e) => setShotQuotes((current) => current.map((item, i) => (i === index ? { ...item, sizeCm: e.target.value } : item)))}
                  placeholder="اندازه این طرح"
                />
                <Input
                  value={formatGroupedDigits(shotQuotes[index]?.price || "")}
                  onChange={(e) => setShotQuotes((current) => current.map((item, i) => (i === index ? { ...item, price: digitsOnly(e.target.value) } : item)))}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="قیمت گفته‌شده"
                />
              </div>
            ))}
            <p className="mt-3 text-sm font-medium">رضایت‌نامه، اختیاری</p>
            <p className="mt-1 text-xs text-muted">برای ذخیره نوبت لازم نیست. اگر برگه تازه بگذاری، قبلی عوض می‌شود.</p>
            <DesignThumbs
              images={consentImage ? [consentImage] : []}
              filePrefix={`${name}-rezayat`}
              max={1}
              uploadLabel="آپلود رضایت‌نامه"
              kindLabel="رضایت‌نامه"
              onFiles={(urls) => setConsentImage(urls[0] || "")}
              onRemove={() => setConsentImage("")}
            />
            {job.hasConsentImage && consentImage === undefined ? (
              <Button className="mt-2" type="button" variant="outline" size="sm" onClick={() => setConsentImage("")}>
                حذف رضایت‌نامه ذخیره‌شده
              </Button>
            ) : null}
            <Button className="mt-3" disabled={busy} onClick={() => void save()}>
              ذخیره تغییرات
            </Button>
          </div>
        ) : null}
      </Fold>
      <Fold title="پرونده">
        <CustomerFileDetails file={job.customerFile ?? file} showEmpty editing={fileOpen} onEdit={() => setFileOpen((value) => !value)} />
        {fileOpen ? (
          <CustomerFileForm
            contactKey={jobFileKey(job)}
            file={briefToCustomerFile(job.customerFile ?? file)}
            onSaved={() => {
              setFileOpen(false);
              onChange();
            }}
          />
        ) : null}
      </Fold>
      <Fold title="پیامک">
        <BookingSmsActions request={job} />
      </Fold>
      <Fold title="واریزی">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
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
            <dd className={`mt-1 font-semibold ${balance.remaining > 0 ? "text-destructive" : ""}`}>{formatTattooToman(balance.remaining)}</dd>
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
        <div className="mt-3 rounded-2xl border border-border bg-bg p-3">
          <p className="text-sm font-semibold">ثبت واریز بعدی</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="مبلغ واریز" hint="تومان" value={amount} onChange={setAmount} money />
            <Field label="یادداشت">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً واریز دوم" />
            </Field>
          </div>
          <Button className="mt-3" variant="outline" disabled={busy} onClick={() => void addPayment()}>
            افزودن به مجموع واریزی
          </Button>
        </div>
      </Fold>
      <Fold title="زمان و جلسه بعد">
        <BookedSlotActions request={job} busyKeys={busyKeys} onChange={onChange} showSms={false} />
      </Fold>
      </>
      ) : null}
    </article>
  );
}

