import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, LogIn, RefreshCw, ShieldAlert } from "lucide-react";
import {
  LICENSE_REASON, REFRESH_EVERY_MS, currentLicense, installDeviceId, markServerVerdict, normalizeActivationCode,
  readStoredLicense, recheckPayload, resetTrustedTime, storeLicense, trustedTime, type LicenseState,
} from "@/lib/pocket/license";
import { licenseEnforced, setLicenseChecker } from "@/lib/pocket/license-gate";
import { licenseCall, openPocketLogin } from "@/lib/pocket/sync";

const LAST_REFRESH = "pocket.license.lastRefresh.v1";
/** Set when «ورود صاحب برنامه» sent the user to the site login. Holds only a timestamp (no email, cookie or token). */
export const OWNER_PENDING = "pocket.license.ownerPending.v1";
const OWNER_PENDING_MS = 30 * 60 * 1000;
export function ownerEnrollmentPending(now = Date.now()) {
  const t = Number(localStorage.getItem(OWNER_PENDING)) || 0;
  return t > 0 && now - t < OWNER_PENDING_MS && now >= t;
}

type ServerReply = { token?: string; serverNow?: number; error?: string; code?: string };

/** License controller: verifies the stored token offline, refreshes online, and feeds the mutation gate. */
export function usePocketLicense() {
  const enforced = licenseEnforced();
  const [state, setState] = useState<LicenseState>({ status: enforced ? "none" : "valid", reason: enforced ? "در حال بررسی مجوز…" : LICENSE_REASON.valid });
  const [checked, setChecked] = useState(!enforced);
  const [busy, setBusy] = useState(false);
  const [serverNote, setServerNote] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!enforced) return;
    setLicenseChecker(() => {
      const s = stateRef.current;
      if (s.status !== "valid") return { ok: false, reason: s.reason };
      const again = recheckPayload(s.payload, Date.now(), trustedTime());
      return again.status === "valid" ? { ok: true } : { ok: false, reason: again.reason };
    });
    return () => setLicenseChecker(null);
  }, [enforced]);

  const evaluate = useCallback(async () => {
    const s = await currentLicense();
    setState(s);
    setChecked(true);
    return s;
  }, []);

  const accept = useCallback(async (reply: { status: number; data: unknown }, okMessage?: string) => {
    const data = (reply.data || {}) as ServerReply;
    if (reply.status === 200 && typeof data.token === "string") {
      storeLicense(data.token);
      if (typeof data.serverNow === "number") resetTrustedTime(data.serverNow * 1000);
      localStorage.setItem(LAST_REFRESH, String(Date.now()));
      const s = await evaluate();
      setServerNote("");
      if (s.status === "valid" && okMessage) toast.success(okMessage);
      if (s.status !== "valid") toast.error(s.reason);
      return true;
    }
    if (reply.status === 403 && (data.code === "revoked" || data.code === "expired" || data.code === "invalid")) {
      if (readStoredLicense()) markServerVerdict(data.code);
      await evaluate();
    }
    const msg = data.error || (reply.status === 429 ? "تلاش زیاد بود. کمی بعد دوباره امتحان کنید." : reply.status >= 500 ? "سرور مجوز فعلاً در دسترس نیست. اطلاعات شما سالم است." : "انجام نشد.");
    setServerNote(msg);
    toast.error(msg);
    return false;
  }, [evaluate]);

  const refresh = useCallback(async (manual = false) => {
    const stored = readStoredLicense();
    if (!stored) { await evaluate(); return; }
    try {
      const device = await installDeviceId();
      await accept(await licenseCall("refreshPocketLicense", [String(stored.token), device]), manual ? "مجوز به‌روز شد." : undefined);
    } catch (e) {
      // Offline / no bridge: keep the signed offline lease; never treat as revoked.
      const msg = e instanceof Error ? e.message : "سرور در دسترس نیست.";
      setServerNote(msg);
      if (manual) toast.error(msg);
      await evaluate();
    }
  }, [accept, evaluate]);

  useEffect(() => {
    if (!enforced) return;
    void evaluate().then(() => {
      const last = Number(localStorage.getItem(LAST_REFRESH)) || 0;
      if (Date.now() - last > REFRESH_EVERY_MS || Date.now() < last) void refresh();
    });
    const onVisible = () => {
      if (document.visibilityState === "hidden") return;
      const last = Number(localStorage.getItem(LAST_REFRESH)) || 0;
      if (Date.now() - last > REFRESH_EVERY_MS || Date.now() < last) void refresh();
      else void evaluate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [enforced, evaluate, refresh]);

  const activate = useCallback(async (raw: string) => {
    const code = normalizeActivationCode(raw);
    if (!code) { toast.error("کد ۲۰ حرفی را کامل وارد کنید (مثل ABCDE-12345-…)."); return false; }
    setBusy(true);
    try {
      const device = await installDeviceId();
      return await accept(await licenseCall("activatePocketLicense", [code, device]), "برنامه فعال شد.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "سرور در دسترس نیست.";
      setServerNote(msg); toast.error(msg); return false;
    } finally { setBusy(false); }
  }, [accept]);

  // auto = called after returning from the site login: never re-opens the login page (no loops).
  const ownerSelf = useCallback(async (auto = false) => {
    setBusy(true);
    try {
      const device = await installDeviceId();
      const reply = await licenseCall("selfPocketLicense", [device]);
      if (reply.status === 401) {
        if (auto) {
          localStorage.removeItem(OWNER_PENDING);
          const msg = "ورود به سایت انجام نشد یا نشست سایت پیدا نشد. دوباره «ورود صاحب برنامه» را بزنید و با ایمیل صاحب برنامه وارد شوید.";
          setServerNote(msg);
          toast.error(msg);
          return false;
        }
        localStorage.setItem(OWNER_PENDING, String(Date.now()));
        toast.message("با ایمیل صاحب برنامه در سایت وارد شوید؛ بعد از برگشت به اپ، فعال‌سازی خودکار انجام می‌شود.");
        openPocketLogin();
        return false;
      }
      localStorage.removeItem(OWNER_PENDING);
      if (reply.status === 403) {
        const msg = "این حساب سایت صاحب برنامه نیست؛ مجوز خودکار فقط برای حساب صاحب برنامه صادر می‌شود. با حساب درست وارد شوید یا کد فعال‌سازی وارد کنید.";
        setServerNote(msg);
        toast.error(msg);
        return false;
      }
      return await accept(reply, "مجوز صاحب برنامه روی این گوشی فعال شد.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "سرور در دسترس نیست.";
      setServerNote(msg); toast.error(msg); return false;
    } finally { setBusy(false); }
  }, [accept]);

  // After the native login flow reloads the offline page (or the app comes back to the foreground),
  // finish the owner enrollment the user started. The server decides ownership from its own session.
  useEffect(() => {
    if (!enforced || !checked || state.status === "valid") return;
    const run = () => {
      if (document.visibilityState === "hidden" || !ownerEnrollmentPending()) return;
      void ownerSelf(true);
    };
    run();
    window.addEventListener("pocket-account-refresh", run);
    return () => window.removeEventListener("pocket-account-refresh", run);
  }, [enforced, checked, state.status, ownerSelf]);

  return { enforced, state, checked, busy, serverNote, activate, ownerSelf, refresh };
}

export type PocketLicenseController = ReturnType<typeof usePocketLicense>;

const faDate = (sec: number) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date(sec * 1000));
const faDateTime = (sec: number) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(new Date(sec * 1000));

/** Activation card. Shown at the top when locked, and in the Backup tab always. Never asks for or shows secrets other than the code the user types. */
export function PocketLicenseCard({ license, compact = false, onOpenBackup, ownerVerified = false }: { license: PocketLicenseController; compact?: boolean; onOpenBackup?: () => void; ownerVerified?: boolean }) {
  const [code, setCode] = useState("");
  if (!license.enforced) return null;
  const { state, busy } = license;
  const valid = state.status === "valid";
  if (compact && (valid || !license.checked)) return null;
  if (compact) {
    // Slim notice on the other tabs (not the whole activation form on every page). The full card lives in «پشتیبان».
    return (
      <section className="pocket-license is-locked pocket-license-slim" data-testid="license-card" data-status={state.status} aria-live="polite">
        <div className="pocket-license-head">
          <ShieldAlert size={18} aria-hidden />
          <h2>{ownerVerified || busy ? "فعال‌سازی خودکار صاحب برنامه…" : "برنامه هنوز فعال نشده است"}</h2>
        </div>
        <p className="pocket-muted" data-testid="license-reason">{state.reason} دیدن نوبت‌ها و خروجی JSON/PDF کار می‌کند.</p>
        {!ownerVerified ? (
          <p className="pocket-muted" data-testid="license-owner-help">صاحب برنامه کد لازم ندارد: «ورود صاحب برنامه» را بزنید و در سایت وارد شوید؛ مجوز خودکار فعال می‌شود.</p>
        ) : null}
        <div className="pocket-license-actions">
          {onOpenBackup ? (
            <button type="button" className="pocket-btn pocket-btn-primary" onClick={onOpenBackup} data-testid="license-open">
              <KeyRound size={16} aria-hidden /> فعال‌سازی
            </button>
          ) : null}
          {!ownerVerified ? (
            <button type="button" className="pocket-btn" disabled={busy} onClick={() => void license.ownerSelf()} data-testid="license-owner">
              <LogIn size={16} aria-hidden /> ورود صاحب برنامه
            </button>
          ) : null}
        </div>
      </section>
    );
  }
  return (
    <section className={`pocket-license ${valid ? "is-valid" : "is-locked"}`} data-testid="license-card" data-status={license.checked ? state.status : "checking"} aria-live="polite">
      <div className="pocket-license-head">
        {valid ? <CheckCircle2 size={20} aria-hidden /> : <ShieldAlert size={20} aria-hidden />}
        <h2>{valid ? (state.payload?.self ? "مجوز صاحب برنامه فعال است" : "برنامه فعال است") : "فعال‌سازی برنامه"}</h2>
      </div>
      {valid && state.payload ? (
        <p className="pocket-muted" data-testid="license-valid-text">
          اعتبار تا {faDate(state.payload.exp)} · کار بدون اینترنت تا {faDateTime(state.payload.olu)}؛ بعد از آن یک بار آنلاین شوید.
        </p>
      ) : (
        <>
          <p className="pocket-license-reason" data-testid="license-reason">{license.checked ? state.reason : "در حال بررسی مجوز…"}</p>
          <p className="pocket-muted">
            هیچ اطلاعاتی پاک نمی‌شود. دیدن نوبت‌ها، تماس، پیامک و واتس‌اپ، و خروجی JSON و PDF همیشه کار می‌کند؛ فقط ثبت و ویرایش تازه تا فعال‌سازی بسته است.
          </p>
          {ownerVerified ? (
            <p className="pocket-muted" data-testid="license-owner-verified">حساب صاحب برنامه در سایت تأیید شده است؛ کد لازم نیست. مجوز خودکار درخواست می‌شود؛ اگر فعال نشد «ورود صاحب برنامه» را بزنید.</p>
          ) : null}
          {!ownerVerified ? <form
            className="pocket-license-form"
            onSubmit={(e) => { e.preventDefault(); void license.activate(code).then((ok) => ok && setCode("")); }}
          >
            <label htmlFor="pocket-license-code">کد فعال‌سازی (از صاحب برنامه)</label>
            <input
              id="pocket-license-code" className="pocket-input" dir="ltr" inputMode="text" autoComplete="off" autoCapitalize="characters"
              spellCheck={false} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" maxLength={29} value={code} onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="pocket-btn pocket-btn-primary" disabled={busy}>
              <KeyRound size={18} aria-hidden /> {busy ? "در حال بررسی…" : "فعال‌سازی"}
            </button>
          </form> : null}
          <p className="pocket-muted" data-testid="license-owner-help">
            صاحب برنامه کد لازم ندارد: «ورود صاحب برنامه» را بزنید، در سایت با ایمیل صاحب برنامه وارد شوید و به اپ برگردید؛ مجوز یک‌ساله (تا ۵ گوشی) خودش فعال می‌شود؛ برای تمدید، هر وقت لازم شد دوباره همین کار را بکنید.
          </p>
          <div className="pocket-license-actions">
            <button type="button" className="pocket-btn" disabled={busy} onClick={() => void license.ownerSelf()} data-testid="license-owner">
              <LogIn size={18} aria-hidden /> ورود صاحب برنامه (فعال‌سازی خودکار، بدون کد)
            </button>
            {onOpenBackup ? <button type="button" className="pocket-btn" onClick={onOpenBackup}>خروجی JSON / PDF</button> : null}
          </div>
        </>
      )}
      {readStoredLicense() ? (
        <button type="button" className="pocket-btn pocket-license-recheck" disabled={busy} onClick={() => void license.refresh(true)}>
          <RefreshCw size={16} aria-hidden /> بررسی دوباره با سرور
        </button>
      ) : null}
      {license.serverNote ? <p className="pocket-muted" role="status">{license.serverNote}</p> : null}
    </section>
  );
}
