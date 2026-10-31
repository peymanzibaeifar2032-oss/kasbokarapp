import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

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
  const [view, setView] = useState<"home" | "module" | "lesson" | "questions">("home");
  const [modules, setModules] = useState<ModuleCard[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [catalog, setCatalog] = useState<Record<string, Catalog>>({});
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState("");

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
    window.scrollTo(0, 0);
    const data = await load(`/api/tattoo/lesson/${id}`);
    setLesson(data.lesson);
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
  const place = sequence.findIndex((item) => item.id === lesson?.id);
  const previousLesson = place > 0 ? sequence[place - 1] : null;
  const nextLesson = place >= 0 && place < sequence.length - 1 ? sequence[place + 1] : null;

  function LessonNav({ stick = false }: { stick?: boolean }) {
    return (
      <div className={`${stick ? "sticky bottom-3 z-10" : ""} mt-4 grid grid-cols-2 gap-2 rounded-2xl border p-2 ${card}`}>
        <button type="button" disabled={!previousLesson} className="h-12 rounded-xl border text-sm font-bold disabled:opacity-35" onClick={() => previousLesson && void openLesson(previousLesson.id)}>
          درس قبل
        </button>
        <button type="button" disabled={!nextLesson} className="h-12 rounded-xl bg-[#1c3d52] text-sm font-bold text-white disabled:opacity-35" onClick={() => nextLesson && void openLesson(nextLesson.id)}>
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

      {view === "home" ? (
        <section className="mt-6 grid gap-3">
          {!modules.length ? <p className="leading-8 opacity-70">هنوز درسی منتشر نشده. به محض انتشار در پنل، همین‌جا می‌آید.</p> : null}
          {modules.map((item, index) => {
            const box = catalog[item.id] || { groups: [], lessons: [] };
            const loose = box.lessons.filter((lesson) => !box.groups.some((group) => group.lessons.some((row) => row.id === lesson.id)));
            return (
              <article key={item.id} className={`rounded-3xl border p-5 ${card}`}>
                <p className="text-xs font-bold text-[#9a7340]">بخش {index + 1}</p>
                <h2 className="mt-1 text-xl font-black">{item.title}</h2>
                <div className="mt-3 grid gap-2">
                  {box.groups.map((group) => (
                    <details key={group.id} className="rounded-2xl border border-current/10 px-3 py-2">
                      <summary className="cursor-pointer py-2 text-base font-black">{group.title}</summary>
                      <div className="grid gap-2 pb-2">
                        {group.lessons.map((lesson, lessonIndex) => (
                          <button key={lesson.id} type="button" className="flex items-center gap-3 rounded-2xl px-1 py-2 text-right" onClick={() => { setModuleId(item.id); void openLesson(lesson.id); }}>
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1c3d52] text-xs font-black text-white">{lessonIndex + 1}</span>
                            <span className="font-bold">{lesson.title}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  ))}
                  {loose.map((lesson) => (
                    <button key={lesson.id} type="button" className="rounded-2xl px-1 py-2 text-right font-bold" onClick={() => { setModuleId(item.id); void openLesson(lesson.id); }}>
                      {lesson.title}
                    </button>
                  ))}
                  {!box.groups.length && !loose.length ? <p className="text-sm opacity-70">هنوز درس منتشرشده ندارد.</p> : null}
                </div>
              </article>
            );
          })}
        </section>
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
        <article className="mt-6">
          <LessonNav />
          <h2 className="mt-3 text-3xl font-black leading-tight">{lesson.title}</h2>
          <p className="mt-5 whitespace-pre-wrap text-lg leading-10">{lesson.content}</p>
          {lesson.images.map((image) => (
            <LessonFigure key={image.id} image={image} token={token} onZoom={setZoom} />
          ))}
          <AskBox token={token} lessonId={lesson.id} onDone={() => void openQuestions()} />
          <LessonNav stick />
        </article>
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
