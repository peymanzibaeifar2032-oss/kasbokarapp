import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, RefreshCw, ShieldOff, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDate, formatFaDateTime } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";

export const Route = createFileRoute("/studio/licenses")({
  component: LicensesPage,
  head: () => ({ meta: [{ title: "مجوزهای اپ تقویم نوبت" }, { name: "robots", content: "noindex" }] }),
});

type Device = { id: string; label: string | null; createdAt: string; lastSeenAt: string };
type License = {
  id: string; label: string; self: boolean; status: "active" | "revoked"; validFrom: string; expiresAt: string;
  maxDevices: number; activeDevices: number; offlineLeaseHours: number; devices: Device[];
};
type ListResult = { keyStatus: { ok: boolean; kid?: string; error?: string }; licenses: License[] };

const dateInput = (iso: string) => iso.slice(0, 10);
const inDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

function LicensesPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const [data, setData] = useState<ListResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shownCode, setShownCode] = useState<{ label: string; code: string } | null>(null);
  const [form, setForm] = useState({ label: "", expiresAt: inDays(30), maxDevices: "1", offlineLeaseHours: "72" });

  const load = useCallback(async () => {
    setError("");
    try { setData(await saveAction<ListResult>("pocketLicenseList")); }
    catch (e) { setData(null); setError(friendlyError(e)); }
  }, []);
  useEffect(() => { if (user) void load(); }, [user, load]);

  async function run<T>(fn: () => Promise<T>, ok?: string) {
    setBusy(true);
    try { const r = await fn(); if (ok) toast.success(ok); await load(); return r; }
    catch (e) { toast.error(friendlyError(e)); return null; }
    finally { setBusy(false); }
  }

  if (!user) return <SignedOutPanel title="مجوزهای اپ" next="/studio/licenses" loading={isPending} error={sessionError} onRetry={retry} />;

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">مجوزهای اپ «تقویم نوبت»</h1>
            <p className="mt-1 text-sm leading-7 text-muted">صدور، تمدید و لغو دستی کد فعال‌سازی. فقط صاحب استودیو (نشست واردشده و بررسی سرور) این صفحه را می‌بیند. این بخش فروش یا پرداخت خودکار ندارد.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={busy} aria-label="بازخوانی"><RefreshCw className="size-4" /></Button>
        </header>

        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        {data && !data.keyStatus.ok ? (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">کلید امضای سرور آماده نیست: {data.keyStatus.error}</p>
        ) : null}

        {shownCode ? (
          <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4" aria-live="polite">
            <p className="text-sm font-bold">کد فعال‌سازی «{shownCode.label}» — فقط همین یک بار نمایش داده می‌شود:</p>
            <p className="my-3 select-all text-center font-mono text-xl tracking-widest" dir="ltr" data-testid="license-code">{shownCode.code}</p>
            <div className="flex gap-2">
              <Button onClick={() => void navigator.clipboard?.writeText(shownCode.code).then(() => toast.success("کپی شد"))}><Copy className="size-4" /> کپی</Button>
              <Button variant="outline" onClick={() => setShownCode(null)}>بستن (کد دیگر نمایش داده نمی‌شود)</Button>
            </div>
          </section>
        ) : null}

        {data ? (
          <form
            className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => saveAction<{ id: string; code: string }>("pocketLicenseIssue", {
                label: form.label, expiresAt: new Date(form.expiresAt + "T23:59:59+03:30").toISOString(),
                maxDevices: Number(form.maxDevices), offlineLeaseHours: Number(form.offlineLeaseHours),
              }), "مجوز صادر شد").then((r) => { if (r) { setShownCode({ label: form.label, code: r.code }); setForm((f) => ({ ...f, label: "" })); } });
            }}
          >
            <h2 className="flex items-center gap-2 font-bold sm:col-span-2"><KeyRound className="size-4" /> صدور کد جدید</h2>
            <label className="grid gap-1 text-sm">نام مشتری / برچسب<Input required minLength={2} maxLength={80} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">تاریخ پایان اعتبار<Input type="date" required min={inDays(1)} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">تعداد دستگاه (۱ تا ۲۰)<Input type="number" min={1} max={20} required value={form.maxDevices} onChange={(e) => setForm({ ...form, maxDevices: e.target.value })} /></label>
            <label className="grid gap-1 text-sm">مهلت کار آفلاین بدون اینترنت (ساعت، ۱ تا ۱۶۸)<Input type="number" min={1} max={168} required value={form.offlineLeaseHours} onChange={(e) => setForm({ ...form, offlineLeaseHours: e.target.value })} /></label>
            <p className="text-xs leading-6 text-muted sm:col-span-2">بعد از این مهلت، اپ باید یک بار آنلاین شود تا مجوز تازه شود. لغو یا تمدید در اولین اتصال آنلاین یا حداکثر با پایان همین مهلت اثر می‌کند (لغو آفلاین فوری ممکن نیست).</p>
            <Button type="submit" disabled={busy} className="sm:col-span-2">صدور و نمایش یک‌باره کد</Button>
          </form>
        ) : null}

        {data?.licenses.length === 0 ? <p className="text-sm text-muted">هنوز مجوزی صادر نشده است.</p> : null}
        <ul className="space-y-3">
          {data?.licenses.map((l) => <LicenseCard key={l.id} l={l} busy={busy} run={run} onCode={(code) => setShownCode({ label: l.label, code })} />)}
        </ul>
      </div>
    </Shell>
  );
}

