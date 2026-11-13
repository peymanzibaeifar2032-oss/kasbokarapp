import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { LessonView } from "@/lib/tattoo-curriculum/index.ts";
import { fa, type IndexPart, type RecentLesson } from "@/lib/tattoo-curriculum/class-index.ts";
import { LessonPdfButton } from "@/components/studio/lesson-pdf-button";
import { curriculumPdfBlocks, plainPdfBlocks } from "@/lib/lesson-pdf";

export const Route = createFileRoute("/studio/class")({
  component: ClassRoom,
  head: () => ({
    meta: [
      { title: "کلاس آموزش تاتو" },
      { name: "description", content: "کلاس آموزش تاتو برای هنرجوهایی که کد ورود دارند." },
    ],
  }),
});

type ModuleCard = { id: string; title: string; description: string; order: number };
type LessonCard = { id: string; title: string; order: number; groupId?: string | null };
type LessonGroup = { id: string; title: string; order: number; lessons: LessonCard[] };
type Catalog = { groups: LessonGroup[]; lessons: LessonCard[] };
type LessonImage = { id: string; path: string; caption: string; order: number };
type Lesson = { id: string; moduleId: string; title: string; content: string; images: LessonImage[] };
function splitLesson(content: string) {
  const marker = "\n---تمرین---\n";
  const cut = content.indexOf(marker);
  if (cut < 0) return { study: content, practice: "" };
  return { study: content.slice(0, cut).trim(), practice: content.slice(cut + marker.length).trim() };
}
type CurImage = LessonView["images"][number] & { path: string };
type CurLesson = Omit<LessonView, "images"> & { images: CurImage[] };
type Curriculum = {
  parts: IndexPart[];
  recent: RecentLesson[];
  lessonCount: number;
  chapterCount: number;
  archivedOldLessonIds: string[];
  glossaryReading?: { id: string; title: string };
};
type Question = { id: string; lessonId: string | null; questionText: string; answerText: string | null; status: string };

const TOKEN_KEY = "tattoo-class-token";
const DEVICE_KEY = "tattoo-class-device";

function deviceId() {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved && saved.length >= 8) return saved;
  const next = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, next);
  return next;
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("کد این دستگاه دیگر معتبر نیست.");
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "انجام نشد.");
  return data;
}

function ClassRoom() {
  const [token, setToken] = useState("");
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) || "");
    setDark(localStorage.getItem("tattoo-class-dark") === "1");
    setReady(true);
  }, []);

  function enter(next: string) {
    localStorage.setItem(TOKEN_KEY, next);
    setToken(next);
  }

  function leave() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
  }

  function toggleDark() {
    setDark((value) => {
      localStorage.setItem("tattoo-class-dark", value ? "0" : "1");
      return !value;
    });
  }

  if (!ready) return null;

  return (
    <div dir="rtl" className={dark ? "min-h-dvh bg-[#10161b] text-[#f4efe6]" : "min-h-dvh bg-[#f4efe6] text-[#1c3d52]"}>
      {token ? (
        <Library token={token} dark={dark} onLeave={leave} onDark={toggleDark} onExpired={leave} />
      ) : (
        <Gate dark={dark} onDark={toggleDark} onEnter={enter} />
      )}
    </div>
  );
}

function Gate({ dark, onDark, onEnter }: { dark: boolean; onDark: () => void; onEnter: (token: string) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tattoo/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, deviceId: deviceId() }),
      });
      const data = await readJson(response);
      if (!data.token) throw new Error("ورود انجام نشد.");
      onEnter(data.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <button type="button" className="absolute left-4 top-4 h-11 rounded-full px-3 text-sm" onClick={onDark}>
        {dark ? "روشن" : "تیره"}
      </button>
      <p className="text-sm font-bold text-[#9a7340]">استودیو پیمان</p>
      <h1 className="mt-2 text-4xl font-black leading-tight">کلاس آموزش تاتو</h1>
      <p className="mt-4 text-base leading-8 opacity-80">
        این کلاس فقط برای کسی است که پرداخت کرده و کد ورود گرفته. بدون کد، درسی نشان داده نمی‌شود.
      </p>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="کد ورود"
        dir="ltr"
        className={dark ? "mt-8 h-14 rounded-2xl border border-white/15 bg-[#182229] px-4 text-center text-lg tracking-wider" : "mt-8 h-14 rounded-2xl border border-[#1c3d52]/15 bg-white px-4 text-center text-lg tracking-wider"}
      />
      {error ? <p className="mt-3 text-sm leading-7 text-red-700">{error}</p> : null}
      <button type="button" disabled={busy || code.trim().length < 4} className="mt-4 h-14 rounded-2xl bg-[#1c3d52] text-base font-black text-white disabled:opacity-50" onClick={() => void submit()}>
        {busy ? "در حال بررسی کد…" : "ورود به کلاس"}
      </button>
    </main>
  );
}

