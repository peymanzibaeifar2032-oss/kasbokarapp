import { useState } from "react";
import { buildLessonPdf, type PdfBlock } from "@/lib/lesson-pdf";

export function LessonPdfButton({
  title,
  token,
  blocks,
  images,
}: {
  title: string;
  token: string;
  blocks: PdfBlock[];
  images: { path: string; caption: string }[];
}) {
  const [state, setState] = useState<"idle" | "working" | "ready" | "error">("idle");
  const [fileUrl, setFileUrl] = useState("");
  const [filename, setFilename] = useState("درس.pdf");
  const [error, setError] = useState("");

  async function make() {
    setState("working");
    setError("");
    try {
      const file = await buildLessonPdf({ title, blocks, images, token });
      const url = URL.createObjectURL(file.blob);
      const named = new File([file.blob], file.filename, { type: "application/pdf" });
      setFileUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setFilename(file.filename);
      setState("ready");
      const shareFiles = navigator.canShare?.({ files: [named] });
      if (shareFiles && navigator.share) {
        try {
          await navigator.share({ files: [named], title: file.filename });
          return;
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
        }
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "PDF ساخته نشد.");
    }
  }

  return (
    <div className="sticky top-2 z-20 rounded-2xl border border-[#1c3d52]/15 bg-[#f4efe6] p-2">
      <button type="button" disabled={state === "working"} className="h-12 w-full rounded-xl bg-[#1C3D52] text-sm font-black text-white disabled:opacity-60" onClick={() => void make()}>
        {state === "working" ? "در حال ساخت PDF…" : "دانلود PDF"}
      </button>
      {state === "ready" ? (
        <a href={fileUrl} download={filename} className="mt-2 block text-center text-sm font-bold text-[#1C3D52] underline">
          اگر ذخیره نشد، این را بزن: {filename}
        </a>
      ) : null}
      {error ? <p className="mt-2 text-center text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