function LicenseCard({ l, busy, run, onCode }: { l: License; busy: boolean; run: <T>(fn: () => Promise<T>, ok?: string) => Promise<T | null>; onCode: (c: string) => void }) {
  const [exp, setExp] = useState(dateInput(l.expiresAt));
  const [devices, setDevices] = useState(String(l.maxDevices));
  const [lease, setLease] = useState(String(l.offlineLeaseHours));
  const expired = new Date(l.expiresAt).getTime() < Date.now();
  return (
    <li className="rounded-2xl border p-4" data-testid="license-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{l.label}{l.self ? " (دستگاه‌های خودتان)" : ""}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${l.status === "revoked" ? "bg-red-100 text-red-800" : expired ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
          {l.status === "revoked" ? "لغوشده" : expired ? "منقضی" : "فعال"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">اعتبار تا {formatFaDate(l.expiresAt)} · دستگاه {l.activeDevices}/{l.maxDevices} · آفلاین {l.offlineLeaseHours} ساعت</p>
      {l.devices.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {l.devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1"><Smartphone className="size-4" />{d.label || "دستگاه"} · آخرین بررسی {formatFaDateTime(d.lastSeenAt)}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => saveAction("pocketLicenseReleaseDevice", { activationId: d.id }), "دستگاه آزاد شد")}>آزاد کردن</Button>
            </li>
          ))}
        </ul>
      ) : null}
      {l.status === "active" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input type="date" aria-label="تاریخ پایان جدید" value={exp} onChange={(e) => setExp(e.target.value)} />
          <Input type="number" min={1} max={20} aria-label="تعداد دستگاه" value={devices} onChange={(e) => setDevices(e.target.value)} />
          <Input type="number" min={1} max={168} aria-label="مهلت آفلاین (ساعت)" value={lease} onChange={(e) => setLease(e.target.value)} />
          <Button disabled={busy} onClick={() => void run(() => saveAction("pocketLicenseUpdate", { id: l.id, expiresAt: new Date(exp + "T23:59:59+03:30").toISOString(), maxDevices: Number(devices), offlineLeaseHours: Number(lease) }), "ذخیره شد")}>تمدید / ذخیره</Button>
          {!l.self ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => void run(() => saveAction<{ code: string }>("pocketLicenseReissueCode", { id: l.id }), "کد تازه ساخته شد؛ کد قبلی دیگر کار نمی‌کند").then((r) => r && onCode(r.code))}>کد تازه</Button>
              <Button variant="outline" className="text-red-700" disabled={busy} onClick={() => { if (window.confirm("این مجوز لغو شود؟ دادهٔ مشتری پاک نمی‌شود؛ فقط ویرایش جدید در اپ بسته می‌شود.")) void run(() => saveAction("pocketLicenseRevoke", { id: l.id }), "لغو شد"); }}><ShieldOff className="size-4" /> لغو</Button>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
