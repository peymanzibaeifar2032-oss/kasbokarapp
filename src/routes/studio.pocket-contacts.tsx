import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, RefreshCw, RotateCcw, ShieldCheck, ShieldOff, Smartphone, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDate, formatFaDateTime } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";

/**
 * Owner-only: activation codes for contacts of «تقویم نوبت رنگی» (family, friends, other service workers).
 * A contact code is a signed offline lease for LOCAL editing on that one phone. It is never a site session,
 * so the contact's app can never load, sync or see the owner's appointments, students or cash.
 * Every action goes through /api/save → owner gate (studio owner role + requireAdmin) on the server.
 */
export const Route = createFileRoute("/studio/pocket-contacts")({
  component: ContactCodesPage,
  head: () => ({ meta: [{ title: "کد فعال‌سازی مخاطبین تقویم نوبت رنگی" }, { name: "robots", content: "noindex" }] }),
});

type Device = { id: string; label: string | null; createdAt: string; lastSeenAt: string };
type License = {
  id: string; label: string; note: string | null; kind: "contact" | "customer"; self: boolean; status: "active" | "revoked";
  validFrom: string; expiresAt: string; createdAt: string; revokedAt: string | null;
  maxDevices: number; activeDevices: number; offlineLeaseHours: number; devices: Device[];
};
type ListResult = { keyStatus: { ok: boolean; kid?: string; error?: string }; licenses: License[] };
type Runner = <T>(fn: () => Promise<T>, ok?: string) => Promise<T | null>;

const dateInput = (iso: string) => iso.slice(0, 10);
const inDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const endOfDayTehran = (d: string) => new Date(d + "T23:59:59+03:30").toISOString();

function ContactCodesPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const [data, setData] = useState<ListResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shownCode, setShownCode] = useState<{ label: string; code: string } | null>(null);
  const [form, setForm] = useState({ label: "", note: "", expiresAt: inDays(365), maxDevices: "1", offlineLeaseHours: "168" });

  const load = useCallback(async () => {
    setError("");
    try { setData(await saveAction<ListResult>("pocketLicenseList")); }
    catch (e) { setData(null); setError(friendlyError(e)); }
  }, []);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const run: Runner = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); if (ok) toast.success(ok); await load(); return r; }
    catch (e) { toast.error(friendlyError(e)); return null; }
    finally { setBusy(false); }
  };

  if (!user) return <SignedOutPanel title="کد فعال‌سازی مخاطبین" next="/studio/pocket-contacts" loading={isPending} error={sessionError} onRetry={retry} />;
  const contacts = data?.licenses.filter((l) => l.kind === "contact" && !l.self) ?? [];

  return (
    <Shell variant="admin">
      <div className="mx-auto max-w-3xl space-y-6" dir="rtl" data-testid="pocket-contacts-page">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">کد فعال‌سازی مخاطبین «تقویم نوبت رنگی»</h1>
            <p className="mt-1 text-sm leading-7 text-muted">برای هر نفر یک کد جدا بسازید. فقط صاحب استودیو (نشست واردشده و بررسی سرور) این صفحه را می‌بیند.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={busy} aria-label="بازخوانی"><RefreshCw className="size-4" /></Button>
        </header>

        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-950" data-testid="isolation-note">
          <p className="flex items-center gap-2 font-bold"><ShieldCheck className="size-4" /> اطلاعات هر مخاطب فقط روی گوشی خودش</p>
          <ul className="mt-1 list-disc pr-5">
            <li>کد مخاطب فقط ثبت و ویرایش را روی همان گوشی باز می‌کند. نوبت‌ها، هنرجوها و صندوق او فقط روی گوشی خودش ذخیره می‌شود.</li>
            <li>این کد ورود به سایت نیست؛ با آن هیچ نوبت، هنرجو، پرداخت یا اطلاعات دیگری از حساب شما بارگذاری یا دیده نمی‌شود (سرور بدون ورود صاحب استودیو پاسخ ۴۰۱ می‌دهد).</li>
            <li>برنامه هر چند وقت یک بار، وقتی اینترنت هست، فقط خود مجوز را تازه می‌کند (بدون ارسال اطلاعات). اگر بیشتر از «مهلت آفلاین» بدون اینترنت بماند، دیدن و خروجی گرفتن باز است و فقط ثبت جدید تا اتصال بعدی بسته می‌شود.</li>
            <li>غیرفعال کردن کد، اطلاعات گوشی مخاطب را پاک نمی‌کند.</li>
          </ul>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        {data && !data.keyStatus.ok ? (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">کلید امضای سرور آماده نیست: {data.keyStatus.error}</p>
        ) : null}

        {shownCode ? (
          <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4" aria-live="polite">
            <p className="text-sm font-bold">کد فعال‌سازی «{shownCode.label}» — فقط همین یک بار نمایش داده می‌شود:</p>
            <p className="my-3 select-all text-center font-mono text-xl tracking-widest" dir="ltr" data-testid="contact-code">{shownCode.code}</p>
            <p className="mb-3 text-xs leading-6 text-muted">در برنامه: «پشتیبان» ← «کد فعال‌سازی» را وارد کنید (یک بار اینترنت لازم است).</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void navigator.clipboard?.writeText(shownCode.code).then(() => toast.success("کپی شد"))}><Copy className="size-4" /> کپی</Button>
              <Button variant="outline" onClick={() => setShownCode(null)}>بستن (کد دیگر نمایش داده نمی‌شود)</Button>
            </div>
          </section>
        ) : null}

        {data ? (
          <form
            className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2"
            data-testid="contact-issue-form"
            onSubmit={(e) => {
              e.preventDefault();
              const label = form.label.trim();
              void run(() => saveAction<{ id: string; code: string }>("pocketLicenseIssue", {
                kind: "contact", label, note: form.note,
                expiresAt: endOfDayTehran(form.expiresAt),
                maxDevices: Number(form.maxDevices), offlineLeaseHours: Number(form.offlineLeaseHours),
              }), "کد مخاطب ساخته شد").then((r) => { if (r) { setShownCode({ label, code: r.code }); setForm((f) => ({ ...f, label: "", note: "" })); } });
            }}
          >
            <h2 className="flex items-center gap-2 font-bold sm:col-span-2"><UserPlus className="size-4" /> ساخت کد برای یک مخاطب</h2>
            <label className="grid gap-1 text-sm">نام مخاطب<Input required minLength={2} maxLength={80} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">یادداشت (مثلاً نسبت یا شغل)<Input maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">تاریخ پایان اعتبار<Input type="date" required min={inDays(1)} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">تعداد گوشی (۱ تا ۲۰)<Input type="number" min={1} max={20} required value={form.maxDevices} onChange={(e) => setForm({ ...form, maxDevices: e.target.value })} /></label>
            <label className="grid gap-1 text-sm sm:col-span-2">مهلت آفلاین بدون اینترنت (ساعت، ۱ تا ۱۶۸)<Input type="number" min={1} max={168} required value={form.offlineLeaseHours} onChange={(e) => setForm({ ...form, offlineLeaseHours: e.target.value })} /></label>
            <Button type="submit" disabled={busy} className="sm:col-span-2"><KeyRound className="size-4" /> ساخت و نمایش یک‌بارهٔ کد</Button>
          </form>
        ) : null}

        {data && contacts.length === 0 ? <p className="text-sm text-muted">هنوز کدی برای مخاطبین ساخته نشده است.</p> : null}
        <ul className="space-y-3">
          {contacts.map((l) => <ContactCard key={l.id} l={l} busy={busy} run={run} onCode={(code) => setShownCode({ label: l.label, code })} />)}
        </ul>
        <p className="text-xs text-muted">همهٔ مجوزها (مشتری‌ها و دستگاه‌های خودتان): <a className="underline" href="/studio/licenses">/studio/licenses</a></p>
      </div>
    </Shell>
  );
}

