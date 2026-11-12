import { pocketAmountDigits } from "@/lib/pocket/numbers";
import { currentBackup, commitBackup, mergeById } from "@/lib/pocket/backup";
import { PocketPhotoPicker } from "./photo-picker";
import { PocketBackupPanel } from "./backup-panel";
import { PocketLicenseCard, usePocketLicense } from "./license-panel";
import { assertCanMutate, isLicenseLockedError } from "@/lib/pocket/license-gate";
import { readCustomFieldTemplate, saveCustomFieldTemplate } from "@/lib/pocket/custom-fields";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Coins, Download, GraduationCap, Settings2 } from "lucide-react";
import { PocketCashPanel } from "@/components/pocket/cash-panel";
import { PocketOnboarding } from "@/components/pocket/onboarding";
import { PocketTraineesPanel } from "@/components/pocket/trainees-panel";
import { PocketStatsPanel } from "@/components/pocket/stats-panel";
import "./pocket.css";
import "./pocket-theme.css";
import {
  JALALI_MONTHS,
  gregorianToJalali,
  jalaliMonthGrid,
  jalaliMonthLength,
  shiftJalaliMonth,
  toFaDigits,
} from "@/lib/calendar/jalali";
import {
  applyDownload,
  listPocketBookings,
  newPocketId,
  savePocketBookings,
  type PocketBooking,
  type PocketCustomField,
} from "@/lib/pocket-book";
import {
  getProfessionPack,
  packText,
  type BookingField,
  type PocketLocale,
  type ProfessionPack,
} from "@/lib/pocket/professions";
import {
  completeOnboarding,
  readPocketSettings,
  type PocketSettings,
  writePocketSettings,
} from "@/lib/pocket/settings";
import { readAccountEmail, writeAccountEmail } from "@/lib/pocket/device";
import {
  flushTelemetryQueue,
  queueCurrentMonthRevenue,
  queueInstallTelemetry,
} from "@/lib/pocket/telemetry";
import { PocketBookingActions } from "./booking-actions";
import { applyServerClub } from "@/lib/pocket/referral-club";
import { ReferralClubPanel } from "./referral-club-panel";
import { applyServerFinance, listCashEntries, type CashEntry } from "@/lib/pocket/cash-box";
import { bookingTotals, newPaymentId, parsePaymentToman, recordBookingPayment } from "@/lib/pocket/booking-payments";
import type { PocketAppStats, PocketServerAccount } from "@/lib/pocket/sync-response";
import { canRequestServerSync } from "@/lib/pocket/professions";
import { friendlyError } from "@/lib/save";
import { OFFLINE_MESSAGE, deviceOffline, downloadPocketSnapshot, openPocketLogin, verifyPocketAccess } from "@/lib/pocket/sync";
import { WEEK_EN_SUN, formatGregorian, gregorianMonthGrid, gregorianOfKey, shiftGregorianMonth } from "@/lib/pocket/gregorian";

import { pocketAccessMessage, type PocketAccessState } from "@/lib/pocket/access-status";

const WEEK = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;
const WEEK_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;
const WEEK_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const JALALI_MONTHS_EN = ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"] as const;

type Draft = {
  id: string;
  /** Id reserved for a NEW booking on its first save attempt (dedupes retries / double taps). */
  newId?: string;
  name: string;
  phone: string;
  style: string;
  placement: string;
  time: string;
  note: string;
  price: string;
  size: string;
  photo: string;
  details: Record<string, string>;
  customFields: PocketCustomField[];
  fieldSchema?: BookingField[];
  professionId?: string;
};

type PocketTab = "calendar" | "cash" | "trainees" | "stats" | "backup";

function emptyDraft(): Draft {
  return {
    id: "",
    name: "",
    phone: "",
    style: "",
    placement: "",
    time: "",
    note: "",
    price: "",
    size: "",
    photo: "",
    details: {},
    customFields: [],
  };
}

function tehranYmd(date = new Date()) {
  const shifted = new Date(date.getTime() + 3.5 * 60 * 60 * 1000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

function tomanText(value: number | undefined, locale: PocketLocale) {
  const amount = Math.round(Number(value) || 0);
  if (!amount) return "";
  const formatted = new Intl.NumberFormat("en-US").format(amount);
  const digits = locale === "en" ? formatted : toFaDigits(formatted);
  return locale === "en" ? `${digits} toman` : `${digits} تومان`;
}

function dayKey(jy: number, jm: number, jd: number) {
  return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
}

function jalaliKey(cell: { jy: number; jm: number; jd: number }) {
  return dayKey(cell.jy, cell.jm, cell.jd);
}

function draftFromRow(row: PocketBooking): Draft {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    style: row.style,
    placement: row.placement,
    time: row.time,
    note: row.note,
    price: row.priceToman ? String(row.priceToman) : "",
    size: row.sizeCm || "",
    photo: row.photo || "",
    details: row.details || {},
    customFields: row.customFields || [],
    fieldSchema: row.fieldSchema,
    professionId: row.professionId,
  };
}

function fieldValue(draft: Draft, field: BookingField) {
  switch (field.storeAs) {
    case "details":
      return draft.details[field.id] || "";
    case "name":
      return draft.name;
    case "phone":
      return draft.phone;
    case "style":
      return draft.style;
    case "placement":
      return draft.placement;
    case "time":
      return draft.time;
    case "sizeCm":
      return draft.size;
    case "priceToman":
      return draft.price;
    case "photo":
      return draft.photo;
    case "note":
      return draft.note;
    default:
      return "";
  }
}

function setFieldValue(draft: Draft, field: BookingField, value: string): Draft {
  switch (field.storeAs) {
    case "details":
      return { ...draft, details: { ...draft.details, [field.id]: value } };
    case "name":
      return { ...draft, name: value };
    case "phone":
      return { ...draft, phone: value };
    case "style":
      return { ...draft, style: value };
    case "placement":
      return { ...draft, placement: value };
    case "time":
      return { ...draft, time: value };
    case "sizeCm":
      return { ...draft, size: value };
    case "priceToman":
      return { ...draft, price: pocketAmountDigits(value) };
    case "photo":
      return { ...draft, photo: value };
    case "note":
      return { ...draft, note: value };
    default:
      return draft;
  }
}

export function PocketApp() {
  const [settings, setSettings] = useState<PocketSettings | null>(null);
  const [tab, setTab] = useState<PocketTab>("calendar");
  const clock = tehranYmd();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.d);
  const todayKey = dayKey(todayJ.jy, todayJ.jm, todayJ.jd);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  // English UI shows a Gregorian month; bookings still use the Jalali day key.
  const [gMonth, setGMonth] = useState({ gy: clock.y, gm: clock.m });
  const [selected, setSelected] = useState(todayKey);
  const [rows, setRows] = useState<PocketBooking[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    setSettings(readPocketSettings());
  }, []);

  useEffect(() => {
    void listPocketBookings()
      .then(setRows)
      .catch(() => toast.error("حافظهٔ گوشی باز نشد."))
      .finally(() => setReady(true));
    if ("serviceWorker" in navigator && window.location.pathname.startsWith("/studio/pocket")) {
      void navigator.serviceWorker
        .register("/studio/pocket-sw.js", { scope: "/studio/pocket" })
        .catch(() => undefined);
    }
  }, []);

  if (!settings) {
    return <main className="pocket-app" dir="rtl" aria-busy="true" />;
  }

  if (!settings.onboarded) {
    return (
      <PocketOnboarding
        onDone={(locale, professionId) => {
          const next = completeOnboarding(locale, professionId);
          setSettings(next);
          toast.success(locale === "en" ? "Ready." : "آماده شد.");
        }}
      />
    );
  }

  const locale = settings.locale;
  const pack = getProfessionPack(settings.professionId);
  const showServerDownload = canRequestServerSync(settings.professionId);
  const accountEmail = readAccountEmail();
  if (!accountEmail) {
    return (
      <PocketEmailGate
        locale={locale}
        onDone={(email) => {
          writeAccountEmail(email);
          queueInstallTelemetry();
          void flushTelemetryQueue();
          window.location.reload();
        }}
      />
    );
  }

  return (
    <PocketShell
      accountEmail={accountEmail}
      locale={locale}
      pack={pack}
      tab={tab}
      setTab={setTab}
      settings={settings}
      setSettings={setSettings}
      todayKey={todayKey}
      todayJ={todayJ}
      month={month}
      setMonth={setMonth}
      gMonth={gMonth}
      setGMonth={setGMonth}
      selected={selected}
      setSelected={setSelected}
      rows={rows}
      setRows={setRows}
      ready={ready}
      draft={draft}
      setDraft={setDraft}
      movingId={movingId}
      setMovingId={setMovingId}
      downloading={downloading}
      setDownloading={setDownloading}
      banner={banner}
      setBanner={setBanner}
      showServerDownload={showServerDownload}
    />
  );
}

