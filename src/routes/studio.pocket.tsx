import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { authClient, signOut } from "@/lib/auth/client";
import { loadPocketJobs, loadPocketRequests, newLocalId, savePocketJobs, savePocketRequests } from "@/lib/pocket-db";
import { mergePocketJobs, tehranDay, type PocketJob, type PocketRequest } from "@/lib/pocket-sync";
import { saveAction } from "@/lib/save";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

export const Route = createFileRoute("/studio/pocket")({
  component: PocketApp,
  head: () => ({ meta: [{ title: "اپ تاتو | بدون اینترنت" }] }),
});

type Tab = "request" | "admin";
const ADMIN_KEY = "kasb-pocket-admin";
const ADMIN_EMAIL_KEY = "kasb-pocket-email";

function ownerUnlocked() {
  return localStorage.getItem(ADMIN_KEY) === "1" && isStudioOwnerEmail(localStorage.getItem(ADMIN_EMAIL_KEY));
}

function PocketApp() {
  const [tab, setTab] = useState<Tab>("request");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [jobs, setJobs] = useState<PocketJob[]>([]);
  const [requests, setRequests] = useState<PocketRequest[]>([]);
  const [admin, setAdmin] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancel = false;
    const unlocked = ownerUnlocked();
    if (!unlocked) localStorage.removeItem(ADMIN_KEY);
    setAdmin(unlocked);
    void (async () => {
      const [storedJobs, storedRequests] = await Promise.all([loadPocketJobs(), loadPocketRequests()]);
      if (cancel) return;
      setJobs(storedJobs);
      setRequests(storedRequests);
      if (navigator.onLine) {
        await transfer(storedJobs, storedRequests, unlocked, setJobs, setRequests, setSyncing);
      }
    })();
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/pocket-sw.js");
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancel = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [online, admin]);

  return (
    <main className="min-h-dvh bg-[#111] pb-24 text-white" dir="rtl">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-base font-black">{online ? "همان امکانات سایت" : "بدون اینترنت"}</h1>
          <p className="text-xs text-white/55">{syncing ? "در حال انتقال…" : online ? "دستیار و پنل کامل" : "ذخیره روی گوشی"}</p>
        </div>
        <button type="button" className="h-10 rounded-2xl border border-white/20 px-4 text-sm" onClick={() => void leavePocket()}>خروج</button>
      </header>
      {online ? (
        <iframe
          key={tab}
          title={tab === "request" ? "درخواست رزرو" : "پنل ادمین"}
          src={tab === "request" ? "/studio/request" : "/studio/admin"}
          className="w-full border-0 bg-[#111]"
          style={{ height: "calc(100dvh - 8.25rem)" }}
        />
      ) : (
      <div className="px-4 py-4">
        {tab === "request" ? <RequestPane requests={requests} onChange={setRequests} /> : <AdminPane jobs={jobs} requests={requests} admin={admin} setAdmin={setAdmin} onJobs={setJobs} onRequests={setRequests} />}
      </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-2 gap-2 border-t border-white/10 bg-[#111] p-3">
        <button type="button" className={`h-12 rounded-2xl text-sm font-bold ${tab === "request" ? "bg-[#b7955b] text-black" : "border border-white/15"}`} onClick={() => setTab("request")}>درخواست رزرو وقت</button>
        <button type="button" className={`h-12 rounded-2xl text-sm font-bold ${tab === "admin" ? "bg-[#b7955b] text-black" : "border border-white/15"}`} onClick={() => setTab("admin")}>پنل ادمین</button>
      </nav>
    </main>
  );
}

function leavePocket() {
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(ADMIN_EMAIL_KEY);
  return signOut("/studio/pocket").catch(() => undefined);
}

function RequestPane({ requests, onChange }: { requests: PocketRequest[]; onChange: (rows: PocketRequest[]) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placement, setPlacement] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [idea, setIdea] = useState("");

  async function save() {
    if (name.trim().length < 2 || phone.trim().length < 10 || placement.trim().length < 2 || sizeCm.trim().length < 1 || idea.trim().length < 2) {
      toast.error("نام، شماره، محل، اندازه و توضیح طرح را بنویس.");
      return;
    }
    const row: PocketRequest = {
      localId: newLocalId(),
      serverId: "",
      customerName: name.trim(),
      customerPhone: phone.trim(),
      placement: placement.trim(),
      style: "از روی توضیح",
      idea: idea.trim(),
      sizeCm: sizeCm.trim(),
      requestType: "new",
      origin: "phone",
    };
    const next = [row, ...requests];
    await savePocketRequests(next);
    onChange(next);
    setName("");
    setPhone("");
    setPlacement("");
    setSizeCm("");
    setIdea("");
    toast.success(navigator.onLine ? "ذخیره شد و به سایت فرستاده می‌شود." : "بدون اینترنت ذخیره شد. با وصل شدن نت ارسال می‌شود.");
    if (navigator.onLine) void sendRequests(next, onChange);
  }

  return (
    <section className="grid gap-3">
      <Field label="نام" value={name} onChange={setName} />
      <Field label="شماره تماس" value={phone} onChange={setPhone} />
      <Field label="محل اجرا" value={placement} onChange={setPlacement} />
      <Field label="اندازه" value={sizeCm} onChange={setSizeCm} />
      <label className="grid gap-1 text-sm">
        توضیح طرح
        <textarea value={idea} onChange={(event) => setIdea(event.target.value)} className="min-h-24 rounded-2xl border border-white/15 bg-transparent px-3 py-2" />
      </label>
      <button type="button" className="h-12 rounded-2xl bg-[#b7955b] font-bold text-black" onClick={() => void save()}>ثبت درخواست</button>
      <ul className="grid gap-2">
        {requests.map((row) => (
          <li key={row.localId} className="rounded-2xl border border-white/10 p-3 text-sm">
            <b>{row.customerName}</b>
            <p className="text-white/60">{row.customerPhone} · {row.placement}</p>
            <p className="text-xs text-[#b7955b]">{row.serverId ? "به سایت رسید" : row.syncError || "روی گوشی مانده"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminPane({
  jobs,
  requests,
  admin,
  setAdmin,
  onJobs,
  onRequests,
}: {
  jobs: PocketJob[];
  requests: PocketRequest[];
  admin: boolean;
  setAdmin: (value: boolean) => void;
  onJobs: (rows: PocketJob[]) => void;
  onRequests: (rows: PocketRequest[]) => void;
}) {
  const [email, setEmail] = useState(() => localStorage.getItem(ADMIN_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);

  async function leave() {
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    setAdmin(false);
    setPassword("");
    try {
      await signOut("/studio/pocket");
    } catch {
      toast.error("خروج از سایت کامل نشد. فرم ورود دوباره باز است.");
    }
  }

  async function enter() {
    const typed = email.trim();
    if (!isStudioOwnerEmail(typed)) {
      toast.error("این ایمیل پنل ادمین نیست. ایمیل خودت را بنویس.");
      return;
    }
    if (!navigator.onLine) {
      if (ownerUnlocked()) {
        setAdmin(true);
        return;
      }
      toast.error("اولین ورود باید یک بار با اینترنت باشد.");
      return;
    }
    const res = await authClient.signIn.email({ email: typed, password });
    if (res.error) {
      toast.error("ایمیل یا رمز درست نیست. دوباره بنویس یا خروج را بزن.");
      return;
    }
    const signedIn = res.data?.user?.email || typed;
    if (!isStudioOwnerEmail(signedIn)) {
      localStorage.removeItem(ADMIN_KEY);
      localStorage.removeItem(ADMIN_EMAIL_KEY);
      try {
        await authClient.signOut();
      } catch {
        /* the panel stays closed either way */
      }
      toast.error("این حساب پنل ادمین نیست. خارج شدی.");
      return;
    }
    localStorage.setItem(ADMIN_KEY, "1");
    localStorage.setItem(ADMIN_EMAIL_KEY, typed);
    setAdmin(true);
    void transfer(jobs, requests, true, onJobs, onRequests, () => undefined);
  }

  if (!admin) {
    return (
      <section className="grid gap-3">
        <p className="text-sm text-white/70">پنل فقط با ایمیل و رمز خودت باز می‌شود. بعد از یک ورود، بدون اینترنت هم باز است.</p>
        <Field label="ایمیل" value={email} onChange={setEmail} />
        <Field label="رمز" value={password} onChange={setPassword} type="password" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="h-12 rounded-2xl bg-[#b7955b] font-bold text-black" onClick={() => void enter()}>ورود</button>
          <button type="button" className="h-12 rounded-2xl border border-white/20 font-bold" onClick={() => void leave()}>خروج</button>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <p className="text-xs text-white/50">{localStorage.getItem(ADMIN_EMAIL_KEY)}</p>
      <div className="flex gap-2">
        <button type="button" className="h-11 flex-1 rounded-2xl bg-[#b7955b] font-bold text-black" onClick={() => setOpen((value) => !value)}>{open ? "بستن فرم" : "نوبت جدید"}</button>
        <button type="button" className="h-11 rounded-2xl border border-white/15 px-4 text-sm" onClick={() => void transfer(jobs, requests, true, onJobs, onRequests, () => undefined)}>انتقال</button>
        <button type="button" className="h-11 rounded-2xl border border-white/20 px-4 text-sm" onClick={() => void leave()}>خروج</button>
      </div>
      {open ? <JobForm jobs={jobs} onJobs={onJobs} onSaved={() => void transfer(jobs, requests, true, onJobs, onRequests, () => undefined)} /> : null}
      <h2 className="font-bold">تقویم ذخیره‌شده</h2>
      {jobs.length ? jobs.map((row) => (
        <article key={row.localId} className="rounded-2xl border border-white/10 p-3 text-sm">
          <p className="text-xs text-[#b7955b]">{formatDay(row.slotStart)}</p>
          <b>{row.customerName}</b>
          <p className="text-white/65">{row.customerPhone} · {row.placement} · {row.sizeCm}</p>
          <p className="text-xs text-white/45">{row.serverId ? "روی سایت هست" : row.syncError || "فقط روی گوشی، منتظر نت"}</p>
        </article>
      )) : <p className="text-sm text-white/50">هنوز نوبتی در اپ نیست. با اینترنت یک بار انتقال را بزن تا لیست سایت بیاید.</p>}
      {requests.some((row) => row.origin === "site") ? <h2 className="mt-2 font-bold">درخواست‌های رسیده</h2> : null}
      {requests.filter((row) => row.origin === "site").map((row) => (
        <p key={row.localId} className="rounded-2xl border border-white/10 p-3 text-sm">{row.customerName} · {row.placement}</p>
      ))}
    </section>
  );
}

function JobForm({ jobs, onJobs, onSaved }: { jobs: PocketJob[]; onJobs: (rows: PocketJob[]) => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placement, setPlacement] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [style, setStyle] = useState("رئال");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("11:00");

  async function save() {
    if (!day || name.trim().length < 2 || phone.trim().length < 10 || placement.trim().length < 2) {
      toast.error("نام، شماره، محل و تاریخ را کامل کن.");
      return;
    }
    const slotStart = new Date(`${day}T${time || "11:00"}:00+03:30`).toISOString();
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" }).format(new Date(slotStart));
    if (weekday === "Thu") {
      toast.error("پنجشنبه فقط برای کارآموز است. نوبت مشتری ثبت نمی‌شود.");
      return;
    }
    const row: PocketJob = {
      localId: newLocalId(),
      serverId: "",
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerPhone2: "",
      customerInstagram: "",
      placement: placement.trim(),
      style: style.trim() || "رئال",
      idea: "",
      sizeCm: sizeCm.trim(),
      priceMinToman: 0,
      paidToman: 0,
      slotStart,
      sessionMinutes: 180,
      origin: "phone",
    };
    const next = [...jobs, row].sort((a, b) => a.slotStart.localeCompare(b.slotStart));
    await savePocketJobs(next);
    onJobs(next);
    toast.success("در تقویم گوشی ذخیره شد.");
    onSaved();
  }

  return (
    <div className="grid gap-2 rounded-3xl border border-white/10 p-3">
      <Field label="نام مشتری" value={name} onChange={setName} />
      <Field label="شماره" value={phone} onChange={setPhone} />
      <Field label="محل" value={placement} onChange={setPlacement} />
      <Field label="اندازه" value={sizeCm} onChange={setSizeCm} />
      <Field label="سبک" value={style} onChange={setStyle} />
      <label className="grid gap-1 text-sm">
        تاریخ شمسی
        <JalaliDatePicker value={day} onChange={setDay} label="انتخاب روز شمسی" busyKeys={jobs.map((row) => tehranDay(row.slotStart)).filter(Boolean)} />
      </label>
      <label className="grid gap-1 text-sm">ساعت <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-11 rounded-2xl border border-white/15 bg-transparent px-3" /></label>
      <button type="button" className="h-11 rounded-2xl bg-white text-sm font-bold text-black" onClick={() => void save()}>ذخیره در تقویم</button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-2xl border border-white/15 bg-transparent px-3" />
    </label>
  );
}

function formatDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return tehranDay(iso);
  return date.toLocaleString("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function sendRequests(rows: PocketRequest[], onChange: (rows: PocketRequest[]) => void) {
  const next = [...rows];
  for (const row of next) {
    if (row.origin !== "phone" || row.serverId) continue;
    try {
      const res = await fetch("/api/pocket-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || "ارسال نشد");
      row.serverId = data.id;
      row.syncError = "";
    } catch (error) {
      row.syncError = error instanceof Error ? error.message : "منتظر نت";
    }
  }
  await savePocketRequests(next);
  onChange(next);
}

async function transfer(
  _jobs: PocketJob[],
  _requests: PocketRequest[],
  admin: boolean,
  setJobs: (rows: PocketJob[]) => void,
  setRequests: (rows: PocketRequest[]) => void,
  setSyncing: (value: boolean) => void,
) {
  if (!navigator.onLine) return;
  setSyncing(true);
  const jobs = await loadPocketJobs();
  const requests = await loadPocketRequests();
  try {
    await sendRequests(requests, setRequests);
    if (!admin && localStorage.getItem(ADMIN_KEY) !== "1") return;
    const pending = jobs.filter((row) => row.origin === "phone" && !row.serverId);
    const result = await saveAction<{
      jobs: PocketJob[];
      requests: PocketRequest[];
      linked: { localId: string; serverId: string }[];
      failed: { localId: string; error: string }[];
    }>("studioPocketPush", {
      jobs: pending.map((row) => ({
        localId: row.localId,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerPhone2: row.customerPhone2,
        customerInstagram: row.customerInstagram,
        placement: row.placement,
        style: row.style || "رئال",
        idea: row.idea,
        sizeCm: row.sizeCm,
        priceMinToman: row.priceMinToman,
        paidToman: row.paidToman,
        slotStart: row.slotStart,
        sessionMinutes: row.sessionMinutes,
      })),
    });
    const merged = mergePocketJobs(jobs, result.jobs, result.linked, result.failed);
    await savePocketJobs(merged);
    setJobs(merged);
    const sent = new Set([...result.linked.map((row) => row.localId)]);
    const kept = requests.filter((row) => row.origin === "phone" && !row.serverId && !sent.has(row.localId));
    const incoming = [...result.requests.map((row) => ({ ...row, origin: "site" as const })), ...kept];
    await savePocketRequests(incoming);
    setRequests(incoming);
  } catch {
    /* stay local until the next connection */
  } finally {
    setSyncing(false);
  }
}