function Library({
  token,
  dark,
  onLeave,
  onDark,
  onExpired,
}: {
  token: string;
  dark: boolean;
  onLeave: () => void;
  onDark: () => void;
  onExpired: () => void;
}) {
  const [view, setView] = useState<"home" | "module" | "lesson" | "questions" | "cur">("home");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [curLesson, setCurLesson] = useState<CurLesson | null>(null);
  const [modules, setModules] = useState<ModuleCard[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [catalog, setCatalog] = useState<Record<string, Catalog>>({});
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState("");
  const [part, setPart] = useState<"study" | "practice">("study");

  async function load(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    try {
      return await readJson(response);
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("معتبر نیست")) onExpired();
      throw cause;
    }
  }

  useEffect(() => {
    load("/api/tattoo/curriculum")
      .then((data) => setCurriculum(normalizeIndex(data)))
      .catch(() => setCurriculum(null));
  }, [token]);

  async function openCurLesson(id: string) {
    setError("");
    setView("cur");
    setPart("study");
    window.scrollTo(0, 0);
    try {
      const data = await load(`/api/tattoo/curriculum-lesson/${id}`);
      setCurLesson(data.lesson);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خوانده نشد.");
    }
  }

  useEffect(() => {
    load("/api/tattoo/modules")
      .then(async (data) => {
        const list = (data.modules || []) as ModuleCard[];
        setModules(list);
        const pairs = await Promise.all(
          list.map(async (item) => {
            const lessonsData = await load(`/api/tattoo/lessons/${item.id}`);
            return [item.id, { groups: lessonsData.groups || [], lessons: lessonsData.lessons || [] } as Catalog] as const;
          }),
        );
        setCatalog(Object.fromEntries(pairs));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "خوانده نشد."));
  }, [token]);

  async function openModule(item: ModuleCard) {
    setError("");
    setModuleId(item.id);
    setView("module");
    const data = await load(`/api/tattoo/lessons/${item.id}`);
    setCatalog((current) => ({ ...current, [item.id]: { groups: data.groups || [], lessons: data.lessons || [] } }));
  }

  async function openLesson(id: string) {
    setError("");
    setView("lesson");
    setPart("study");
    window.scrollTo(0, 0);
    setLesson(null);
    try {
      const data = await load(`/api/tattoo/lesson/${id}`);
      setLesson(data.lesson);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خوانده نشد.");
    }
  }

  async function openQuestions() {
    setError("");
    setView("questions");
    const data = await load("/api/tattoo/my-questions");
    setQuestions(data.questions || []);
  }

  const lessons = catalog[moduleId]?.lessons || [];
  const moduleTitle = modules.find((item) => item.id === moduleId)?.title || "درس‌ها";
  const card = dark ? "border-white/10 bg-[#182229]" : "border-[#1c3d52]/10 bg-white";
  const sequence = modules.flatMap((item) => {
    const box = catalog[item.id] || { groups: [], lessons: [] };
    const seen = new Set(box.groups.flatMap((group) => group.lessons.map((lesson) => lesson.id)));
    return [...box.groups.flatMap((group) => group.lessons), ...box.lessons.filter((lesson) => !seen.has(lesson.id))];
  });
  const tocOrder = (curriculum?.parts || []).flatMap((p) => p.chapters.flatMap((c) => c.lessons.filter((l) => l.published).map((l) => l.id)));
  const seqMap = new Map((curriculum?.parts || []).flatMap((p) => p.chapters.flatMap((c) => c.lessons.map((l) => [l.id, l.seq] as const))));
  const seqOf = (id: string, fallback: number) => seqMap.get(id) ?? fallback;
  const panelIds = new Set((curriculum?.parts || []).flatMap((p) => p.chapters.flatMap((c) => c.lessons.filter((l) => l.source === "panel").map((l) => l.id))));
  // Lessons written in studio/teach open from the class tables; book lessons open from the curriculum.
  function openAny(id: string) {
    if (panelIds.has(id)) void openLesson(id);
    else void openCurLesson(id);
  }
  const tocPlace = lesson ? tocOrder.indexOf(lesson.id) : -1;
  const place = sequence.findIndex((item) => item.id === lesson?.id);
  const previousLesson = tocPlace >= 0 ? (tocPlace > 0 ? { id: tocOrder[tocPlace - 1] } : null) : place > 0 ? sequence[place - 1] : null;
  const nextLesson = tocPlace >= 0 ? (tocPlace < tocOrder.length - 1 ? { id: tocOrder[tocPlace + 1] } : null) : place >= 0 && place < sequence.length - 1 ? sequence[place + 1] : null;
  const goLesson = (id: string) => (tocPlace >= 0 ? openAny(id) : void openLesson(id));

  function LessonNav({ stick = false }: { stick?: boolean }) {
    return (
      <div className={`${stick ? "sticky bottom-3 z-10" : ""} mt-4 grid grid-cols-2 gap-2 rounded-2xl border p-2 ${card}`}>
        <button type="button" disabled={!previousLesson} className="h-12 rounded-xl border text-sm font-bold disabled:opacity-35" onClick={() => previousLesson && goLesson(previousLesson.id)}>
          درس قبل
        </button>
        <button type="button" disabled={!nextLesson} className="h-12 rounded-xl bg-[#1c3d52] text-sm font-bold text-white disabled:opacity-35" onClick={() => nextLesson && goLesson(nextLesson.id)}>
          درس بعد
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#9a7340]">کلاس خصوصی</p>
          <h1 className="text-2xl font-black">آموزش تاتو</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" className="h-10 rounded-full border border-current/15 px-3 text-sm" onClick={onDark}>{dark ? "روشن" : "تیره"}</button>
          <button type="button" className="h-10 rounded-full border border-current/15 px-3 text-sm" onClick={onLeave}>خروج</button>
        </div>
      </header>

      <nav className="mt-4 flex gap-2">
        <button type="button" className="h-10 rounded-full bg-[#1c3d52] px-4 text-sm font-bold text-white" onClick={() => setView("home")}>فهرست</button>
        <button type="button" className={`h-10 rounded-full border px-4 text-sm font-bold ${card}`} onClick={() => void openQuestions()}>سؤال‌های من</button>
      </nav>
      {error ? <p className="mt-4 text-sm leading-7 text-red-700">{error}</p> : null}

      {view === "home" && curriculum ? (
        <CurriculumToc curriculum={curriculum} card={card} token={token} onOpen={openAny} />
      ) : null}

      {view === "home" && !curriculum ? (
        <p className="mt-6 leading-8 opacity-70">درس‌نامه هنوز بارگذاری نشده.</p>
      ) : null}

      {view === "cur" && curLesson ? (
        <CurriculumLessonBody
          lesson={curLesson}
          token={token}
          card={card}
          part={part}
          setPart={setPart}
          onZoom={setZoom}
          onQuestions={() => void openQuestions()}
          onOpen={openAny}
          sequence={tocOrder}
          seqOf={seqOf}
        />
      ) : null}

      {view === "module" ? (
        <section className="mt-6 grid gap-3">
          <h2 className="text-xl font-black">{moduleTitle}</h2>
          {!lessons.length ? <p className="leading-8 opacity-70">در این بخش هنوز درس منتشر نشده.</p> : null}
          {lessons.map((item, index) => (
            <button key={item.id} type="button" className={`flex items-center gap-3 rounded-3xl border p-4 text-right ${card}`} onClick={() => void openLesson(item.id)}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1c3d52] text-sm font-black text-white">{index + 1}</span>
              <span className="text-base font-bold">{item.title}</span>
            </button>
          ))}
        </section>
      ) : null}

      {view === "lesson" && lesson ? (
        <LessonBody lesson={lesson} token={token} card={card} part={part} setPart={setPart} onZoom={setZoom} onQuestions={() => void openQuestions()} nav={<LessonNav />} navStick={<LessonNav stick />} />
      ) : null}

      {view === "questions" ? (
        <section className="mt-6 grid gap-3">
          <h2 className="text-xl font-black">سؤال‌های من</h2>
          {!questions.length ? <p className="leading-8 opacity-70">هنوز سؤالی نفرستاده‌ای.</p> : null}
          {questions.map((item) => (
            <article key={item.id} className={`rounded-3xl border p-4 ${card}`}>
              <p className="text-xs font-bold text-[#9a7340]">{item.status === "answered" ? "جواب داده شد" : "منتظر جواب"}</p>
              <p className="mt-2 leading-8">{item.questionText}</p>
              {item.answerText ? <p className="mt-3 rounded-2xl bg-[#1c3d52] p-3 leading-8 text-white">{item.answerText}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {zoom ? (
        <button type="button" className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setZoom("")}>
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </div>
  );
}

function LessonBody({
  lesson,
  token,
  card,
  part,
  setPart,
  onZoom,
  onQuestions,
  nav,
  navStick,
}: {
  lesson: Lesson;
  token: string;
  card: string;
  part: "study" | "practice";
  setPart: (part: "study" | "practice") => void;
  onZoom: (src: string) => void;
  onQuestions: () => void;
  nav: ReactNode;
  navStick: ReactNode;
}) {
  const pieces = splitLesson(lesson.content);
  const showingPractice = part === "practice" && pieces.practice;
  const text = showingPractice ? pieces.practice : pieces.study;
  const images = lesson.images.filter((image) => (image.caption || "").startsWith("تمرین") === Boolean(showingPractice));
  return (
    <article className="mt-6">
      <LessonPdfButton title={lesson.title} token={token} blocks={plainPdfBlocks(lesson.content)} images={lesson.images.map((image) => ({ path: image.path, caption: image.caption }))} />
      {nav}
      <h2 className="mt-3 text-3xl font-black leading-tight">{lesson.title}</h2>
      {pieces.practice ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={`h-11 rounded-full text-sm font-bold ${part === "study" ? "bg-[#1c3d52] text-white" : "border"}`} onClick={() => setPart("study")}>متن درس</button>
          <button type="button" className={`h-11 rounded-full text-sm font-bold ${part === "practice" ? "bg-[#1c3d52] text-white" : "border"}`} onClick={() => setPart("practice")}>تمرین این مهارت</button>
        </div>
      ) : null}
      <p className="mt-5 whitespace-pre-wrap text-lg leading-10">{text}</p>
      {images.map((image) => (
        <LessonFigure key={image.id} image={image} token={token} onZoom={onZoom} />
      ))}
      <AskBox token={token} lessonId={lesson.id} onDone={onQuestions} />
      {navStick}
    </article>
  );
}

function LessonFigure({ image, token, onZoom }: { image: LessonImage; token: string; onZoom: (src: string) => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let url = "";
    let gone = false;
    fetch(image.path, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || gone) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setSrc(""));
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [image.path, token]);
  if (!src) return null;
  return (
    <figure className="mt-6">
      <button type="button" className="block w-full" onClick={() => onZoom(src)}>
        <img src={src} alt={image.caption} className="w-full rounded-3xl bg-white object-contain" />
      </button>
      {image.caption ? <figcaption className="mt-2 text-sm leading-7 opacity-70">{image.caption}</figcaption> : null}
    </figure>
  );
}

function AskBox({ token, lessonId, onDone }: { token: string; lessonId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tattoo/question", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, questionText: text }),
      });
      await readJson(response);
      setText("");
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "فرستاده نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#9a7340]/30 p-4">
      <h3 className="font-black">سؤال از همین درس</h3>
      <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="سؤالت را بنویس" className="mt-3 min-h-28 w-full rounded-2xl border border-current/15 bg-transparent px-3 py-2 leading-8" />
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <button type="button" disabled={busy || text.trim().length < 2} className="mt-3 h-12 w-full rounded-2xl bg-[#9a7340] font-black text-white disabled:opacity-50" onClick={() => void send()}>
        {busy ? "در حال ارسال…" : "فرستادن سؤال"}
      </button>
    </section>
  );
}

/** Older servers sent the book list without numbers or counts; number and count it here the same way. */
function normalizeIndex(data: { parts?: IndexPart[]; recent?: RecentLesson[]; glossaryReading?: { id: string; title: string }; archivedOldLessonIds?: string[] }): Curriculum {
  let seq = 0;
  const parts = (data.parts || []).map((part) => {
    const chapters = (part.chapters || []).filter((chapter) => chapter.lessons.length).map((chapter) => {
      const lessons = chapter.lessons.map((lesson) => {
        seq = lesson.seq || seq + 1;
        return { ...lesson, seq, isNew: Boolean(lesson.isNew) };
      });
      return { ...chapter, lessons, lessonCount: lessons.length, newCount: lessons.filter((lesson) => lesson.isNew).length };
    });
    return { ...part, chapters, chapterCount: chapters.length, lessonCount: chapters.reduce((n, c) => n + c.lessonCount, 0), newCount: chapters.reduce((n, c) => n + c.newCount, 0) };
  }).filter((part) => part.chapters.length);
  return {
    parts,
    recent: data.recent || [],
    lessonCount: parts.reduce((n, p) => n + p.lessonCount, 0),
    chapterCount: parts.reduce((n, p) => n + p.chapterCount, 0),
    archivedOldLessonIds: data.archivedOldLessonIds || [],
    glossaryReading: data.glossaryReading,
  };
}

function NewBadge() {
  return <span className="shrink-0 rounded-full bg-[#d9480f] px-2 py-0.5 text-[11px] font-black text-white">جدید</span>;
}

function CurriculumToc({ curriculum, card, token, onOpen }: { curriculum: Curriculum; card: string; token: string; onOpen: (id: string) => void }) {
  const live = curriculum.parts.reduce((n, p) => n + p.chapters.reduce((m, c) => m + c.lessons.filter((l) => l.published).length, 0), 0);
  return (
    <section className="mt-6 grid gap-4" aria-label="فهرست درس‌ها">
      <div>
        <h2 className="text-xl font-black">فهرست درس‌ها: از مبتدی تا پیشرفته</h2>
        <p className="mt-1 text-sm leading-7 opacity-70">
          {fa(curriculum.parts.length)} بخش · {fa(curriculum.chapterCount)} فصل · {fa(curriculum.lessonCount)} درس
          {live < curriculum.lessonCount ? ` · ${fa(live)} درس منتشر شده` : ""}
        </p>
      </div>
      {curriculum.recent.length ? (
        <section className="rounded-3xl border-2 border-[#d9480f]/40 bg-[#fff4e6] p-4 text-[#1c3d52]" aria-label="درس‌های تازه">
          <h3 className="flex items-center gap-2 text-lg font-black">درس‌های تازه <NewBadge /></h3>
          <div className="mt-2 grid gap-1">
            {curriculum.recent.map((item) => (
              <button key={item.id} type="button" className="flex items-start gap-3 rounded-2xl px-1 py-2 text-right" onClick={() => onOpen(item.id)}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#d9480f] text-xs font-black text-white">{fa(item.seq)}</span>
                <span>
                  <span className="block font-bold">{item.title}</span>
                  <span className="block text-xs opacity-70">{item.partTitle} · {item.chapterTitle}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {curriculum.parts.map((part) => (
        <article key={part.id} className={`rounded-3xl border p-5 ${card}`}>
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#9a7340]">
            {part.level ? <span>سطح: {part.level}</span> : null}
            <span>{fa(part.chapterCount)} فصل · {fa(part.lessonCount)} درس</span>
            {part.newCount ? <span className="text-[#d9480f]">{fa(part.newCount)} درس جدید</span> : null}
          </p>
          <h3 className="mt-1 text-lg font-black">{part.title}</h3>
          {part.description ? <p className="mt-1 text-sm leading-7 opacity-70">{part.description}</p> : null}
          <div className="mt-3 grid gap-2">
            {part.chapters.map((chapter) => (
              <section key={chapter.id} className="rounded-2xl border border-current/10 px-3 py-2">
                <h4 className="flex items-center justify-between gap-3 py-2 text-base font-black">
                  <span>{chapter.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-bold opacity-80">
                    {chapter.newCount ? <NewBadge /> : null}
                    <span className="opacity-70">{fa(chapter.lessonCount)} درس</span>
                  </span>
                </h4>
                <div className="grid gap-1 pb-2">
                  {chapter.lessons.map((lesson) => (
                    <button key={lesson.id} type="button" disabled={!lesson.published} className="flex items-center gap-3 rounded-2xl px-1 py-2 text-right disabled:opacity-45" onClick={() => onOpen(lesson.id)}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1c3d52] text-xs font-black text-white">{fa(lesson.seq)}</span>
                      <span className="font-bold">{lesson.title}</span>
                      {lesson.isNew ? <span className="mr-auto"><NewBadge /></span> : null}
                      {!lesson.published ? <span className="mr-auto shrink-0 text-xs opacity-70">{lesson.held ? "در دست بازبینی" : "به‌زودی"}</span> : null}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
      {curriculum.glossaryReading && live > 0 ? <ReadingBox reading={curriculum.glossaryReading} token={token} card={card} /> : null}
    </section>
  );
}

function CurriculumLessonBody({
  lesson,
  token,
  card,
  part,
  setPart,
  onZoom,
  onQuestions,
  onOpen,
  sequence,
  seqOf,
}: {
  lesson: CurLesson;
  token: string;
  card: string;
  part: "study" | "practice";
  setPart: (part: "study" | "practice") => void;
  onZoom: (src: string) => void;
  onQuestions: () => void;
  onOpen: (id: string) => void;
  sequence: string[];
  seqOf: (id: string, fallback: number) => number;
}) {
  const at = sequence.indexOf(lesson.id);
  const prev = at > 0 ? sequence[at - 1] : null;
  const next = at >= 0 && at < sequence.length - 1 ? sequence[at + 1] : null;
  const nav = (stick: boolean) => (
    <div className={`${stick ? "sticky bottom-3 z-10" : ""} mt-4 grid grid-cols-2 gap-2 rounded-2xl border p-2 ${card}`}>
      <button type="button" disabled={!prev} className="h-12 rounded-xl border text-sm font-bold disabled:opacity-35" onClick={() => prev && onOpen(prev)}>درس قبل</button>
      <button type="button" disabled={!next} className="h-12 rounded-xl bg-[#1c3d52] text-sm font-bold text-white disabled:opacity-35" onClick={() => next && onOpen(next)}>درس بعد</button>
    </div>
  );
  const box = "mt-6 rounded-3xl border p-4";
  return (
    <article className="mt-6" data-lesson={lesson.id}>
      <LessonPdfButton
        title={lesson.title}
        token={token}
        blocks={curriculumPdfBlocks(lesson)}
        images={lesson.images.map((image) => ({ path: image.path, caption: image.caption }))}
      />
      {nav(false)}
      <p className="mt-4 text-xs font-bold text-[#9a7340]">{lesson.partTitle} · {lesson.chapterTitle} · درس {fa(seqOf(lesson.id, lesson.number))} · سطح {lesson.level}</p>
      <h2 className="mt-2 text-3xl font-black leading-tight">{lesson.title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className={`h-11 rounded-full text-sm font-bold ${part === "study" ? "bg-[#1c3d52] text-white" : "border"}`} onClick={() => setPart("study")}>متن درس</button>
        <button type="button" className={`h-11 rounded-full text-sm font-bold ${part === "practice" ? "bg-[#1c3d52] text-white" : "border"}`} onClick={() => setPart("practice")}>تمرین</button>
      </div>
      {part === "study" ? (
        <>
          <p className="mt-5 text-lg font-bold leading-9">{lesson.summary}</p>
          <section className={`${box} ${card}`}>
            <h3 className="font-black">در این درس یاد می‌گیری</h3>
            <ul className="mt-2 list-disc pr-5 leading-8">{lesson.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          {lesson.sections.map((section, index) => (
            <section key={section.heading} className="mt-6">
              <h3 className="text-xl font-black">{section.heading}</h3>
              {(section.paragraphs || []).map((text) => <p key={text} className="mt-3 text-lg leading-9">{text}</p>)}
              {section.bullets?.length ? <ul className="mt-3 list-disc pr-5 text-lg leading-9">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              {lesson.images[index] ? <CurFigure image={lesson.images[index]} token={token} onZoom={onZoom} /> : null}
            </section>
          ))}
          {lesson.images.slice(lesson.sections.length).map((image) => <CurFigure key={image.id} image={image} token={token} onZoom={onZoom} />)}
          {lesson.warnings.length ? (
            <section className="mt-6 rounded-3xl border border-red-700/40 bg-red-700/5 p-4">
              <h3 className="font-black text-red-800">هشدار</h3>
              <ul className="mt-2 list-disc pr-5 leading-8">{lesson.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
          <section className={`${box} border-[#9a7340]/40`}>
            <h3 className="font-black">نکته‌های کلیدی</h3>
            <ul className="mt-2 list-disc pr-5 leading-8">{lesson.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          {lesson.glossary.length ? (
            <section className={`${box} ${card}`}>
              <h3 className="font-black">واژه‌نامه</h3>
              <dl className="mt-2 grid gap-2">
                {lesson.glossary.map((term) => (
                  <div key={term.id}>
                    <dt className="font-bold">{term.fa} <span className="text-xs opacity-60" dir="ltr">({term.en})</span></dt>
                    <dd className="text-sm leading-7 opacity-80">{term.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {lesson.related.length ? (
            <section className="mt-6">
              <h3 className="font-black">درس‌های مرتبط</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {lesson.related.map((item) => (
                  <button key={item.id} type="button" disabled={!item.published} className="rounded-full border px-3 py-1 text-sm disabled:opacity-45" onClick={() => onOpen(item.id)}>
                    {fa(seqOf(item.id, item.number))}. {item.title}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {lesson.readings.map((reading) => (
            <ReadingBox key={reading.id} reading={reading} token={token} card={card} />
          ))}
          <section className="mt-6">
            <h3 className="font-black">منابع</h3>
            <ol className="mt-2 list-decimal pr-5 text-sm leading-7 opacity-80">
              {lesson.sources.map((source) => (
                <li key={source.id}>
                  {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="underline" dir="ltr">{source.title}</a> : <span>{source.title}</span>}
                  <span> — {source.publisher}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <section className={`${box} ${card}`}>
          <h3 className="text-xl font-black">{lesson.practice.goal}</h3>
          <p className="mt-2 text-sm opacity-70">ابزار: {lesson.practice.material}</p>
          <ol className="mt-3 list-decimal pr-5 text-lg leading-9">{lesson.practice.steps.map((item) => <li key={item}>{item}</li>)}</ol>
          <h4 className="mt-4 font-black">معیار قبولی</h4>
          <ul className="mt-2 list-disc pr-5 leading-8">{lesson.practice.passCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="mt-4 rounded-2xl bg-[#9a7340]/10 p-3 text-sm leading-7">کارآموز روی پوست مشتری تاتو نمی‌زند؛ همهٔ تمرین‌ها روی کاغذ، پوست مصنوعی یا میوه انجام می‌شود.</p>
        </section>
      )}
      <AskBox token={token} lessonId={lesson.id} onDone={onQuestions} />
      {nav(true)}
    </article>
  );
}

function CurFigure({ image, token, onZoom }: { image: CurImage; token: string; onZoom: (src: string) => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let url = "";
    let gone = false;
    fetch(image.path, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || gone) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setSrc(""));
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [image.path, token]);
  return (
    <figure className="mt-5">
      {src ? (
        <button type="button" className="block w-full" onClick={() => onZoom(src)}>
          <img src={src} alt={image.alt} className="w-full rounded-3xl border border-black/5 bg-white object-contain" />
        </button>
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-dashed text-sm opacity-60">در حال بارگذاری تصویر…</div>
      )}
      <figcaption className="mt-2 text-sm leading-7 opacity-75">{image.caption}</figcaption>
      <p className="text-xs leading-6 opacity-50">
        {image.credit}
        {image.sourceUrl ? (
          <>
            {" — "}
            <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              صفحهٔ اصلی عکس
            </a>
          </>
        ) : null}
      </p>
    </figure>
  );
}

function ReadingBox({ reading, token, card }: { reading: { id: string; title: string }; token: string; card: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  async function open() {
    if (text) return;
    setState("loading");
    try {
      const response = await fetch(`/api/tattoo/curriculum-reading/${reading.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await readJson(response);
      setText(data.markdown || "");
      setState("idle");
    } catch {
      setState("error");
    }
  }
  return (
    <details className={`mt-6 rounded-3xl border p-4 ${card}`} onToggle={(event) => (event.currentTarget as HTMLDetailsElement).open && void open()}>
      <summary className="cursor-pointer font-black">مطالعهٔ تکمیلی: {reading.title}</summary>
      <p className="mt-2 text-xs leading-6 opacity-60">متن کامل‌تر فصل، ویراسته و با منبع. روش و قوانین استودیو همان است که در متن درس آمده.</p>
      {state === "loading" ? <p className="mt-3 text-sm opacity-70">در حال بارگذاری…</p> : null}
      {state === "error" ? <p className="mt-3 text-sm text-red-700">خوانده نشد.</p> : null}
      {text ? <Markdown text={text} /> : null}
    </details>
  );
}

/** Small, safe Markdown renderer for the edited chapters: headings, paragraphs, lists, tables, quotes, bold, links. */
function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  const inline = (value: string, key: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(value))) {
      if (m.index > last) parts.push(value.slice(last, m.index));
      if (m[1]) parts.push(<strong key={`${key}-b${n++}`}>{m[1]}</strong>);
      else parts.push(<a key={`${key}-a${n++}`} href={m[3]} target="_blank" rel="noreferrer" className="underline">{m[2]}</a>);
      last = re.lastIndex;
    }
    if (last < value.length) parts.push(value.slice(last));
    return parts;
  };
  while (i < lines.length) {
    const line = lines[i];
    const key = `l${i}`;
    if (!line.trim()) { i += 1; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const size = h[1].length <= 2 ? "text-xl" : h[1].length === 3 ? "text-lg" : "text-base";
      out.push(<p key={key} className={`mt-5 font-black ${size}`}>{inline(h[2], key)}</p>);
      i += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i += 1;
      }
      out.push(
        <div key={key} className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm leading-7">
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-current/10 align-top">
                  {row.map((cell, c) => (r === 0 ? <th key={c} className="p-2 text-right font-black">{inline(cell, `${key}-${r}-${c}`)}</th> : <td key={c} className="p-2">{inline(cell, `${key}-${r}-${c}`)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+[.)]|[۰-۹]+[.)])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+[.)]|[۰-۹]+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+[.)]|[۰-۹]+[.)])\s+/, ""));
        i += 1;
      }
      out.push(<ul key={key} className="mt-3 list-disc pr-5 leading-8">{items.map((item, n) => <li key={n}>{inline(item, `${key}-${n}`)}</li>)}</ul>);
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) { quote.push(lines[i].replace(/^>\s?/, "")); i += 1; }
      out.push(<blockquote key={key} className="mt-3 rounded-2xl bg-[#9a7340]/10 p-3 text-sm leading-7">{inline(quote.join(" "), key)}</blockquote>);
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) { out.push(<hr key={key} className="mt-4 opacity-20" />); i += 1; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||>|\s*([-*]|\d+[.)]|[۰-۹]+[.)])\s)/.test(lines[i])) { para.push(lines[i]); i += 1; }
    out.push(<p key={key} className="mt-3 leading-8">{inline(para.join(" "), key)}</p>);
  }
  return <div className="mt-2">{out}</div>;
}