function ContactCard({ l, busy, run, onCode }: { l: License; busy: boolean; run: Runner; onCode: (c: string) => void }) {
  const [exp, setExp] = useState(dateInput(l.expiresAt));
  const [devices, setDevices] = useState(String(l.maxDevices));
  const [lease, setLease] = useState(String(l.offlineLeaseHours));
  const [label, setLabel] = useState(l.label);
  const [note, setNote] = useState(l.note ?? "");
  const expired = new Date(l.expiresAt).getTime() < Date.now();
  const statusText = l.status === "revoked" ? "غیرفعال" : expired ? "منقضی" : "فعال";
  return (
    <li className="rounded-2xl border bg-white p-4" data-testid="contact-card" data-status={l.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{l.label}{l.note ? <span className="font-normal text-muted"> · {l.note}</span> : null}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${l.status === "revoked" ? "bg-red-100 text-red-800" : expired ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{statusText}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        فقط محلی (اطلاعات روی گوشی خودش) · ساخته‌شده {formatFaDate(l.createdAt)} · اعتبار تا {formatFaDate(l.expiresAt)} · گوشی {l.activeDevices}/{l.maxDevices} · آفلاین {l.offlineLeaseHours} ساعت
      </p>
      {l.devices.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {l.devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1"><Smartphone className="size-4" />{d.label || "گوشی"} · فعال‌شده {formatFaDate(d.createdAt)} · آخرین بررسی {formatFaDateTime(d.lastSeenAt)}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => saveAction("pocketLicenseReleaseDevice", { activationId: d.id }), "گوشی آزاد شد")}>آزاد کردن گوشی</Button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-muted">هنوز روی هیچ گوشی فعال نشده است.</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-bold">مدیریت</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Input aria-label="نام مخاطب" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input aria-label="یادداشت" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="outline" className="sm:col-span-2" disabled={busy} onClick={() => void run(() => saveAction("pocketLicenseNote", { id: l.id, label, note }), "ذخیره شد")}>ذخیرهٔ نام و یادداشت</Button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Input type="date" aria-label="تاریخ پایان جدید" value={exp} onChange={(e) => setExp(e.target.value)} />
          <Input type="number" min={1} max={20} aria-label="تعداد گوشی" value={devices} onChange={(e) => setDevices(e.target.value)} />
          <Input type="number" min={1} max={168} aria-label="مهلت آفلاین (ساعت)" value={lease} onChange={(e) => setLease(e.target.value)} />
          <Button disabled={busy} onClick={() => void run(() => saveAction("pocketLicenseUpdate", { id: l.id, expiresAt: endOfDayTehran(exp), maxDevices: Number(devices), offlineLeaseHours: Number(lease) }), "ذخیره شد")}>تمدید / ذخیره</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {l.status === "active" ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => void run(() => saveAction<{ code: string }>("pocketLicenseReissueCode", { id: l.id }), "کد تازه ساخته شد؛ کد قبلی دیگر کار نمی‌کند").then((r) => r && onCode(r.code))}><KeyRound className="size-4" /> کد تازه</Button>
              <Button variant="outline" className="text-red-700" disabled={busy} onClick={() => { if (window.confirm("کد این مخاطب غیرفعال شود؟ اطلاعات گوشی او پاک نمی‌شود؛ فقط ثبت و ویرایش جدید بسته می‌شود.")) void run(() => saveAction("pocketLicenseRevoke", { id: l.id }), "غیرفعال شد"); }}><ShieldOff className="size-4" /> غیرفعال کردن</Button>
            </>
          ) : (
            <Button variant="outline" disabled={busy || expired} onClick={() => void run(() => saveAction("pocketLicenseReactivate", { id: l.id }), "دوباره فعال شد")}><RotateCcw className="size-4" /> فعال کردن دوباره</Button>
          )}
        </div>
      </details>
    </li>
  );
}