function PocketEmailGate({
  locale,
  onDone,
}: {
  locale: PocketLocale;
  onDone: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  return (
    <main className="pocket-app pocket-onboard" dir={locale === "en" ? "ltr" : "rtl"}>
      <div className="pocket-shell">
        <div className="pocket-card" style={{ padding: "1.25rem" }}>
          <h1 className="pocket-title">
            {locale === "en" ? "Offline email (not website login)" : "ایمیل آفلاین (ورود به سایت نیست)"}
          </h1>
          <p className="pocket-muted" style={{ marginTop: "0.55rem" }}>
            {locale === "en"
              ? "This only labels your offline data; it does not sign you in. For website features, use Secure owner sign-in in the calendar and enter your website email and password."
              : "این ایمیل فقط شناسهٔ داده‌های آفلاین است و شما را وارد سایت نمی‌کند. برای امکانات سایت، در تقویم «ورود امن به حساب مالک» را بزنید و با ایمیل و رمز سایت وارد شوید."}
          </p>
          <input
            className="pocket-field"
            style={{ marginTop: "1rem" }}
            dir="ltr"
            inputMode="email"
            placeholder="name@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            className="pocket-btn pocket-btn-primary"
            style={{ width: "100%", marginTop: "0.85rem" }}
            onClick={() => {
              const clean = email.trim().toLowerCase();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
                toast.error(locale === "en" ? "Enter a valid email." : "ایمیل معتبر بنویس.");
                return;
              }
              onDone(clean);
            }}
          >
            {locale === "en" ? "Continue" : "ادامه"}
          </button>
        </div>
      </div>
    </main>
  );
}

