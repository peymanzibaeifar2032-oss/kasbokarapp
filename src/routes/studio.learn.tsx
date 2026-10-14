import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { APPRENTICE_LESSONS } from "@/lib/apprentice-lessons";

export const Route = createFileRoute("/studio/learn")({
  component: ApprenticeLearnPage,
  head: () => ({
    meta: [
      { title: "آموزش کارآموز تاتو | گیج سوزن و پوست" },
      { name: "description", content: "کلاس کارآموز استودیو پیمان زیبائی‌فر: قطر سوزن، چیدمان، لایه‌های پوست و عمق." },
    ],
  }),
});

const CHIPS = [
  "گیج سوزن یعنی چه؟",
  "فرق گیج ۱۰ و ۱۲ چیست؟",
  "۱۲۰۷RL را بخوان",
  "لاینر با مگنوم چه فرقی دارد؟",
  "رنگ در کدام لایه پوست می‌نشیند؟",
  "بلوآوت چیست؟",
  "کارآموز روی مشتری تاتو می‌زند؟",
];

type Line = { role: "user" | "assistant"; content: string };

function ApprenticeLearnPage() {
  const [lines, setLines] = useState<Line[]>([
    {
      role: "assistant",
      content: "سؤال سوزن، پوست یا کلاس را همین‌جا بپرس. جواب از درس‌های کلاس است، نه از حدس.",
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    const value = question.trim();
    if (value.length < 2 || busy) return;
    const next = [...lines, { role: "user" as const, content: value }];
    setLines(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/apprentice-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: value,
          history: next.slice(0, -1).slice(-8).map((line) => ({ role: line.role, content: line.content })),
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      setLines((current) => [
        ...current,
        { role: "assistant", content: data.answer || data.error || "جواب درس پیدا نشد." },
      ]);
    } catch {
      setLines((current) => [...current, { role: "assistant", content: "ارتباط قطع شد. یک بار دیگر بپرس." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0c0e12] text-[#f4f1ea]" dir="rtl">
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#d6b16a]">کلاس کارآموز</p>
            <h1 className="text-2xl font-black">آموزش تاتو</h1>
          </div>
          <Link to="/studio/admin" className="text-sm text-white/60">
            هنرجوها
          </Link>
        </div>
        <p className="mt-2 text-sm leading-7 text-white/55">
          گیج سوزن، چیدمان، پوست و عمق. سؤال آزاد بپرس. اگر درس کافی نباشد می‌گوید از پیمان در کلاس بپرس.
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs"
              onClick={() => void ask(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="mt-4 grid flex-1 content-start gap-3">
          {lines.map((line, index) => (
            <p
              key={`${line.role}-${index}`}
              className={`max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-7 ${
                line.role === "user" ? "mr-auto bg-[#d6b16a] text-black" : "bg-white/10 text-[#f4f1ea]"
              }`}
            >
              {line.content}
            </p>
          ))}
          {busy ? <p className="text-sm text-white/45">در حال جواب…</p> : null}
        </div>
        <form
          className="sticky bottom-0 mt-4 flex gap-2 bg-[#0c0e12] py-3"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(text);
          }}
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="سؤال کارآموز را بنویس"
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
          />
          <button type="submit" disabled={busy} className="rounded-full bg-[#d6b16a] px-4 py-3 text-sm font-bold text-black">
            بپرس
          </button>
        </form>
        <p className="pb-4 text-center text-[11px] leading-5 text-white/35">
          {APPRENTICE_LESSONS.length} درس کلاس. آموزش فرم رزرو مشتری جای دیگری است.
        </p>
      </main>
    </div>
  );
}
