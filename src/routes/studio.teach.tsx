import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, Download, Eye, ImageIcon, KeyRound, Layers, MessageCircleQuestion, Search, Smartphone, type LucideIcon } from "lucide-react";
import type { ApprenticeReport, ApprenticeRow } from "@/lib/tattoo-learn/apprentice-stats";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { compressImage } from "@/lib/design-images";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

export const Route = createFileRoute("/studio/teach")({
  component: TeachPage,
  head: () => ({ meta: [{ title: "آموزش تاتو" }] }),
});

type ModuleRow = { id: string; title: string; description: string; order: number; isActive: boolean };
type LessonRow = { id: string; moduleId: string; title: string; content: string; order: number; isPublished: boolean; groupId: string | null };
type GroupRow = { id: string; moduleId: string; title: string; order: number };
type ImageRow = { id: string; lessonId: string; path: string; caption: string; order: number };
type CodeRow = { id: string; code: string; maxDevices: number; usedCount: number; isActive: boolean; expiresAt: string | null; note: string };
type AccessRow = { id: string; deviceId: string; activatedAt: string; lastSeen: string; isBlocked: boolean; code: string };
type QuestionRow = { id: string; questionText: string; answerText: string | null; status: string; createdAt: string; deviceId: string; lessonId: string | null; lessonTitle: string | null };
type Snap = { modules: ModuleRow[]; groups?: GroupRow[]; lessons: LessonRow[]; images: ImageRow[]; codes: CodeRow[]; access: AccessRow[]; questions: QuestionRow[]; ownerCode?: string };

const sections = ["ماژول", "درس", "تصویر", "کد", "دسترسی", "سؤال", "آمار کارآموزها", "پیش‌نمایش"] as const;
type Section = (typeof sections)[number];

/** One colour and icon per tab, like the tiles of the Pocket calendar and the class app. */
const sectionLook: Record<Section, { icon: LucideIcon; tint: string }> = {
  "ماژول": { icon: Layers, tint: "#7b61ff" },
  "درس": { icon: BookOpen, tint: "#4f7cff" },
  "تصویر": { icon: ImageIcon, tint: "#2bb5d8" },
  "کد": { icon: KeyRound, tint: "#f08a24" },
  "دسترسی": { icon: Smartphone, tint: "#0f9d8a" },
  "سؤال": { icon: MessageCircleQuestion, tint: "#f45b8c" },
  "آمار کارآموزها": { icon: BarChart3, tint: "#22a06b" },
  "پیش‌نمایش": { icon: Eye, tint: "#8b5cf6" },
};

const field = "h-12 w-full rounded-2xl border border-border px-3 text-sm";
const area = "w-full rounded-2xl border border-border px-3 py-2 text-sm";
const primaryButton = "admin-grad h-12 rounded-2xl px-4 text-sm font-bold shadow-sm disabled:opacity-60";
const chip = "h-10 rounded-xl border px-3 text-sm font-medium";
const dangerChip = "h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-800";
const card = "rounded-3xl border border-border bg-white p-4 shadow-sm";

