import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

export const Route = createFileRoute("/studio/teach/print")({
  component: LessonPrintPage,
  head: () => ({ meta: [{ title: "PDF درس" }] }),
});

type LessonRow = { id: string; moduleId: string; title: string; content: string; groupId: string | null };
type ImageRow = { id: string; lessonId: string; path: string; caption: string; order: number };
type ModuleRow = { id: string; title: string };
type GroupRow = { id: string; title: string };

function LessonPrintPage() {
  const { user, isPending } = useCurrentUserState();
  const owner = isStudioOwnerEmail(user?.primaryEmail);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [place, setPlace] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!owner) return;
    const id = new URLSearchParams(window.location.search).get("lesson") || "";
    if (!id) {
      setError("درس مشخص نیست.");
      return;
    }
    fetch("/api/tattoo-school?op=snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "خوانده نشد.");
        const lesson = ((data.lessons || []) as LessonRow[]).find((item) => item.id === id);
        if (!lesson) throw new Error("این درس پیدا نشد.");
        const moduleTitle = ((data.modules || []) as ModuleRow[]).find((item) => item.id === lesson.moduleId)?.title || "";
        const groupTitle = ((data.groups || []) as GroupRow[]).find((item) => item.id === lesson.groupId)?.title || "";
        setTitle(lesson.title);
        setContent(lesson.content);
        setPlace([moduleTitle, groupTitle].filter(Boolean).join(" · "));
        setImages(
          ((data.images || []) as ImageRow[])
            .filter((item) => item.lessonId === id)
            .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
        );
        setReady(true);
        document.title = lesson.title;
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "خوانده نشد."));
  }, [owner]);

  useEffect(() => {
    if (!ready) return;
    const nodes = Array.from(document.images);
    let pending = nodes.length;
    const go = () => window.setTimeout(() => window.print(), 300);
    if (!pending) {
      go();
      return;
    }
    const done = () => {
      pending -= 1;
      if (pending <= 0) go();
    };
    for (const image of nodes) {
      if (image.complete) done();
      else {
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      }
    }
  }, [ready]);

  if (isPending) return <p className="p-6 text-sm">در حال بررسی ورود…</p>;
  if (!owner) return <p className="p-6 text-sm">این صفحه فقط برای مدیر استودیو است.</p>;
  if (error) return <p className="p-6 text-sm text-red-800">{error}</p>;
  if (!ready) return <p className="p-6 text-sm">در حال آماده کردن PDF…</p>;

  return (
    <main dir="rtl" className="mx-auto max-w-3xl bg-white px-6 py-8 text-[#1c3d52]">
      <button type="button" className="mb-6 h-12 rounded-2xl bg-[#1C3D52] px-5 text-sm font-bold text-white print:hidden" onClick={() => window.print()}>
        ذخیره یا چاپ PDF
      </button>
      <p className="text-sm font-bold text-[#9a7340]">استودیو پیمان زیبائی‌فر</p>
      {place ? <p className="mt-1 text-sm text-[#5c6b73]">{place}</p> : null}
      <h1 className="mt-2 text-3xl font-black leading-tight">{title}</h1>
      <article className="mt-6 whitespace-pre-wrap text-base leading-9">{content}</article>
      {images.map((image) => (
        <figure key={image.id} className="mt-6 break-inside-avoid">
          <img src={image.path} alt={image.caption || title} className="w-full rounded-xl border border-[#1c3d52]/10 bg-white" />
          {image.caption ? <figcaption className="mt-2 text-sm leading-7 text-[#5c6b73]">{image.caption}</figcaption> : null}
        </figure>
      ))}
    </main>
  );
}
