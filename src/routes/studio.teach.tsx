import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
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

const sections = ["ماژول", "درس", "تصویر", "کد", "دسترسی", "سؤال", "پیش‌نمایش"] as const;

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
  const [section, setSection] = useState<(typeof sections)[number]>("ماژول");
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

  if (isPending) return <Shell><p className="text-sm">در حال بررسی ورود…</p></Shell>;
  if (!owner) {
    return (
      <Shell>
        <p className="text-sm leading-7">این بخش فقط برای مدیر استودیو است.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-4" dir="rtl">
        <div>
          <Link to="/studio/admin" search={{ tab: "calendar" }} className="text-sm text-[#1C3D52]">
            بازگشت به میز کار
          </Link>
          <h1 className="mt-2 text-2xl font-black">آموزش تاتو</h1>
          <p className="mt-1 text-sm leading-7 text-muted">
            درس منتشرشده همان لحظه برای هنرجویی می‌آید که کد دارد. خودش این آدرس را باز می‌کند:
          </p>
          <a href="/studio/class" className="mt-2 inline-flex text-sm font-bold text-[#1C3D52] underline">
            kasbokarapp.com/studio/class
          </a>
          <a href="/api/tattoo-apk" className="mt-2 block text-sm font-bold text-[#1C3D52] underline">
            دانلود اپ ۱.۵.۰
          </a>
          {snap?.ownerCode ? (
            <label className="mt-3 block">
              <span className="text-sm font-bold">کد ورود خودت، مثل کارآموز</span>
              <input
                readOnly
                value={snap.ownerCode}
                dir="ltr"
                className="mt-1 h-14 w-full rounded-2xl border border-[#1C3D52] bg-white px-3 text-center text-lg font-black tracking-wider"
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {sections.map((item) => (
            <button key={item} type="button" className={section === item ? "h-11 shrink-0 rounded-full bg-[#1C3D52] px-4 text-sm font-bold text-white" : "h-11 shrink-0 rounded-full border border-border px-4 text-sm"} onClick={() => setSection(item)}>
              {item}
            </button>
          ))}
        </div>
        {error ? <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p> : null}
        {notice ? <p className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{notice}</p> : null}
        {!snap ? <p className="text-sm text-muted">در حال خواندن…</p> : null}
        {snap && section === "ماژول" ? <ModuleDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "درس" ? <LessonDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "تصویر" ? <ImageDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "کد" ? <CodeDesk snap={snap} busy={busy} run={run} flash={setNotice} /> : null}
        {snap && section === "دسترسی" ? <AccessDesk snap={snap} busy={busy} run={run} /> : null}
        {snap && section === "سؤال" ? <QuestionDesk snap={snap} busy={busy} run={run} /> : null}
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
      <input className="h-11 rounded-xl border border-border px-3" placeholder="نام ماژول" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className="min-h-24 rounded-xl border border-border px-3 py-2" placeholder="توضیح کوتاه" value={description} onChange={(event) => setDescription(event.target.value)} />
      <button type="button" disabled={busy} className="h-11 rounded-xl bg-[#1C3D52] text-sm font-bold text-white" onClick={() => run(async () => {
        await callSchool("save-module", { id: editing || undefined, title, description, order: editing ? snap.modules.find((item) => item.id === editing)?.order ?? snap.modules.length : snap.modules.length, isActive: true });
        setTitle("");
        setDescription("");
        setEditing("");
      })}>
        {editing ? "ذخیره ویرایش" : "افزودن ماژول"}
      </button>
      {snap.modules.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border p-3">
          <p className="font-bold">{item.title}</p>
          <p className="mt-1 text-sm leading-7 text-muted">{item.description}</p>
          <p className="mt-1 text-xs">{item.isActive ? "فعال" : "خاموش"} · ترتیب {item.order}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="h-10 rounded-xl border px-3 text-sm" onClick={() => { setEditing(item.id); setTitle(item.title); setDescription(item.description); }}>ویرایش</button>
            <button type="button" className="h-10 rounded-xl border px-3 text-sm" disabled={busy} onClick={() => run(() => callSchool("save-module", { ...item, isActive: !item.isActive }).then(() => undefined))}>{item.isActive ? "خاموش" : "روشن"}</button>
            <button type="button" className="h-10 rounded-xl border px-3 text-sm" disabled={busy} onClick={() => run(() => callSchool("save-module", { ...item, order: Math.max(0, item.order - 1) }).then(() => undefined))}>بالا</button>
            <button type="button" className="h-10 rounded-xl border px-3 text-sm text-red-800" disabled={busy} onClick={() => run(() => callSchool("delete-module", { id: item.id }).then(() => undefined))}>حذف</button>
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
      <select className="h-11 rounded-xl border border-border px-3" value={moduleId} onChange={(event) => setModuleId(event.target.value)}>
        {snap.modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <div className="rounded-2xl border border-[#1C3D52]/20 p-3">
        <p className="text-sm font-bold">مجموعهٔ کشویی داخل همین بخش</p>
        <input className="mt-2 h-11 w-full rounded-xl border border-border px-3" placeholder="مثلاً سوزن rl" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} />
        <button type="button" disabled={busy || !moduleId || groupTitle.trim().length < 2} className="mt-2 h-11 w-full rounded-xl bg-[#1C3D52] text-sm font-bold text-white" onClick={() => run(() => callSchool("pack-group", { moduleId, title: groupTitle.trim() }).then(() => undefined))}>
          درس‌های بدون دسته را بگذار در این مجموعه
        </button>
        <p className="mt-2 text-xs leading-6 text-muted">{loose.length} درس هنوز بیرون از مجموعه‌هاست.</p>
      </div>
      <input className="h-11 rounded-xl border border-border px-3" placeholder="عنوان درس" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className="min-h-48 rounded-xl border border-border px-3 py-2 leading-8" placeholder="متن درس. خط جدید حفظ می‌شود." value={content} onChange={(event) => setContent(event.target.value)} />
      <button type="button" disabled={busy || !moduleId} className="h-11 rounded-xl bg-[#1C3D52] text-sm font-bold text-white" onClick={() => run(async () => {
        const current = lessons.find((item) => item.id === editing);
        await callSchool("save-lesson", { id: editing || undefined, moduleId, title, content, order: current?.order ?? lessons.length, isPublished: current?.isPublished ?? false, groupId: current?.groupId ?? null });
        setTitle("");
        setContent("");
        setEditing("");
      })}>
        {editing ? "ذخیره درس" : "افزودن درس"}
      </button>
      {groups.map((group) => (
        <div key={group.id} className="grid gap-2">
          <p className="text-sm font-black">{group.title}</p>
          {lessons.filter((item) => item.groupId === group.id).map((item) => (
            <LessonCard key={item.id} item={item} groups={groups} busy={busy} run={run} onEdit={() => { setEditing(item.id); setTitle(item.title); setContent(item.content); }} />
          ))}
        </div>
      ))}
      {loose.map((item) => (
        <LessonCard key={item.id} item={item} groups={groups} busy={busy} run={run} onEdit={() => { setEditing(item.id); setTitle(item.title); setContent(item.content); }} />
      ))}
    </section>
  );
}

function LessonCard({ item, groups, busy, run, onEdit }: { item: LessonRow; groups: GroupRow[]; busy: boolean; run: (work: () => Promise<void>) => Promise<void>; onEdit: () => void }) {
  return (
    <article className="rounded-2xl border border-border p-3">
      <p className="font-bold">{item.title}</p>
      <p className="mt-1 text-xs">{item.isPublished ? "کارآموز این درس را می‌بیند" : "کارآموز این درس را نمی‌بیند"}</p>
      {groups.length ? (
        <select className="mt-2 h-10 w-full rounded-xl border border-border px-2 text-sm" value={item.groupId || ""} onChange={(event) => run(() => callSchool("save-lesson", { ...item, groupId: event.target.value || null }).then(() => undefined))}>
          <option value="">بدون مجموعه</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
        </select>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="h-10 rounded-xl border px-3 text-sm" onClick={onEdit}>ویرایش</button>
        <button type="button" className="h-10 rounded-xl border px-3 text-sm" disabled={busy} onClick={() => run(() => callSchool("save-lesson", { ...item, isPublished: !item.isPublished }).then(() => undefined))}>{item.isPublished ? "پنهان کن" : "نشان بده به کارآموز"}</button>
        <button type="button" className="h-10 rounded-xl border px-3 text-sm text-red-800" disabled={busy} onClick={() => run(() => callSchool("delete-lesson", { id: item.id }).then(() => undefined))}>حذف</button>
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
      <select className="h-11 rounded-xl border border-border px-3" value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
        {snap.lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <input className="h-11 rounded-xl border border-border px-3" placeholder="شرح تصویر" value={caption} onChange={(event) => setCaption(event.target.value)} />
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
      {images.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border p-3">
          <img src={item.path} alt="" className="max-h-48 w-full rounded-xl bg-white object-contain" />
          <p className="mt-2 text-sm">{item.caption || "بدون شرح"}</p>
          <button type="button" className="mt-2 h-10 rounded-xl border px-3 text-sm text-red-800" disabled={busy} onClick={() => run(() => callSchool("delete-image", { id: item.id }).then(() => undefined))}>حذف تصویر</button>
        </article>
      ))}
    </section>
  );
}

function CodeDesk({ snap, busy, run, flash }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void>; flash: (text: string) => void }) {
  const [count, setCount] = useState(1);
  const [maxDevices, setMaxDevices] = useState(1);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <input className="h-11 rounded-xl border border-border px-3" type="number" min={1} max={30} value={count} onChange={(event) => setCount(Number(event.target.value))} />
        <input className="h-11 rounded-xl border border-border px-3" type="number" min={1} max={5} value={maxDevices} onChange={(event) => setMaxDevices(Number(event.target.value))} />
      </div>
      <input className="h-11 rounded-xl border border-border px-3" placeholder="یادداشت، مثلاً نام هنرجو" value={note} onChange={(event) => setNote(event.target.value)} />
      <button type="button" disabled={busy} className="h-11 rounded-xl bg-[#1C3D52] text-sm font-bold text-white" onClick={() => run(async () => {
        const data = await callSchool("make-codes", { count, maxDevices, note });
        setFresh(data.codes || []);
        flash("کدها ساخته شد. همین‌جا کپی کن.");
      })}>
        ساخت کد
      </button>
      {fresh.length ? <pre className="overflow-x-auto rounded-2xl bg-[#1C3D52] p-3 text-sm text-white">{fresh.join("\n")}</pre> : null}
      {snap.codes.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border p-3">
          <p className="font-bold tracking-wide" dir="ltr">{item.code}</p>
          <p className="mt-1 text-sm text-muted">{item.usedCount} از {item.maxDevices} دستگاه · {item.isActive ? "فعال" : "خاموش"}{item.note ? ` · ${item.note}` : ""}</p>
          <button type="button" className="mt-2 h-10 rounded-xl border px-3 text-sm" disabled={busy} onClick={() => run(() => callSchool("set-code", { id: item.id, isActive: !item.isActive }).then(() => undefined))}>{item.isActive ? "غیرفعال" : "فعال"}</button>
        </article>
      ))}
    </section>
  );
}

function AccessDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  return (
    <section className="grid gap-3">
      {!snap.access.length ? <p className="text-sm text-muted">هنوز دستگاهی فعال نشده.</p> : null}
      {snap.access.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border p-3">
          <p className="font-bold" dir="ltr">{item.code}</p>
          <p className="mt-1 text-xs break-all text-muted" dir="ltr">{item.deviceId}</p>
          <p className="mt-1 text-sm">{item.isBlocked ? "بسته" : "باز"}</p>
          <button type="button" className="mt-2 h-10 rounded-xl border px-3 text-sm" disabled={busy} onClick={() => run(() => callSchool("set-access", { id: item.id, blocked: !item.isBlocked }).then(() => undefined))}>{item.isBlocked ? "باز کردن" : "بستن دستگاه"}</button>
        </article>
      ))}
    </section>
  );
}

function QuestionDesk({ snap, busy, run }: { snap: Snap; busy: boolean; run: (work: () => Promise<void>) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <section className="grid gap-3">
      {!snap.questions.length ? <p className="text-sm text-muted">سؤالی نیامده.</p> : null}
      {snap.questions.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border p-3">
          <p className="text-xs text-muted">{item.lessonTitle || "بدون درس"} · {item.status === "pending" ? "منتظر جواب" : "جواب داده‌شده"}</p>
          <p className="mt-2 leading-7">{item.questionText}</p>
          {item.answerText ? <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm leading-7">{item.answerText}</p> : null}
          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-border px-3 py-2" placeholder="جواب" value={answers[item.id] ?? item.answerText ?? ""} onChange={(event) => setAnswers({ ...answers, [item.id]: event.target.value })} />
          <button type="button" className="mt-2 h-10 rounded-xl bg-[#1C3D52] px-3 text-sm font-bold text-white" disabled={busy} onClick={() => run(() => callSchool("answer", { id: item.id, answer: answers[item.id] ?? item.answerText ?? "" }).then(() => undefined))}>ثبت جواب</button>
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
      <select className="h-11 rounded-xl border border-border px-3" value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
        {snap.lessons.map((item) => <option key={item.id} value={item.id}>{item.title}{item.isPublished ? "" : " · پیش‌نویس"}</option>)}
      </select>
      {lesson ? (
        <article className="rounded-3xl border border-border bg-white p-4">
          <h2 className="text-xl font-black">{lesson.title}</h2>
          <p className="mt-3 whitespace-pre-wrap leading-8">{lesson.content}</p>
          {images.map((item) => (
            <figure key={item.id} className="mt-4">
              <img src={item.path} alt={item.caption} className="w-full rounded-2xl bg-[#f7f4ef] object-contain" />
              {item.caption ? <figcaption className="mt-1 text-sm text-muted">{item.caption}</figcaption> : null}
            </figure>
          ))}
        </article>
      ) : <p className="text-sm text-muted">درسی نیست.</p>}
    </section>
  );
}