function DeskTitle({ title, text, tint, children }: { title: string; text?: string; tint: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <span className="h-5 w-1.5 rounded-full" style={{ background: tint }} aria-hidden />
          {title}
        </h2>
        {text ? <p className="mt-1 text-xs leading-6 text-muted">{text}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Pill({ tint, children }: { tint: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `${tint}1a`, color: tint }}>
      {children}
    </span>
  );
}

type ActivityCode = { codeId: string; code: string; note: string; opens: number; completes: number; lessons: number; lastAt: string | null };
type ActivityLesson = { lessonId: string; title: string; opens: number; readers: number; completes: number };
type Activity = { codes: ActivityCode[]; lessons: ActivityLesson[]; totals: { events: number; codes: number; since: string | null } };

const faNum = (value: number) => value.toLocaleString("fa-IR");

/** Apprentices are in Iran: every time in the stats is Tehran time, and labelled so. */
function tehranTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fa-IR", { timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function callSchool(op: string, body?: unknown) {
  const response = await fetch(`/api/tattoo-school?op=${op}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "انجام نشد.");
  return data;
}

function TeachPage() {
  const { user, isPending } = useCurrentUserState();
  const owner = isStudioOwnerEmail(user?.primaryEmail);
  const [section, setSection] = useState<Section>("ماژول");
  const [focusCode, setFocusCode] = useState("");
  const [snap, setSnap] = useState<Snap | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await callSchool("snapshot");
    setSnap(data as Snap);
  }

  useEffect(() => {
    if (!owner) return;
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "خوانده نشد."));
  }, [owner]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <Shell variant="admin"><p className="text-sm">در حال بررسی ورود…</p></Shell>;
  if (!owner) {
    return (
      <Shell variant="admin">
        <p className="text-sm leading-7">این بخش فقط برای مدیر استودیو است.</p>
      </Shell>
    );
  }
  const counts: Partial<Record<Section, number>> = snap
    ? {
        "ماژول": snap.modules.length,
        "درس": snap.lessons.length,
        "تصویر": snap.images.length,
        "کد": snap.codes.length,
        "دسترسی": snap.access.length,
        "سؤال": snap.questions.filter((item) => item.status === "pending").length,
      }
    : {};

  return (
    <Shell variant="admin">
      <div className="grid gap-4" dir="rtl">
        <div className={`${card} relative overflow-hidden pt-5`}>
          <div className="admin-stripe absolute inset-x-0 top-0" aria-hidden />
          <Link to="/studio/admin" search={{ tab: "calendar" }} className="text-sm font-bold text-[#5b4ddb]">
            بازگشت به میز کار
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className="admin-grad grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm">
              <BookOpen className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black">آموزش تاتو</h1>
              <p className="text-xs leading-5 text-muted">درس منتشرشده همان لحظه برای هنرجویی می‌آید که کد دارد. خودش این آدرس را باز می‌کند:</p>
            </div>
          </div>
          {snap ? (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {([
                ["درس", snap.lessons.length, "#2d5bd8"],
                ["دیده‌شدنی", snap.lessons.filter((item) => item.isPublished).length, "#178a57"],
                ["کد", snap.codes.length, "#c26a0a"],
                ["سؤال تازه", snap.questions.filter((item) => item.status === "pending").length, "#d6336c"],
              ] as const).map(([label, value, tint]) => (
                <div key={label} className="rounded-2xl px-1 py-2" style={{ background: `${tint}14` }}>
                  <p className="text-lg font-black" style={{ color: tint }}>{faNum(value)}</p>
                  <p className="text-[11px] font-bold text-muted">{label}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <a href="/studio/class" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#eef3ff] px-1 py-2 text-[#2d5bd8]">
              <Eye className="size-4 shrink-0" />
              <span>صفحهٔ کلاس</span>
              <span className="text-[10px] font-medium" dir="ltr">kasbokarapp.com/studio/class</span>
            </a>
            <a href="/api/tattoo-apk" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#f3f4fb] px-1 py-2 text-[#3a4466]">
              <Download className="size-4 shrink-0" />
              دانلود اپ ۱.۵.۰
            </a>
            <a href="https://kasbokarapp.netlify.app/downloads/tattoo-class-1.6.0.apk" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#f2f0ff] px-1 py-2 text-[#5b4ddb]">
              <Download className="size-4 shrink-0" />
              دانلود اپ ۱.۶.۰ (طرح رنگی، پیشرفت، PDF)
            </a>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted">اپ ۱.۶.۰: پیش از نصب، نسخهٔ ۱.۵.۰ را پاک کن.</p>
          {snap?.ownerCode ? (
            <label className="mt-2 grid gap-1 rounded-2xl bg-[#fff6ec] p-2">
              <span className="px-1 text-xs font-bold text-[#b45f0e]">کد ورود خودت، مثل کارآموز</span>
              <input
                readOnly
                value={snap.ownerCode}
                dir="ltr"
                className="h-11 w-full min-w-0 rounded-xl border border-[#f5c58f] bg-white px-3 text-center text-base font-black tracking-wider"
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          ) : null}
        </div>
        <nav className="grid grid-cols-4 gap-2 md:grid-cols-8" aria-label="بخش‌های آموزش">
          {sections.map((item) => {
            const look = sectionLook[item];
            const Icon = look.icon;
            const active = section === item;
            const count = counts[item];
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                className={`relative flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center text-xs font-bold shadow-sm transition ${active ? "text-white" : "border border-border bg-white text-[#2b3555]"}`}
                style={active ? { background: `linear-gradient(135deg, ${look.tint}, ${look.tint}c4)` } : undefined}
                onClick={() => setSection(item)}
              >
                <span className="grid size-8 place-items-center rounded-xl" style={active ? { background: "rgba(255,255,255,.22)" } : { background: `${look.tint}1a`, color: look.tint }}>
                  <Icon className="size-4" />
                </span>
                <span className="leading-4">{item}</span>
                {count ? (
                  <span className={`absolute left-1.5 top-1.5 min-w-5 rounded-full px-1 text-[10px] leading-5 ${active ? "bg-white/25" : "text-white"}`} style={active ? undefined : { background: look.tint }}>
                    {faNum(count)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        {error ? <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p> : null}
        {notice ? <p className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{notice}</p> : null}
        {!snap ? <p className="text-sm text-muted">در حال خواندن…</p> : null}
        {snap && section === "ماژول" ? <ModuleDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "درس" ? <LessonDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "تصویر" ? <ImageDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "کد" ? <CodeDesk snap={snap} busy={busy} run={run} flash={setNotice} onStats={(codeId) => { setFocusCode(codeId); setSection("آمار کارآموزها"); }} /> : null}
        {snap && section === "دسترسی" ? <AccessDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "سؤال" ? <QuestionDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "آمار کارآموزها" ? <ActivityDesk focusCode={focusCode} /> : null}
        {snap && section === "پیش‌نمایش" ? <PreviewDesk snap={snap} /> : null}
      </div>
    </Shell>
  );
}

function ModuleDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState("");
  return (
    <section className="grid gap-3">
      <div className={`${card} grid gap-3`}>
      <DeskTitle title={editing ? "ویرایش ماژول" : "ماژول تازه"} text="هر ماژول یک بخش از فهرست کلاس است." tint="#7b61ff" />
      <input className={field} placeholder="نام ماژول" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className={`${area} min-h-24`} placeholder="توضیح کوتاه" value={description} onChange={(event) => setDescription(event.target.value)} />
      <button type="button" disabled={busy} className={primaryButton} onClick={() => run(async () => {
        await callSchool("save-module", { id: editing || undefined, title, description, order: editing ? snap.modules.find((item) => item.id === editing)?.order ?? snap.modules.length : snap.modules.length, isActive: true });
        setTitle("");
        setDescription("");
        setEditing("");
      })}>
        {editing ? "ذخیره ویرایش" : "افزودن ماژول"}
      </button>
      </div>
      {snap.modules.map((item) => (
        <article key={item.id} className={`${card} border-r-4`} style={{ borderRightColor: item.isActive ? "#7b61ff" : "#cbd0e0" }}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 font-bold">{item.title}</p>
            <Pill tint={item.isActive ? "#178a57" : "#8a93a8"}>{item.isActive ? "فعال" : "خاموش"} · ترتیب {faNum(item.order)}</Pill>
          </div>
          <p className="mt-1 text-sm leading-7 text-muted">{item.description}</p>
          <p className="mt-1 text-xs text-muted">{faNum(snap.lessons.filter((lesson) => lesson.moduleId === item.id).length)} درس</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={chip} onClick={() => { setEditing(item.id); setTitle(item.title); setDescription(item.description); }}>ویرایش</button>
            <button type="button" className={chip} disabled={busy} onClick={() => run(() => callSchool("save-module", { ...item, isActive: !item.isActive }).then(() => undefined))}>{item.isActive ? "خاموش" : "روشن"}</button>
            <button type="button" className={chip} disabled={busy} onClick={() => run(() => callSchool("save-module", { ...item, order: Math.max(0, item.order - 1) }).then(() => undefined))}>بالا</button>
            <button type="button" className={dangerChip} disabled={busy} onClick={() => run(() => callSchool("delete-module", { id: item.id }).then(() => undefined))}>حذف</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function LessonDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  const [moduleId, setModuleId] = useState(snap.modules[0]?.id || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupTitle, setGroupTitle] = useState("سوزن rl");
  const [editing, setEditing] = useState("");
  const lessons = snap.lessons.filter((item) => item.moduleId === moduleId);
  const groups = (snap.groups || []).filter((item) => item.moduleId === moduleId);
  const loose = lessons.filter((item) => !item.groupId);
  return (
    <section className="grid gap-3">
      <div className={`${card} grid gap-3`}>
      <DeskTitle title="ماژول" text="درس‌های همین ماژول پایین‌تر می‌آیند." tint="#4f7cff" />
      <select className={field} value={moduleId} onChange={(event) => setModuleId(event.target.value)}>
        {snap.modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <div className="rounded-2xl bg-[#f3f6ff] p-3">
        <p className="text-sm font-bold text-[#2d5bd8]">مجموعهٔ کشویی داخل همین بخش</p>
        <input className={`mt-2 ${field}`} placeholder="مثلاً سوزن rl" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} />
        <button type="button" disabled={busy || !moduleId || groupTitle.trim().length < 2} className={`mt-2 w-full ${primaryButton}`} onClick={() => run(() => callSchool("pack-group", { moduleId, title: groupTitle.trim() }).then(() => undefined))}>
          درس‌های بدون دسته را بگذار در این مجموعه
        </button>
        <p className="mt-2 text-xs leading-6 text-muted">{faNum(loose.length)} درس هنوز بیرون از مجموعه‌هاست.</p>
      </div>
      </div>
      <div className={`${card} grid gap-3`}>
      <DeskTitle title={editing ? "ویرایش درس" : "درس تازه"} text="درس تازه اول پنهان است؛ با «نشان بده به کارآموز» دیده می‌شود." tint="#4f7cff" />
      <input className={field} placeholder="عنوان درس" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className={`${area} min-h-48 leading-8`} placeholder="متن درس. خط جدید حفظ می‌شود." value={content} onChange={(event) => setContent(event.target.value)} />
      <button type="button" disabled={busy || !moduleId} className={primaryButton} onClick={() => run(async () => {
        const current = lessons.find((item) => item.id === editing);
        await callSchool("save-lesson", { id: editing || undefined, moduleId, title, content, order: current?.order ?? lessons.length, isPublished: current?.isPublished ?? false, groupId: current?.groupId ?? null });
        setTitle("");
        setContent("");
        setEditing("");
      })}>
        {editing ? "ذخیره درس" : "افزودن درس"}
      </button>
      </div>
      {groups.map((group) => (
        <div key={group.id} className="grid gap-2">
          <p className="flex items-center gap-2 px-1 text-sm font-black text-[#2d5bd8]">
            <span className="size-2 rounded-full bg-[#4f7cff]" aria-hidden />
            {group.title}
          </p>
          {lessons.filter((item) => item.groupId === group.id).map((item) => (
            <LessonCard key={item.id} item={item} images={snap.images.filter((image) => image.lessonId === item.id)} groups={groups} busy={busy} run={run} onEdit={() => { setEditing(item.id); setTitle(item.title); setContent(item.content); }} />
          ))}
        </div>
      ))}
      {loose.map((item) => (
        <LessonCard key={item.id} item={item} images={snap.images.filter((image) => image.lessonId === item.id)} groups={groups} busy={busy} run={run} onEdit={() => { setEditing(item.id); setTitle(item.title); setContent(item.content); }} />
      ))}
    </section>
  );
}

function escHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function lessonPdf(item: LessonRow, images: ImageRow[]) {
  const shots = [...images].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const figures = shots
    .map((image) => {
      const src = image.path.startsWith("http") ? image.path : location.origin + image.path;
      const caption = image.caption ? `<figcaption>${escHtml(image.caption)}</figcaption>` : "";
      return `<figure><img src="${escHtml(src)}" alt="${escHtml(image.caption || item.title)}">${caption}</figure>`;
    })
    .join("");
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${escHtml(item.title)}</title>
<style>
  body{font-family:Tahoma,sans-serif;color:#1c3d52;margin:24px;line-height:2}
  h1{font-size:28px;margin:8px 0}
  .place{color:#5c6b73;font-size:14px}
  article{white-space:pre-wrap;font-size:16px}
  img{width:100%;border:1px solid #ddd;border-radius:12px;margin-top:16px}
  figcaption{color:#5c6b73;font-size:14px;margin-top:6px}
  figure{break-inside:avoid}
  @media print { .bar{display:none} body{margin:12px} }
</style></head><body>
<p class="bar"><button onclick="print()" style="font:inherit;padding:12px 18px;border:0;border-radius:12px;background:#1c3d52;color:#fff">ذخیره یا چاپ PDF</button></p>
<p class="place">استودیو پیمان زیبائی‌فر</p>
<h1>${escHtml(item.title)}</h1>
<article>${escHtml(item.content)}</article>
${figures}
<script>addEventListener("load",function(){setTimeout(function(){print()},400)})<\u002fscript>
</body></html>`;
  const tab = window.open("", "_blank");
  if (!tab) {
    window.alert("مرورگر صفحهٔ PDF را بست. اجازهٔ باز شدن صفحه را بده و دوباره بزن.");
    return;
  }
  tab.document.open();
  tab.document.write(html);
  tab.document.close();
}

function LessonCard({ item, images, groups, busy, run, onEdit }: { item: LessonRow; images: ImageRow[]; groups: GroupRow[]; busy: boolean; run: (work: () => Promise<void>) => Promise<void>; onEdit: () => void }) {
  return (
    <article className={`${card} border-r-4`} style={{ borderRightColor: item.isPublished ? "#22a06b" : "#f0a43a" }}>
      <p className="font-bold">{item.title}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <Pill tint={item.isPublished ? "#178a57" : "#c26a0a"}>{item.isPublished ? "کارآموز این درس را می‌بیند" : "کارآموز این درس را نمی‌بیند"}</Pill>
        {images.length ? <Pill tint="#1f8fb0">{faNum(images.length)} تصویر</Pill> : null}
      </div>
      {groups.length ? (
        <select className="mt-2 h-10 w-full rounded-xl border border-border px-2 text-sm" value={item.groupId || ""} onChange={(event) => run(() => callSchool("save-lesson", { ...item, groupId: event.target.value || null }).then(() => undefined))}>
          <option value="">بدون مجموعه</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
        </select>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={chip} onClick={onEdit}>ویرایش</button>
        <button type="button" className={`${chip} font-bold text-[#5b4ddb]`} onClick={() => lessonPdf(item, images)}>دانلود PDF</button>
        <button type="button" className={chip} disabled={busy} onClick={() => run(() => callSchool("save-lesson", { ...item, isPublished: !item.isPublished }).then(() => undefined))}>{item.isPublished ? "پنهان کن" : "نشان بده به کارآموز"}</button>
        <button type="button" className={dangerChip} disabled={busy} onClick={() => run(() => callSchool("delete-lesson", { id: item.id }).then(() => undefined))}>حذف</button>
      </div>
    </article>
  );
}

function ImageDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  const [lessonId, setLessonId] = useState(snap.lessons[0]?.id || "");
  const [caption, setCaption] = useState("");
  const images = snap.images.filter((item) => item.lessonId === lessonId);
  return (
    <section className="grid gap-3">
      <div className={`${card} grid gap-3`}>
      <DeskTitle title="تصویر درس" text="اول شرح فارسی را بنویس، بعد عکس را انتخاب کن؛ همان لحظه ذخیره می‌شود." tint="#2bb5d8" />
      <select className={field} value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
        {snap.lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <input className={field} placeholder="شرح تصویر" value={caption} onChange={(event) => setCaption(event.target.value)} />
      <input type="file" accept="image/*" disabled={busy || !lessonId} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        void run(async () => {
          const imageData = await compressImage(file);
          await callSchool("save-image", { lessonId, caption, order: images.length, imageData });
          setCaption("");
        });
      }} />
      <p className="text-xs text-muted">{faNum(images.length)} تصویر روی این درس</p>
      </div>
      {images.map((item) => (
        <article key={item.id} className={card}>
          <img src={item.path} alt="" className="max-h-48 w-full rounded-2xl bg-[#f3f4fb] object-contain" />
          <p className="mt-2 text-sm leading-7">{item.caption || "بدون شرح"}</p>
          <button type="button" className={`mt-2 ${dangerChip}`} disabled={busy} onClick={() => run(() => callSchool("delete-image", { id: item.id }).then(() => undefined))}>حذف تصویر</button>
        </article>
      ))}
    </section>
  );
}

function CodeDesk({ snap, busy, run, flash, onStats }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void>; flash: (text: string) => void; onStats: (codeId: string) => void }) {
  const [count, setCount] = useState(1);
  const [maxDevices, setMaxDevices] = useState(1);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  return (
    <section className="grid gap-3">
      <div className={`${card} grid gap-3`}>
      <DeskTitle title="ساخت کد ورود" text="هر کد برای یک کارآموز؛ نامش را در یادداشت بنویس تا در آمار پیدایش کنی." tint="#f08a24" />
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs font-bold text-muted">
          تعداد کد
          <input className={field} type="number" min={1} max={30} value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-muted">
          دستگاه برای هر کد
          <input className={field} type="number" min={1} max={5} value={maxDevices} onChange={(event) => setMaxDevices(Number(event.target.value))} />
        </label>
      </div>
      <input className={field} placeholder="یادداشت، مثلاً نام هنرجو" value={note} onChange={(event) => setNote(event.target.value)} />
      <button type="button" disabled={busy} className={primaryButton} onClick={() => run(async () => {
        const data = await callSchool("make-codes", { count, maxDevices, note });
        setFresh(data.codes || []);
        flash("کدها ساخته شد. همین‌جا کپی کن.");
      })}>
        ساخت کد
      </button>
      {fresh.length ? <pre className="overflow-x-auto rounded-2xl bg-[#1b2440] p-3 text-sm text-white" dir="ltr">{fresh.join("\n")}</pre> : null}
      </div>
      {snap.codes.map((item) => (
        <article key={item.id} className={`${card} border-r-4`} style={{ borderRightColor: item.isActive ? "#f08a24" : "#cbd0e0" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{item.note || "بدون نام"}</p>
            <Pill tint={item.isActive ? "#178a57" : "#8a93a8"}>{item.isActive ? "فعال" : "خاموش"}</Pill>
          </div>
          <p className="mt-1 break-all font-bold tracking-wide text-[#3a4466]" dir="ltr">{item.code}</p>
          <p className="mt-1 text-sm text-muted">{faNum(item.usedCount)} از {faNum(item.maxDevices)} دستگاه · {item.isActive ? "فعال" : "خاموش"}{item.note ? ` · ${item.note}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={chip} disabled={busy} onClick={() => run(() => callSchool("set-code", { id: item.id, isActive: !item.isActive }).then(() => undefined))}>{item.isActive ? "غیرفعال" : "فعال"}</button>
            <button type="button" className={`${chip} font-bold text-[#178a57]`} onClick={() => onStats(item.id)}>آمار مطالعه</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function AccessDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  return (
    <section className="grid gap-3">
      <DeskTitle title="دستگاه‌های فعال" text="هر گوشی که با کد وارد شده؛ با «بستن دستگاه» دیگر درس نمی‌بیند." tint="#0f9d8a" />
      {!snap.access.length ? <p className={`${card} text-sm text-muted`}>هنوز دستگاهی فعال نشده.</p> : null}
      {snap.access.map((item) => (
        <article key={item.id} className={`${card} border-r-4`} style={{ borderRightColor: item.isBlocked ? "#e5484d" : "#0f9d8a" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold" dir="ltr">{item.code}</p>
            <Pill tint={item.isBlocked ? "#d93d42" : "#0b8a79"}>{item.isBlocked ? "بسته" : "باز"}</Pill>
          </div>
          <p className="mt-1 text-xs break-all text-muted" dir="ltr">{item.deviceId}</p>
          <p className="mt-1 text-xs text-muted">آخرین بار: {tehranTime(item.lastSeen)} (به وقت تهران)</p>
          <button type="button" className={`mt-2 ${chip}`} disabled={busy} onClick={() => run(() => callSchool("set-access", { id: item.id, blocked: !item.isBlocked }).then(() => undefined))}>{item.isBlocked ? "باز کردن" : "بستن دستگاه"}</button>
        </article>
      ))}
    </section>
  );
}

function QuestionDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <section className="grid gap-3">
      <DeskTitle title="سؤال‌های کارآموزها" text="سؤال‌های بی‌جواب اول می‌آیند." tint="#f45b8c" />
      {!snap.questions.length ? <p className={`${card} text-sm text-muted`}>سؤالی نیامده.</p> : null}
      {snap.questions.map((item) => (
        <article key={item.id} className={`${card} border-r-4`} style={{ borderRightColor: item.status === "pending" ? "#f45b8c" : "#22a06b" }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tint={item.status === "pending" ? "#d6336c" : "#178a57"}>{item.status === "pending" ? "منتظر جواب" : "جواب داده‌شده"}</Pill>
            <span className="text-xs text-muted">{item.lessonTitle || "بدون درس"}</span>
          </div>
          <p className="mt-2 leading-7">{item.questionText}</p>
          {item.answerText ? <p className="mt-2 rounded-2xl bg-emerald-50 p-3 text-sm leading-7">{item.answerText}</p> : null}
          <textarea className={`mt-2 min-h-24 ${area}`} placeholder="جواب" value={answers[item.id] ?? item.answerText ?? ""} onChange={(event) => setAnswers({ ...answers, [item.id]: event.target.value })} />
          <button type="button" className={`mt-2 ${primaryButton} h-10`} disabled={busy} onClick={() => run(() => callSchool("answer", { id: item.id, answer: answers[item.id] ?? item.answerText ?? "" }).then(() => undefined))}>ثبت جواب</button>
        </article>
      ))}
    </section>
  );
}

function PreviewDesk({ snap }: { snap: Snap }) {
  const [lessonId, setLessonId] = useState(snap.lessons[0]?.id || "");
  const lesson = snap.lessons.find((item) => item.id === lessonId);
  const images = snap.images.filter((item) => item.lessonId === lessonId);
  return (
    <section className="grid gap-3">
      <DeskTitle title="پیش‌نمایش" text="درس را همان‌طور که کارآموز می‌بیند." tint="#8b5cf6" />
      <select className={field} value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
        {snap.lessons.map((item) => <option key={item.id} value={item.id}>{item.title}{item.isPublished ? "" : " · پیش‌نویس"}</option>)}
      </select>
      {lesson ? (
        <article className={`${card} relative overflow-hidden pt-5`}>
          <div className="admin-stripe absolute inset-x-0 top-0" aria-hidden />
          <h2 className="text-xl font-black">{lesson.title}</h2>
          <p className="mt-3 whitespace-pre-wrap leading-8">{lesson.content}</p>
          {images.map((item) => (
            <figure key={item.id} className="mt-4">
              <img src={item.path} alt={item.caption} className="w-full rounded-2xl bg-[#f3f4fb] object-contain" />
              {item.caption ? <figcaption className="mt-1 text-sm text-muted">{item.caption}</figcaption> : null}
            </figure>
          ))}
        </article>
      ) : <p className="text-sm text-muted">درسی نیست.</p>}
    </section>
  );
}

type StatsFilter = "all" | "reading" | "idle" | "off";

const statusLook: Record<ApprenticeRow["status"], { label: string; tint: string }> = {
  active: { label: "فعال", tint: "#178a57" },
  inactive: { label: "غیرفعال", tint: "#8a93a8" },
  expired: { label: "منقضی", tint: "#c26a0a" },
};

function studyCount(row: ApprenticeRow) {
  return row.lessons.reduce((n, lesson) => n + lesson.opens, 0);
}

function ProgressBar({ percent, tint = "#22a06b" }: { percent: number; tint?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#eef0f7]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(percent ? 3 : 0, percent)}%`, background: `linear-gradient(90deg, ${tint}, ${tint}aa)` }} />
    </div>
  );
}

function ApprenticeDetail({ row }: { row: ApprenticeRow }) {
  const opened = row.lessons.filter((lesson) => lesson.opens > 0 || lesson.completedAt);
  const done = row.lessons.filter((lesson) => lesson.completedAt);
  return (
    <div className="grid gap-3 rounded-2xl bg-[#f7f8fd] p-3 text-sm">
      <div className="grid gap-1 text-xs text-muted">
        <p>کد: <span className="font-bold text-[#3a4466]" dir="ltr">{row.code}</span></p>
        <p>ساخت کد: {tehranTime(row.createdAt)}{row.expiresAt ? ` · پایان اعتبار: ${tehranTime(row.expiresAt)}` : ""}</p>
        <p>
          دستگاه‌ها: {faNum(row.devicesUsed)} از {faNum(row.maxDevices)}
          {row.devicesBlocked ? ` · ${faNum(row.devicesBlocked)} بسته` : ""}
        </p>
        {row.devices.map((device) => (
          <p key={`${device.device}-${device.activatedAt}`} className="pr-3">
            <span dir="ltr">{device.device}</span> · فعال‌سازی {tehranTime(device.activatedAt)} · آخرین بار {tehranTime(device.lastSeen)}
            {device.isBlocked ? " · بسته" : ""}
          </p>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="font-black">پیشرفت هر بخش</p>
        {row.parts.map((part) => (
          <div key={part.partId} className="grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="font-bold">{part.title}</span>
              <span className="text-muted">
                {faNum(part.completed)} از {faNum(part.total)} تمام · {faNum(part.opened)} باز شده · {faNum(part.percent)}٪
              </span>
            </div>
            <ProgressBar percent={part.percent} tint="#4f7cff" />
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="font-black">
          درس‌های خوانده‌شده ({faNum(opened.length)}) · تمام‌شده ({faNum(done.length)})
        </p>
        {!opened.length ? <p className="text-xs text-muted">هنوز هیچ درسی را باز نکرده.</p> : null}
        <ol className="grid gap-1.5">
          {opened.map((lesson) => (
            <li key={lesson.lessonId} className="rounded-xl border border-border bg-white px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0 font-bold">
                  {lesson.seq ? `${faNum(lesson.seq)}. ` : ""}
                  {lesson.title}
                </span>
                {lesson.completedAt ? <Pill tint="#178a57">✓ تمام شد</Pill> : <Pill tint="#4f7cff">در حال خواندن</Pill>}
              </div>
              <p className="mt-1 text-xs leading-6 text-muted">
                {lesson.chapterTitle ? `${lesson.chapterTitle} · ` : ""}
                {faNum(lesson.opens)} بار باز شد
                {lesson.firstOpenAt ? ` · اولین بار ${tehranTime(lesson.firstOpenAt)}` : ""}
                {lesson.lastOpenAt && lesson.lastOpenAt !== lesson.firstOpenAt ? ` · آخرین بار ${tehranTime(lesson.lastOpenAt)}` : ""}
                {lesson.completedAt ? ` · تمام: ${tehranTime(lesson.completedAt)}` : ""}
                {!lesson.visible ? " · این درس الان در فهرست کارآموز نیست" : ""}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ActivityDesk({ focusCode }: { focusCode?: string }) {
  const [data, setData] = useState<Activity | null>(null);
  const [report, setReport] = useState<ApprenticeReport | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatsFilter>("all");
  const [open, setOpen] = useState(focusCode || "");
  useEffect(() => {
    Promise.all([callSchool("apprentices"), callSchool("activity")])
      .then(([apprentices, activity]) => {
        setReport(apprentices as ApprenticeReport);
        setData(activity as Activity);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "خوانده نشد."));
  }, []);
  useEffect(() => {
    if (!focusCode || !report) return;
    setOpen(focusCode);
    requestAnimationFrame(() => {
      const target = [...document.querySelectorAll<HTMLElement>(`[data-apprentice="${focusCode}"]`)].find((node) => node.offsetParent !== null);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [focusCode, report]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (report?.apprentices ?? []).filter((row) => {
      if (needle && !`${row.label} ${row.note} ${row.code}`.toLowerCase().includes(needle)) return false;
      if (filter === "reading") return row.lessons.length > 0;
      if (filter === "idle") return row.lessons.length === 0;
      if (filter === "off") return row.status !== "active";
      return true;
    });
  }, [report, query, filter]);
  if (error) return <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>;
  if (!data || !report) return <p className="text-sm text-muted">در حال خواندن آمار…</p>;
  const topCode = Math.max(1, ...data.codes.map((row) => row.completes * 3 + row.opens));
  const topLesson = Math.max(1, ...data.lessons.map((row) => row.readers));
  const totals = report.totals;
  return (
    <section className="grid gap-4">
      <DeskTitle title="آمار کارآموزها" text="فقط برای مدیر. همهٔ کسانی که کد گرفته‌اند، حتی بدون فعالیت. زمان‌ها به وقت تهران است." tint="#22a06b" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {([
          ["کد کارآموز", totals.codes, "#f08a24"],
          ["کد فعال", totals.activeCodes, "#178a57"],
          ["وارد اپ شده", totals.withDevice, "#0f9d8a"],
          ["درس خوانده", totals.withActivity, "#4f7cff"],
          ["میانگین پیشرفت", `${faNum(totals.averagePercent)}٪`, "#7b61ff"],
        ] as const).map(([label, value, tint]) => (
          <div key={label} className="rounded-2xl border border-border bg-white px-2 py-2.5 shadow-sm">
            <p className="text-xl font-black" style={{ color: tint }}>{typeof value === "number" ? faNum(value) : value}</p>
            <p className="text-xs font-bold text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-6 text-muted">
        پیشرفت = درس‌های تمام‌شده از {faNum(totals.totalLessons)} درسی که الان در فهرست کارآموز است. «بار مطالعه» هر باز کردن درس است (باز کردن دوباره در کمتر از ۳۰ دقیقه یک بار حساب می‌شود). از اپ کلاس ۱.۶.۰ به بعد ثبت می‌شود.
      </p>
      <div className="grid gap-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className={`${field} pr-9`} placeholder="جستجوی نام یا کد" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1 shadow-sm">
          {([
            ["all", "همه"],
            ["reading", "در حال مطالعه"],
            ["idle", "بدون فعالیت"],
            ["off", "غیرفعال یا منقضی"],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" className={`h-9 shrink-0 rounded-xl px-3 text-xs font-bold ${filter === value ? "bg-[#e8f7ef] text-[#178a57]" : "text-muted"}`} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {!rows.length ? <p className={`${card} text-sm text-muted`}>کارآموزی با این جستجو نیست.</p> : null}

      <div className="hidden overflow-x-auto rounded-3xl border border-border bg-white shadow-sm md:block">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="bg-[#f7f8fd] text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-bold">کارآموز</th>
              <th className="px-3 py-2 font-bold">وضعیت</th>
              <th className="px-3 py-2 font-bold">دستگاه</th>
              <th className="px-3 py-2 font-bold">پیشرفت</th>
              <th className="px-3 py-2 font-bold">خوانده / تمام</th>
              <th className="px-3 py-2 font-bold">بار مطالعه</th>
              <th className="px-3 py-2 font-bold">آخرین فعالیت (تهران)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.codeId}>
              <tr data-apprentice={row.codeId} className={`scroll-mt-24 cursor-pointer border-t border-border align-top hover:bg-[#fafbff] ${open === row.codeId ? "bg-[#f7f8fd]" : ""}`} onClick={() => setOpen(open === row.codeId ? "" : row.codeId)}>
                <td className="px-3 py-2">
                  <p className="font-bold">{row.label}{row.isOwnerCode ? " (خودت)" : ""}</p>
                  <p className="whitespace-nowrap text-xs text-muted" dir="ltr">{row.code}</p>
                </td>
                <td className="px-3 py-2"><Pill tint={statusLook[row.status].tint}>{statusLook[row.status].label}</Pill></td>
                <td className="px-3 py-2">{faNum(row.devicesUsed)} از {faNum(row.maxDevices)}</td>
                <td className="px-3 py-2">
                  <p className="mb-1 font-bold text-[#178a57]">{faNum(row.percent)}٪</p>
                  <div className="w-24"><ProgressBar percent={row.percent} /></div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{faNum(row.opened)} / {faNum(row.completed)} از {faNum(row.total)}</td>
                <td className="px-3 py-2">{faNum(studyCount(row))}</td>
                <td className="px-3 py-2 text-xs">
                  {tehranTime(row.lastActivityAt)}
                  {row.lastLessonTitle ? <p className="mt-1 text-muted">{row.lastLessonTitle}</p> : null}
                </td>
              </tr>
              {open === row.codeId ? (
                <tr className="bg-[#f7f8fd]">
                  <td colSpan={7} className="px-3 pb-3"><ApprenticeDetail row={row} /></td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article key={row.codeId} data-apprentice={row.codeId} className={`${card} scroll-mt-24`}>
            <button type="button" className="block w-full text-right" aria-expanded={open === row.codeId} onClick={() => setOpen(open === row.codeId ? "" : row.codeId)}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{row.label}{row.isOwnerCode ? " (خودت)" : ""}</p>
                  <p className="text-xs text-muted" dir="ltr">{row.code}</p>
                </div>
                <Pill tint={statusLook[row.status].tint}>{statusLook[row.status].label}</Pill>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="min-w-0 flex-1"><ProgressBar percent={row.percent} /></div>
                <span className="text-sm font-black text-[#178a57]">{faNum(row.percent)}٪</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#eef3ff] py-1.5"><p className="font-black text-[#2d5bd8]">{faNum(row.opened)}</p><p className="text-[11px] text-muted">درس خوانده</p></div>
                <div className="rounded-xl bg-[#e8f7ef] py-1.5"><p className="font-black text-[#178a57]">{faNum(row.completed)}<span className="text-[11px] font-bold text-muted"> از {faNum(row.total)}</span></p><p className="text-[11px] text-muted">تمام‌شده</p></div>
                <div className="rounded-xl bg-[#fff1e3] py-1.5"><p className="font-black text-[#b45f0e]">{faNum(studyCount(row))}</p><p className="text-[11px] text-muted">بار مطالعه</p></div>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted">
                دستگاه {faNum(row.devicesUsed)} از {faNum(row.maxDevices)} · آخرین فعالیت: {tehranTime(row.lastActivityAt)} (به وقت تهران)
                {row.lastLessonTitle ? ` · ${row.lastLessonTitle}` : ""}
              </p>
              <p className="mt-1 text-xs font-bold text-[#5b4ddb]">{open === row.codeId ? "بستن جزئیات ▲" : "جزئیات درس‌ها ▼"}</p>
            </button>
            {open === row.codeId ? <div className="mt-3"><ApprenticeDetail row={row} /></div> : null}
          </article>
        ))}
      </div>

      <div className={card}>
        <h2 className="text-lg font-black">فعال‌ترین کارآموزها</h2>
        {!data.codes.length ? <p className="mt-2 text-sm text-muted">هنوز فعالیتی ثبت نشده.</p> : null}
        <ol className="mt-2 grid gap-3">
          {data.codes.map((row) => (
            <li key={row.codeId} className="grid gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{row.note || "بدون نام"} <span className="text-xs font-normal text-muted" dir="ltr">{row.code}</span></span>
                <span className="text-xs text-muted">{faNum(row.lessons)} درس · {faNum(row.opens)} بار باز · {faNum(row.completes)} تمام‌شده</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF0FF]">
                <div className="h-full rounded-full bg-gradient-to-l from-[#7B61FF] to-[#22A06B]" style={{ width: `${Math.round(((row.completes * 3 + row.opens) / topCode) * 100)}%` }} />
              </div>
              {row.lastAt ? <span className="text-xs text-muted">آخرین فعالیت: {tehranTime(row.lastAt)} (به وقت تهران)</span> : null}
            </li>
          ))}
        </ol>
      </div>
      <div className={card}>
        <h2 className="text-lg font-black">پرخواننده‌ترین درس‌ها</h2>
        {!data.lessons.length ? <p className="mt-2 text-sm text-muted">هنوز درسی خوانده نشده.</p> : null}
        <ol className="mt-2 grid gap-3">
          {data.lessons.map((row) => (
            <li key={row.lessonId} className="grid gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{row.title}</span>
                <span className="text-xs text-muted">{faNum(row.readers)} کارآموز · {faNum(row.opens)} بار باز · {faNum(row.completes)} تمام‌شده</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#FFF2E5]">
                <div className="h-full rounded-full bg-gradient-to-l from-[#F08A24] to-[#F45B8C]" style={{ width: `${Math.round((row.readers / topLesson) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