function PocketShell(props: {
  locale: PocketLocale;
  pack: ProfessionPack;
  accountEmail: string;
  tab: PocketTab;
  setTab: (tab: PocketTab) => void;
  settings: PocketSettings;
  setSettings: (next: PocketSettings) => void;
  todayKey: string;
  todayJ: { jy: number; jm: number; jd: number };
  month: { jy: number; jm: number };
  setMonth: Dispatch<SetStateAction<{ jy: number; jm: number }>>;
  gMonth: { gy: number; gm: number };
  setGMonth: Dispatch<SetStateAction<{ gy: number; gm: number }>>;
  selected: string;
  setSelected: (key: string) => void;
  rows: PocketBooking[];
  setRows: Dispatch<SetStateAction<PocketBooking[]>>;
  ready: boolean;
  draft: Draft | null;
  setDraft: Dispatch<SetStateAction<Draft | null>>;
  movingId: string | null;
  setMovingId: Dispatch<SetStateAction<string | null>>;
  downloading: boolean;
  setDownloading: Dispatch<SetStateAction<boolean>>;
  banner: string;
  setBanner: Dispatch<SetStateAction<string>>;
  showServerDownload: boolean;
}) {
  const {
    locale,
    pack,
    accountEmail,
    tab,
    setTab,
    settings,
    setSettings,
    todayKey,
    todayJ,
    month,
    setMonth,
    gMonth,
    setGMonth,
    selected,
    setSelected,
    rows,
    setRows,
    ready,
    draft,
    setDraft,
    movingId,
    setMovingId,
    downloading,
    setDownloading,
    banner,
    setBanner,
    showServerDownload,
  } = props;

  // 1.15.2: per-booking «ثبت واریز» rows live in the cash box; re-read whenever the calendar is shown or rows change.
  const [cashRows, setCashRows] = useState<CashEntry[]>([]);
  const reloadCash = useCallback(() => listCashEntries().then(setCashRows).catch(() => undefined), []);
  useEffect(() => {
    if (tab === "calendar") void reloadCash();
  }, [tab, rows, reloadCash]);

  useEffect(() => {
    queueInstallTelemetry();
    void queueCurrentMonthRevenue()
      .then(() => flushTelemetryQueue())
      .catch(() => undefined);
  }, [accountEmail]);

  const license = usePocketLicense();
  const [templateEnabled, setTemplateEnabled] = useState(false);
  const [traineeRevision, setTraineeRevision] = useState(0);
  const [cashRevision, setCashRevision] = useState(0);
  const [clubRevision, setClubRevision] = useState(0);
  const [cashStatus, setCashStatus] = useState("");
  // Owner-only UI is driven ONLY by a server response in this session (memory, never persisted).
  // Starts hidden; typed offline email, cached data or settings can never grant it.
  const [access, setAccess] = useState<{ account: PocketServerAccount | null; appStats: PocketAppStats | null } | null>(null);
  const ownerVerified = access?.account?.isOwner === true;
  const canViewStats = ownerVerified && access?.account?.canViewAppStats === true;

  const [accessState, setAccessState] = useState<PocketAccessState>("checking");
  const accessRequest = useRef(0);
  const lastAccessCheck = useRef(0);
  const refreshAccount = useCallback(async (force = true) => {
    // focus + visibilitychange + resume fire together on Android: one server probe, not three.
    const now = Date.now();
    if (!force && now - lastAccessCheck.current < 4000) return;
    lastAccessCheck.current = now;
    const request = ++accessRequest.current;
    setAccess(null); // Fail closed even while re-checking a previously authorized account.
    setAccessState("checking");
    const result = await verifyPocketAccess();
    if (request === accessRequest.current) {
      setAccess(result);
      setAccessState(result.state);
    }
  }, []);
  useEffect(() => {
    if (!showServerDownload) { setAccess(null); return; }
    void refreshAccount();
    const resume = () => { if (document.visibilityState !== "hidden") void refreshAccount(false); };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("pocket-account-refresh", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      ++accessRequest.current;
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pocket-account-refresh", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [showServerDownload, refreshAccount]);

  // A site session the server confirmed as the owner needs no activation code: request the
  // owner's self license automatically (once per app session). The server re-checks the session.
  const ownerAutoTried = useRef(false);
  useEffect(() => {
    if (!ownerVerified || !license.enforced || !license.checked || license.busy) return;
    if (license.state.status === "valid" || ownerAutoTried.current) return;
    ownerAutoTried.current = true;
    void license.ownerSelf(true);
  }, [ownerVerified, license]);

  useEffect(() => {
    if (tab === "stats" && !canViewStats) setTab("calendar");
  }, [tab, canViewStats, setTab]);

  async function persist(next: PocketBooking[]) {
    await savePocketBookings(next);
    setRows(next);
  }

  function storageError(error: unknown) {
    return isLicenseLockedError(error)
      ? error.message
      : locale === "en"
        ? "Not saved; phone storage is unavailable. Nothing was changed."
        : "ذخیره نشد؛ حافظهٔ گوشی در دسترس نیست. هیچ تغییری اعمال نشد.";
  }

  const english = locale === "en";
  const cells = useMemo(
    () => (english ? gregorianMonthGrid(gMonth.gy, gMonth.gm) : jalaliMonthGrid(month.jy, month.jm)),
    [english, gMonth.gy, gMonth.gm, month.jy, month.jm],
  );
  /** Show the month that contains a Jalali day key in both calendars. */
  function showMonthOf(key: string) {
    const [jy, jm] = key.split("-").map(Number);
    if (jy && jm && jy < 1700) setMonth({ jy, jm });
    const g = gregorianOfKey(key);
    if (g) setGMonth({ gy: g.gy, gm: g.gm });
  }
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.day, (map.get(row.day) || 0) + 1);
    return map;
  }, [rows]);
  const selectedParts = selected.split("-").map(Number);
  const selectedJd = selectedParts[2] || 1;
  const selectedCell = cells.find((cell) => jalaliKey(cell) === selected);
  const selectedGregorian = selectedCell ? { gy: selectedCell.gy, gm: selectedCell.gm, gd: selectedCell.gd } : gregorianOfKey(selected);
  const weekday =
    locale === "en" ? WEEK_EN[selectedCell?.satIndex ?? 0] : WEEK[selectedCell?.satIndex ?? 0];
  const dayRows = rows.filter((row) => row.day === selected);
  const dir = locale === "en" ? "ltr" : "rtl";

  function openDay(key: string) {
    if (movingId) {
      const current = rows.find((row) => row.id === movingId);
      if (!current) {
        setMovingId(null);
        return;
      }
      setMovingId(null);
      persist(rows.map((row) => (row.id === movingId ? { ...row, day: key, pinned: true } : row)))
        .then(() => {
          setSelected(key);
          showMonthOf(key);
          toast.success(locale === "en" ? "Moved." : "نوبت به این روز منتقل شد.");
        })
        .catch((error) => toast.error(storageError(error)));
      return;
    }
    setSelected(key);
    setDraft(null);
  }

  const saving = useRef(false);
  const [savingDraft, setSavingDraft] = useState(false);
  async function saveDraft() {
    if (!draft || saving.current) return; // a double tap must not store the same booking twice
    const name = draft.name.trim();
    if (name.length < 2) {
      toast.error(locale === "en" ? "Write the name." : `اسم ${pack.customerLabelFa} را بنویس.`);
      return;
    }
    // A new booking gets its id once per open form, so a retry after a failed save updates instead of duplicating.
    const rowId = draft.id || draft.newId || newPocketId();
    if (!draft.id && !draft.newId) setDraft((current) => (current ? { ...current, newId: rowId } : current));
    const nextRow: PocketBooking = {
      id: rowId,
      day: selected,
      name,
      phone: draft.phone.trim(),
      style: draft.style.trim(),
      placement: draft.placement.trim(),
      time: draft.time,
      note: draft.note.trim(),
      priceToman: Number(pocketAmountDigits(draft.price)) || 0,
      sizeCm: draft.size.trim(),
      photo: draft.photo,
      professionId: draft.professionId || pack.id,
      details: draft.details,
      fieldSchema: draft.fieldSchema || pack.fields,
      customFields: draft.customFields
        .filter((f) => f.label.trim())
        .map((f) => ({ ...f, label: f.label.trim() })),
      serverId: rows.find((row) => row.id === draft.id)?.serverId ?? null,
      pinned: true,
    };
    const exists = rows.some((row) => row.id === rowId);
    const next = exists ? rows.map((row) => (row.id === rowId ? nextRow : row)) : [...rows, nextRow];
    saving.current = true;
    setSavingDraft(true);
    try {
      await persist(next);
      if (templateEnabled)
        saveCustomFieldTemplate(draft.professionId || pack.id, nextRow.customFields || []);
      setDraft(null);
      toast.success(locale === "en" ? "Saved." : "نوبت ذخیره شد.");
    } catch (error) {
      toast.error(isLicenseLockedError(error) ? error.message : locale === "en" ? "Not saved; check phone storage. The form is kept." : "ذخیره انجام نشد؛ فضای حافظه و دسترسی مرورگر را بررسی کنید. فرم حفظ شد.");
    } finally {
      saving.current = false;
      setSavingDraft(false);
    }
  }

  function removeRow(id: string) {
    if (
      !window.confirm(
        locale === "en" ? "Delete this appointment?" : "این نوبت از تقویم گوشی حذف شود؟",
      )
    )
      return;
    persist(rows.filter((row) => row.id !== id)).catch((error) => toast.error(storageError(error)));
  }

  const downloadBusy = useRef(false);
  async function download() {
    // One download at a time (calendar, cash and trainee buttons all trigger it).
    if (downloadBusy.current) return;
    if (deviceOffline()) {
      setBanner(OFFLINE_MESSAGE);
      toast.error(OFFLINE_MESSAGE);
      return;
    }
    // Merging server data changes local data: needs a valid license (checked before any network call).
    try {
      assertCanMutate();
    } catch (error) {
      const message = isLicenseLockedError(error) ? error.message : friendlyError(error);
      setBanner(message);
      toast.error(message);
      return;
    }
    downloadBusy.current = true;
    const request = ++accessRequest.current;
    setAccess(null);
    setAccessState("checking");
    setDownloading(true);
    setBanner("");
    setCashStatus(""); // the cash tab must never show the previous load's result as if it were this one
    try {
      const snapshot = await downloadPocketSnapshot();
      if (request === accessRequest.current) {
        setAccess({ account: snapshot.account, appStats: snapshot.appStats });
        setAccessState(snapshot.account?.isOwner ? snapshot.account.canViewAppStats ? "verified" : "owner-activation-required" : snapshot.account ? "not-owner" : "activation-required");
      }
      const incoming = snapshot.bookings;
      // 1) Cash box first and independently: a trainee/booking storage problem must never hide site cash.
      let cashNote = "";
      if (!snapshot.account?.isOwner) {
        cashNote = "صندوق سایت فقط برای حساب صاحب استودیو دریافت می‌شود؛ صندوق گوشی تغییری نکرد.";
      } else if (snapshot.finance.state === "ok") {
        const fin = snapshot.finance;
        try {
          await applyServerFinance(fin.data);
          const income = fin.data.records.filter((r) => r.kind === "income").length;
          const expense = fin.data.records.length - income;
          cashNote = fin.data.records.length
            ? `صندوق سایت دریافت شد: ${toFaDigits(income)} واریزی و ${toFaDigits(expense)} هزینه.` +
              (fin.skipped ? ` ${toFaDigits(fin.skipped)} ردیف نامعتبر کنار گذاشته شد.` : "")
            : "سایت برای این حساب هیچ واریزی یا هزینه‌ای ثبت نکرده است (صفر واقعی سایت).";
        } catch (error) {
          cashNote = isLicenseLockedError(error) ? error.message : "ذخیرهٔ صندوق سایت روی گوشی انجام نشد؛ صندوق قبلی دست نخورده است.";
        }
        setCashRevision((v) => v + 1);
      } else if (snapshot.finance.state === "error") {
        cashNote = `سرور نتوانست صندوق را بفرستد: ${snapshot.finance.message} — صندوق گوشی تغییری نکرد.`;
      } else if (snapshot.finance.state === "invalid") {
        cashNote = "پاسخ مالی سرور معتبر نبود؛ صندوق گوشی تغییری نکرد.";
      } else {
        cashNote = "سرور صندوق را نفرستاد (نسخهٔ سرور قدیمی است)؛ صندوق گوشی تغییری نکرد.";
      }
      setCashStatus(cashNote);
      // 1b) Referral club (owner only, read-only snapshot). Failure never touches the cached club.
      if (snapshot.account?.isOwner && snapshot.referralClub) {
        try {
          applyServerClub(snapshot.referralClub);
          setClubRevision((v) => v + 1);
        } catch (error) {
          toast.error(isLicenseLockedError(error) ? error.message : "ذخیرهٔ باشگاه مشتریان روی گوشی انجام نشد؛ نسخهٔ قبلی حفظ شد.");
        }
      }

      // 2) Bookings + trainees in one atomic local transaction. Merge into what is stored NOW (an edit made
      // while the download was running must not be overwritten by the list captured at tap time).
      const localNow = await listPocketBookings();
      const next = applyDownload(localNow, incoming);
      let traineeNote = "";
      if (snapshot.training) {
        const before = await currentBackup(localNow, settings);
        await commitBackup(
          {
            ...before,
            bookings: next,
            trainees: mergeById(before.trainees, snapshot.training.trainees, true),
            traineePayments: mergeById(before.traineePayments, snapshot.training.traineePayments, true),
          },
          before,
        );
        setRows(next);
        setTraineeRevision((v) => v + 1);
        traineeNote = ` • ${toFaDigits(snapshot.training.trainees.length)} هنرجو و ${toFaDigits(snapshot.training.traineePayments.length)} واریزی هنرجو` +
          (snapshot.trainingSkipped ? ` (${toFaDigits(snapshot.trainingSkipped)} ردیف نامعتبر کنار گذاشته شد)` : "");
      } else {
        await persist(next);
        traineeNote = " • سرور هنرجوها را نفرستاد؛ هنرجوهای گوشی تغییری نکردند.";
      }
      const paidCount = incoming.filter((b) => (b.server?.paidToman || 0) > 0).length;
      setBanner(
        (locale === "en"
          ? `Download done. ${incoming.length} appointments.`
          : `بارگذاری کامل شد: ${toFaDigits(incoming.length)} نوبت (${toFaDigits(paidCount)} با واریزی)`) +
          traineeNote +
          " • " +
          cashNote,
      );
      toast.success(locale === "en" ? "Download complete" : "بارگذاری نوبت‌ها کامل شد");
    } catch (error) {
      if (request === accessRequest.current) void refreshAccount();
      const message = friendlyError(error);
      setBanner(message);
      toast.error(message);
    } finally {
      downloadBusy.current = false;
      setDownloading(false);
    }
  }

  const gregorian = english
    ? selectedCell
      ? `${JALALI_MONTHS_EN[selectedCell.jm - 1]} ${selectedCell.jd}, ${selectedCell.jy} (Solar Hijri)`
      : ""
    : selectedCell
      ? `${selectedCell.gd} / ${selectedCell.gm} / ${selectedCell.gy}`
      : "";
  const monthLabel = english
    ? formatGregorian({ gy: gMonth.gy, gm: gMonth.gm, gd: 1 }, { month: "long", year: "numeric" })
    : `${JALALI_MONTHS[month.jm - 1]} ${toFaDigits(month.jy)}`;

  return (
    <main className="pocket-app" data-section={tab} dir={dir}>
      <div className="pocket-shell">
        <header className="pocket-header">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="pocket-kicker">{packText(pack, locale, "nameFa", "nameEn")}</p>
              <p className="pocket-title"><AccentTitle text={packText(pack, locale, "appTitleFa", "appTitleEn")} /></p>
            </div>
            <button
              type="button"
              className="pocket-chip"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              onClick={() => {
                const next = { ...settings, onboarded: false };
                writePocketSettings(next);
                setSettings(next);
              }}
            >
              <Settings2 size={14} aria-hidden />
              {locale === "en" ? "Language / job" : "زبان / شغل"}
            </button>
          </div>
          {tab === "calendar" ? (
            <nav className="pocket-hero-tiles" aria-label={locale === "en" ? "Sections" : "بخش‌ها"} data-count={canViewStats ? 4 : 3}>
              <button type="button" className="pocket-hero-tile is-cash" onClick={() => setTab("cash")}>
                <Coins size={28} aria-hidden /><span>{packText(pack, locale, "cashLabelFa", "cashLabelEn")}</span>
              </button>
              <button type="button" className="pocket-hero-tile is-calendar" aria-current="page" onClick={() => setTab("calendar")}>
                <CalendarDays size={28} aria-hidden /><span>{packText(pack, locale, "calendarLabelFa", "calendarLabelEn")}</span>
              </button>
              {canViewStats ? (
                <button type="button" className="pocket-hero-tile is-stats" onClick={() => setTab("stats")}>
                  <BarChart3 size={28} aria-hidden /><span>{locale === "en" ? "Stats" : "آمار"}</span>
                </button>
              ) : null}
              <button type="button" className="pocket-hero-tile is-trainees" onClick={() => setTab("trainees")}>
                <GraduationCap size={28} aria-hidden /><span>{packText(pack, locale, "traineesLabelFa", "traineesLabelEn")}</span>
              </button>
            </nav>
          ) : null}
          <nav
            className="pocket-tabs"
            role="tablist"
            style={{ gridTemplateColumns: canViewStats ? "repeat(5, 1fr)" : "repeat(4, 1fr)" }}
          >
            {(
              [
                [
                  "calendar",
                  packText(pack, locale, "calendarLabelFa", "calendarLabelEn"),
                  CalendarDays,
                  "calendar",
                ],
                ["cash", packText(pack, locale, "cashLabelFa", "cashLabelEn"), Coins, "cash"],
                [
                  "trainees",
                  packText(pack, locale, "traineesLabelFa", "traineesLabelEn"),
                  GraduationCap,
                  "trainees",
                ],
                ["backup", locale === "en" ? "Backup" : "پشتیبان", Download, "backup"],
                ...(canViewStats
                  ? [
                      [
                        "stats",
                        locale === "en" ? "App stats" : "آمار اپلیکیشن",
                        BarChart3,
                        "stats",
                      ] as const,
                    ]
                  : []),
              ] as const
            ).map(([id, label, Icon, tone]) => (
              <button
                key={id}
                type="button"
                className="pocket-tab"
                data-tone={tone}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id as PocketTab)}
                style={
                  id === "stats"
                    ? {
                        background: tab === "stats" ? "#0ea5e9" : "#e0f2fe",
                        color: tab === "stats" ? "#fff" : "#0369a1",
                      }
                    : undefined
                }
              >
                <Icon size={16} aria-hidden />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {tab !== "backup" ? <PocketLicenseCard license={license} compact ownerVerified={ownerVerified} onOpenBackup={() => setTab("backup")} /> : null}
        {tab === "backup" ? <PocketLicenseCard license={license} ownerVerified={ownerVerified} /> : null}
        {ready && tab === "backup" ? <ReferralClubPanel revision={clubRevision} onChanged={() => setClubRevision((v) => v + 1)} /> : null}
        {ready && tab === "backup" ? (
          <PocketBackupPanel
            rows={rows}
            settings={settings}
            pack={pack}
            onImported={(next) => {
              setRows(next);
              setTraineeRevision((v) => v + 1);
              setCashRevision((v) => v + 1);
              setDraft(null);
            }}
          />
        ) : null}

        {tab === "cash" ? (
          <section className="pocket-panel">
            <PocketCashPanel
              key={cashRevision}
              locale={locale}
              pack={pack}
              todayKey={todayKey}
              serverStatus={cashStatus}
              onSyncAll={download}
              syncBusy={downloading}
            />
          </section>
        ) : null}

        {tab === "trainees" ? (
          <section className="pocket-panel">
            <PocketTraineesPanel
              key={traineeRevision}
              locale={locale}
              pack={pack}
              todayKey={todayKey}
              ownerVerified={ownerVerified}
              onSyncAll={download}
            />
          </section>
        ) : null}

        {tab === "stats" && canViewStats ? (
          <section className="pocket-panel">
            <PocketStatsPanel
              locale={locale}
              initial={access?.appStats ?? null}
              refresh={async () => {
                const request = ++accessRequest.current;
                const next = await verifyPocketAccess();
                if (request !== accessRequest.current) return null;
                setAccess(next);
                setAccessState(next.state);
                return next.account?.isOwner && next.account.canViewAppStats ? next.appStats : null;
              }}
            />
          </section>
        ) : null}

        {tab === "calendar" ? (
          <>
            <div className="pocket-cal-card">
            <div className="pocket-cal-head flex items-start justify-between gap-3 px-4 pb-2">
              <div>
                <p className="pocket-title">{monthLabel}</p>
                <p className="pocket-muted" style={{ marginTop: "0.25rem" }} dir="ltr">
                  {gregorian}
                </p>
              </div>
              <div className={locale === "en" ? "text-right" : "text-left"}>
                <p className="pocket-weekday">{weekday}</p>
                <p className="pocket-date-badge">
                  {english ? selectedGregorian?.gd ?? "" : toFaDigits(selectedJd)}
                </p>
              </div>
            </div>

            <div className="pocket-month-nav">
              <button
                type="button"
                className="pocket-btn pocket-btn-ghost"
                onClick={() =>
                  english
                    ? setGMonth((item) => shiftGregorianMonth(item.gy, item.gm, -1))
                    : setMonth((item) => shiftJalaliMonth(item.jy, item.jm, -1))
                }
              >
                {locale === "en" ? <ChevronLeft size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
                {locale === "en" ? "Prev" : "ماه قبل"}
              </button>
              <button
                type="button"
                className="pocket-btn pocket-btn-ghost"
                onClick={() => {
                  setMonth({ jy: todayJ.jy, jm: todayJ.jm });
                  showMonthOf(todayKey);
                  setSelected(todayKey);
                }}
              >
                {locale === "en" ? "Today" : "امروز"}
              </button>
              <button
                type="button"
                className="pocket-btn pocket-btn-ghost"
                onClick={() =>
                  english
                    ? setGMonth((item) => shiftGregorianMonth(item.gy, item.gm, 1))
                    : setMonth((item) => shiftJalaliMonth(item.jy, item.jm, 1))
                }
              >
                {locale === "en" ? "Next" : "ماه بعد"}
                {locale === "en" ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
              </button>
            </div>

            <div className="pocket-weekrow grid grid-cols-7 px-2 text-center">
              {(english ? WEEK_EN_SUN : WEEK_SHORT).map((name, index) => (
                <p
                  key={name}
                  className="py-2 text-sm font-bold"
                  style={index === (english ? 5 : 6) ? { color: "var(--pk-friday)" } : { color: "var(--pk-muted)" }}
                >
                  {name}
                </p>
              ))}
            </div>
            <div className="pocket-month-grid grid grid-cols-7 px-2 pb-4">
              {cells.map((cell) => {
                const key = jalaliKey(cell);
                const count = counts.get(key) || 0;
                const active = key === selected;
                const friday = cell.satIndex === 6;
                return (
                  <button
                    key={cell.dayKey}
                    type="button"
                    className={`pocket-day ${cell.inMonth ? "" : "invisible"} ${friday ? "is-friday" : ""}`}
                    aria-pressed={active}
                    aria-current={key === todayKey ? "date" : undefined}
                    onClick={() => cell.inMonth && openDay(key)}
                  >
                    {cell.inMonth ? (english ? cell.gd : toFaDigits(cell.jd)) : ""}
                    {count > 0 && cell.inMonth ? <span className={`dot n${Math.min(count, 3)}`} aria-label={`${count}`} /> : null}
                  </button>
                );
              })}
            </div>

            </div>

            <section className="pocket-panel pocket-day-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900 }}>
                  {english
                    ? selectedGregorian
                      ? formatGregorian(selectedGregorian, { weekday: "short", month: "short", day: "numeric" })
                      : weekday
                    : `${weekday} ${toFaDigits(selectedJd)} ${JALALI_MONTHS[(selectedParts[1] || month.jm) - 1]}`}
                </h2>
                {showServerDownload ? (
                  <button
                    type="button"
                    className="pocket-btn pocket-btn-primary"
                    disabled={downloading}
                    aria-busy={downloading}
                    onClick={() => void download()}
                  >
                    {downloading
                      ? locale === "en"
                        ? "Downloading"
                        : "در حال بارگذاری"
                      : locale === "en"
                        ? "Download appointments"
                        : "دانلود نوبت‌ها"}
                  </button>
                ) : null}
              </div>
              {showServerDownload ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="pocket-btn pocket-btn-ghost"
                    disabled={downloading}
                    onClick={() => {
                      try {
                        ++accessRequest.current;
                        setAccess(null);
                        setAccessState("login-required");
                        openPocketLogin();
                      } catch (error) {
                        setBanner(friendlyError(error));
                      }
                    }}
                  >
                    {locale === "en" ? "Secure owner sign-in" : "ورود امن به حساب مالک"}
                  </button>
                  <button type="button" className="pocket-btn pocket-btn-ghost"
                    data-testid="check-account" disabled={accessState === "checking"}
                    onClick={() => void refreshAccount(true)}>
                    {locale === "en" ? "Check account" : "بررسی حساب"}
                  </button>
                  <p role="status" data-testid="account-status" className="pocket-muted">
                    {pocketAccessMessage(accessState, locale === "en")}
                  </p>
                  {ownerVerified ? (
                    <p className="pocket-owner-badge" data-testid="owner-badge">
                      <CheckCircle2 size={14} aria-hidden /> {locale === "en" ? "Site account verified" : "حساب سایت تأیید شد"}
                      {access?.account?.accountEmail ? ` · ${access.account.accountEmail}` : ""}
                    </p>
                  ) : null}
                  <p className="pocket-muted" style={{ fontSize: "0.78rem" }}>
                    {locale === "en"
                      ? "Website login is separate from your offline email. Sign in here; use Return to app, then Check account if needed."
                      : "ایمیل آفلاین ورود به سایت نیست. ورود امن را بزنید؛ پس از ورود «بررسی حساب / بازگشت به اپ» را بزنید. در صورت نیاز «بررسی حساب» را دوباره بزنید."}
                  </p>
                </div>
              ) : null}
              {banner ? <p className="pocket-banner">{banner}</p> : null}
              {movingId ? (
                <p className="pocket-banner">
                  {locale === "en"
                    ? "Tap the new day on the calendar."
                    : "روز تازه را روی تقویم بزن."}
                </p>
              ) : null}
              <p className="pocket-muted">
                {packText(pack, locale, "offlineHintFa", "offlineHintEn")}
              </p>

              {!ready ? (
                <p className="pocket-muted">
                  {locale === "en" ? "Reading phone storage…" : "در حال خواندن حافظهٔ گوشی…"}
                </p>
              ) : null}
              {ready && !dayRows.length && !draft ? (
                <p className="pocket-muted">{packText(pack, locale, "emptyDayFa", "emptyDayEn")}</p>
              ) : null}

              <ul className="mt-4 grid gap-3">
                {dayRows.map((row) => (
                  <li key={row.id} className="pocket-card pocket-booking-card">
                    <div className="pocket-booking-head">
                      <p className="font-black">{row.name}</p>
                      <span className="pocket-booking-chips">
                        {row.time ? <span className="pocket-chip-time">{locale === "en" ? row.time : toFaDigits(row.time)}</span> : null}
                        {row.style ? <span className="pocket-chip-service">{row.style}</span> : null}
                      </span>
                    </div>
                    <BookingPayment row={row} cash={cashRows} locale={locale} todayKey={todayKey} onSaved={reloadCash} />
                    {row.photo ? (
                      <img
                        src={row.photo}
                        alt=""
                        className="mt-2 h-24 w-24 rounded-xl object-cover"
                      />
                    ) : null}
                    <p className="pocket-muted" style={{ marginTop: "0.35rem" }}>
                      {[
                        row.time,
                        row.style,
                        row.sizeCm
                          ? locale === "en"
                            ? `${row.sizeCm} cm`
                            : `${row.sizeCm} سانتی`
                          : "",
                        row.placement,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {tomanText(row.priceToman, locale) ? (
                        <>
                          {" · "}
                          <span className="pocket-price">{tomanText(row.priceToman, locale)}</span>
                        </>
                      ) : null}
                      {row.phone ? (
                        <>
                          {" · "}
                          <span className="pocket-phone">{row.phone}</span>
                        </>
                      ) : null}
                    </p>
                    {row.customFields?.map((field) => (
                      <p key={field.id} className="pocket-muted">
                        <strong>{field.label}:</strong> {field.value}
                      </p>
                    ))}
                    {Object.entries(row.details || {}).map(([key, value]) =>
                      value ? (
                        <p key={key} className="pocket-muted">
                          <strong>
                            {(row.fieldSchema || pack.fields).find((f) => f.id === key)?.labelFa ||
                              key}
                            :
                          </strong>{" "}
                          {value}
                        </p>
                      ) : null,
                    )}
                    {row.note ? <p className="mt-1 text-sm leading-6">{row.note}</p> : null}
                    <PocketBookingActions row={row} locale={locale} ownerVerified={ownerVerified} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="pocket-btn pocket-btn-ghost"
                        onClick={() => setDraft(draftFromRow(row))}
                      >
                        {locale === "en" ? "Edit" : "ویرایش"}
                      </button>
                      <button
                        type="button"
                        className="pocket-btn pocket-btn-ghost"
                        onClick={() => setMovingId(row.id)}
                      >
                        {locale === "en" ? "Move" : "جابه‌جایی"}
                      </button>
                      <button
                        type="button"
                        className="pocket-btn pocket-btn-danger"
                        onClick={() => removeRow(row.id)}
                      >
                        {locale === "en" ? "Delete" : "حذف"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <AllAppointments rows={rows} todayKey={todayKey} locale={locale} onPick={(day) => {
                showMonthOf(day);
                setSelected(day);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }} />

              {draft ? (
                <form
                  className="mt-4 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveDraft();
                  }}
                >
                  {(draft.fieldSchema || pack.fields).map((field) => {
                    if (field.kind === "textarea") {
                      return (
                        <label key={field.id} className="pocket-booking-label">
                          {locale === "en" ? field.labelEn : field.labelFa}
                          <textarea
                            className="pocket-area"
                            placeholder={
                              locale === "en" ? field.placeholderEn : field.placeholderFa
                            }
                            value={fieldValue(draft, field)}
                            onChange={(event) =>
                              setDraft(setFieldValue(draft, field, event.target.value))
                            }
                          />
                        </label>
                      );
                    }
                    if (field.kind === "file") {
                      return (
                        <div key={field.id}>
                          <p className="font-bold">
                            {locale === "en" ? field.labelEn : field.labelFa}
                          </p>
                          <PocketPhotoPicker
                            value={draft.photo}
                            english={locale === "en"}
                            onChange={(value) =>
                              setDraft((current) =>
                                current ? { ...current, photo: value } : current,
                              )
                            }
                          />
                        </div>
                      );
                    }
                    return (
                      <label key={field.id} className="pocket-booking-label">
                        {locale === "en" ? field.labelEn : field.labelFa}
                        <input
                          className="pocket-field"
                          aria-label={locale === "en" ? field.labelEn : field.labelFa}
                          placeholder={locale === "en" ? field.placeholderEn : field.placeholderFa}
                          type={field.kind === "time" ? "time" : "text"}
                          inputMode={
                            field.kind === "tel"
                              ? "tel"
                              : field.kind === "numeric"
                                ? "numeric"
                                : undefined
                          }
                          dir={field.kind === "tel" || field.kind === "time" ? "ltr" : undefined}
                          value={fieldValue(draft, field)}
                          onChange={(event) =>
                            setDraft(setFieldValue(draft, field, event.target.value))
                          }
                        />
                      </label>
                    );
                  })}
                  <fieldset className="pocket-custom-fields">
                    <legend>
                      {locale === "en" ? "Custom fields" : "کادرهای اختصاصی این نوبت"}
                    </legend>
                    {draft.customFields.map((field, index) => (
                      <div className="pocket-custom-field" key={field.id}>
                        <label>
                          عنوان کادر
                          <input
                            className="pocket-field"
                            aria-label={`عنوان کادر ${index + 1}`}
                            maxLength={120}
                            value={field.label}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                customFields: draft.customFields.map((f) =>
                                  f.id === field.id ? { ...f, label: e.target.value } : f,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          پاسخ
                          <textarea
                            className="pocket-area"
                            aria-label={`پاسخ کادر ${index + 1}`}
                            maxLength={4000}
                            value={field.value}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                customFields: draft.customFields.map((f) =>
                                  f.id === field.id ? { ...f, value: e.target.value } : f,
                                ),
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="pocket-btn pocket-btn-danger"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              customFields: draft.customFields.filter((f) => f.id !== field.id),
                            })
                          }
                        >
                          حذف این کادر
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="pocket-btn pocket-btn-ghost"
                      disabled={draft.customFields.length >= 40}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          customFields: [
                            ...draft.customFields,
                            { id: newPocketId(), label: "", value: "", kind: "text" },
                          ],
                        })
                      }
                    >
                      ＋ افزودن عنوان کادر و پاسخ
                    </button>
                    <label className="pocket-template-choice">
                      <input
                        type="checkbox"
                        checked={templateEnabled}
                        onChange={(e) => setTemplateEnabled(e.target.checked)}
                      />{" "}
                      عنوان کادرها برای نوبت‌های جدید این شغل هم نگه داشته شود
                    </label>
                  </fieldset>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="pocket-btn pocket-btn-primary"
                      style={{ flex: 1 }}
                      disabled={savingDraft}
                      aria-busy={savingDraft}
                    >
                      {locale === "en" ? "Save" : "ذخیره"}
                    </button>
                    <button
                      type="button"
                      className="pocket-btn pocket-btn-ghost"
                      onClick={() => setDraft(null)}
                    >
                      {locale === "en" ? "Close" : "بستن"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="pocket-btn pocket-btn-primary"
                  style={{ width: "100%", marginTop: "1rem" }}
                  onClick={() => {
                    setTemplateEnabled(false);
                    setDraft({
                      ...emptyDraft(),
                      professionId: pack.id,
                      customFields: readCustomFieldTemplate(pack.id),
                    });
                  }}
                >
                  {packText(pack, locale, "addBookingFa", "addBookingEn")}
                </button>
              )}
              {showServerDownload ? (
                <p className="pocket-muted" style={{ fontSize: "0.78rem" }}>
                  {locale === "en"
                    ? "Download pulls booked appointments from the server. Edited or moved local items stay put."
                    : "دانلود، نوبت‌های ثبت‌شده روی سرور را می‌آورد. نوبتی که اینجا ویرایش یا جابه‌جا شده، با دانلود بعدی برنمی‌گردد."}
                </p>
              ) : (
                <p className="pocket-muted" style={{ fontSize: "0.78rem" }}>
                  {locale === "en"
                    ? "This profession stays fully offline. Server download is only for the tattoo studio owner account."
                    : "این شغل کاملاً آفلاین است. دانلود از سرور فقط برای حساب صاحب استودیو تاتو فعال است."}
                </p>
              )}
              <p className="sr-only">{jalaliMonthLength(month.jy, month.jm)}</p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

/** Title with the last word emphasised (e.g. «تقویم نوبت تاتو»). */
function AccentTitle({ text }: { text: string }) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return <>{text}</>;
  const last = parts.pop();
  return <>{parts.join(" ")} <span className="pocket-title-accent">{last}</span></>;
}

/** Read-only list of upcoming appointments from phone storage (real rows only). */
function AllAppointments({ rows, todayKey, locale, onPick }: { rows: PocketBooking[]; todayKey: string; locale: PocketLocale; onPick: (day: string) => void }) {
  const [open, setOpen] = useState(false);
  const upcoming = useMemo(
    () => rows.filter((r) => r.day >= todayKey).sort((a, b) => a.day.localeCompare(b.day) || (a.time || "").localeCompare(b.time || "")),
    [rows, todayKey],
  );
  const fa = locale !== "en";
  return (
    <div className="pocket-all">
      <button type="button" className="pocket-btn pocket-all-toggle" aria-expanded={open} data-testid="all-appointments" onClick={() => setOpen((v) => !v)}>
        {open ? (fa ? "بستن فهرست نوبت‌ها" : "Hide all appointments") : fa ? "مشاهده همه نوبت‌ها" : "See all appointments"}
        {fa ? <ChevronLeft size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
      </button>
      {open ? (
        upcoming.length ? (
          <ul className="pocket-all-list">
            {upcoming.map((r) => {
              const [, m, d] = r.day.split("-").map(Number);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onPick(r.day)}>
                    <span className="pocket-all-date">{fa ? `${toFaDigits(d || 0)} ${JALALI_MONTHS[(m || 1) - 1]}` : (() => { const g = gregorianOfKey(r.day); return g ? formatGregorian(g, { month: "short", day: "numeric", year: "numeric" }) : r.day; })()}</span>
                    <span className="pocket-all-name">{r.name}</span>
                    <span className="pocket-all-meta">{[r.time ? (fa ? toFaDigits(r.time) : r.time) : "", r.style].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pocket-muted">{fa ? "از امروز به بعد نوبتی ثبت نشده است." : "No upcoming appointments."}</p>
        )
      ) : null}
    </div>
  );
}

/** Paid / remaining for one booking plus the «ثبت واریز» CTA (append-only, recorded on this phone). */
function BookingPayment({ row, cash, locale, todayKey, onSaved }: { row: PocketBooking; cash: CashEntry[]; locale: PocketLocale; todayKey: string; onSaved: () => Promise<unknown> | void }) {
  const fa = locale !== "en";
  const t = bookingTotals(row, cash);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // One stable id per opened form: a double tap or a retry after a slow save cannot create a second deposit.
  const draftId = useRef<string>("");
  const parsed = parsePaymentToman(amount);
  function openForm() {
    draftId.current = newPaymentId();
    setAmount("");
    setNote("");
    setError("");
    setOpen(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (parsed === null) {
      setError(fa ? "مبلغ را به عدد صحیح تومان بنویس (بزرگ‌تر از صفر)." : "Enter a whole Toman amount above zero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { saved } = await recordBookingPayment(row, { id: draftId.current, amountToman: parsed, note, day: todayKey });
      await onSaved();
      setOpen(false);
      toast.success(saved ? (fa ? "واریز روی این گوشی ثبت شد." : "Payment saved on this phone.") : fa ? "این واریز قبلاً ثبت شده بود." : "Already saved.");
    } catch (err) {
      setError(isLicenseLockedError(err) ? err.message : fa ? "ذخیره نشد؛ هیچ تغییری اعمال نشد. دوباره امتحان کن." : "Not saved; nothing changed.");
    } finally {
      setBusy(false);
    }
  }
  const money = (v: number) => tomanText(v, locale) || (fa ? "۰ تومان" : "0");
  return (
    <div className="pocket-pay" data-testid="booking-pay">
      {t.price > 0 || t.paid > 0 ? (
        <p className="pocket-muted" data-testid="booking-money" style={{ marginTop: "0.25rem" }}>
          {fa ? "واریزی " : "Paid "}
          <span className="pocket-price" data-testid="booking-paid">{money(t.paid)}</span>
          {" · "}
          {fa ? "مانده " : "Remaining "}
          <span className="pocket-price" data-testid="booking-remaining">{money(t.remaining)}</span>
          {t.price > 0 ? <>{" · "}{fa ? "مبلغ کل " : "Total "}<span className="pocket-price">{money(t.price)}</span></> : null}
          {t.overpaid > 0 ? <span className="pocket-pay-over">{fa ? ` · بیش‌پرداخت ${money(t.overpaid)}` : ` · overpaid ${money(t.overpaid)}`}</span> : null}
        </p>
      ) : null}
      {t.localPaid > 0 ? (
        <p className="pocket-pay-local" data-testid="booking-local-paid">
          {fa ? `از این مبلغ ${money(t.localPaid)} فقط روی این گوشی ثبت شده و در سایت ثبت نشده است.` : `${money(t.localPaid)} recorded on this phone only, not on the site.`}
        </p>
      ) : null}
      {!open ? (
        <button type="button" className="pocket-btn pocket-pay-cta" data-testid="booking-pay-open" onClick={openForm}>
          {fa ? "＋ ثبت واریز" : "+ Add payment"}
        </button>
      ) : (
        <form className="pocket-pay-form" onSubmit={submit} data-testid="booking-pay-form">
          <label>
            {fa ? "مبلغ واریزی جدید (تومان)" : "New payment (Toman)"}
            <input inputMode="numeric" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="booking-pay-amount" aria-invalid={Boolean(error)} />
          </label>
          {parsed !== null ? <p className="pocket-muted">{money(parsed)}</p> : null}
          <label>
            {fa ? "یادداشت (اختیاری)" : "Note (optional)"}
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} data-testid="booking-pay-note" />
          </label>
          {error ? <p role="alert" className="pocket-pay-error">{error}</p> : null}
          <p className="pocket-muted" style={{ fontSize: ".8rem" }}>
            {fa ? "ثبت روی این گوشی: به صندوق گوشی اضافه می‌شود. سایت خودکار به‌روز نمی‌شود؛ اگر در پنل سایت هم ثبت کردی، ردیف گوشی را از صندوق حذف کن تا دوبار حساب نشود." : "Saved on this phone and in its cash box only. The site is not updated."}
          </p>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button type="submit" className="pocket-btn pocket-pay-cta" disabled={busy} data-testid="booking-pay-save">{busy ? (fa ? "در حال ذخیره…" : "Saving…") : fa ? "ثبت واریز" : "Save payment"}</button>
            <button type="button" className="pocket-btn" disabled={busy} onClick={() => setOpen(false)}>{fa ? "انصراف" : "Cancel"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
