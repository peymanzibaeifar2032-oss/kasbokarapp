import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/design-images";
import { answerIntake, startIntake, type IntakeDraft, type IntakePayload } from "@/lib/intake-desk";
import type { WizardImage } from "@/components/studio/request-wizard";

type Line = { from: "desk" | "customer"; text: string };

export function IntakeDesk({
  busy,
  preferredDay = "",
  onSubmit,
}: {
  busy: boolean;
  preferredDay?: string;
  onSubmit: (payload: IntakePayload & { images: WizardImage[] }) => void;
}) {
  const opened = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [images, setImages] = useState<WizardImage[]>([]);
  const [chips, setChips] = useState<{ id: string; label: string }[]>([]);
  const [allowImage, setAllowImage] = useState<false | "reference" | "current">(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const first = startIntake(preferredDay);
    setDraft(first.draft);
    setLines(first.say.map((text) => ({ from: "desk", text })));
    setChips(first.chips);
    setAllowImage(first.image);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines, chips]);

  async function apply(raw: string, nextImages = images, shown?: string) {
    if (!draft || busy || waiting) return;
    const turn = answerIntake(draft, raw, {
      design: nextImages.some((image) => image.kind === "reference" || image.kind === "sketch"),
      current: nextImages.some((image) => image.kind === "current"),
    });
    setDraft(turn.draft);
    setChips(turn.payload ? [] : turn.chips);
    setAllowImage(turn.image);
    setText("");
    const customer = shown || customerText(raw);
    if (turn.needsModel && turn.modelQuestion) {
      const history = lines.slice(-8).map((line) => ({
        role: line.from === "customer" ? ("user" as const) : ("assistant" as const),
        content: line.text,
      }));
      setLines((current) => [...current, { from: "customer", text: customer }, { from: "desk", text: "دارم جواب می‌دهم…" }]);
      setWaiting(true);
      const answer = await askStudio(turn.modelQuestion, history);
      setWaiting(false);
      setLines((current) => [
        ...current.slice(0, -1),
        { from: "desk", text: answer },
        ...(turn.after ? [{ from: "desk" as const, text: turn.after }] : []),
      ]);
      return;
    }
    setLines((current) => [...current, { from: "customer", text: customer }, ...turn.say.map((text) => ({ from: "desk" as const, text }))]);
    if (turn.payload) onSubmit({ ...turn.payload, images: nextImages });
  }

  async function addImages(list: FileList | null) {
    if (!list?.length || !draft) return;
    const kind = allowImage === "current" ? "current" : "reference";
    try {
      const packed = await Promise.all(Array.from(list).slice(0, 3).map(compressImage));
      const nextImages = [...images, ...packed.map((data) => ({ kind, data }) as WizardImage)].slice(0, 3);
      setImages(nextImages);
      apply("فرستادم", nextImages);
    } catch {
      toast.error("بارگذاری تصویر انجام نشد. دوباره تلاش کنید.");
    }
  }

  return (
    <div className="mt-6">
      <p className="text-xs text-[#b7955b]">پاسخ سریع درخواست</p>
      <div ref={scroller} className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-3">
        {lines.map((line, index) => (
          <p
            key={`${line.from}-${index}`}
            className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-7 ${line.from === "desk" ? "justify-self-start bg-white/10" : "justify-self-end bg-[#b7955b] text-black"}`}
          >
            {line.text}
          </p>
        ))}
      </div>
      {images.length ? <p className="mt-2 text-xs text-white/55">{images.length.toLocaleString("fa-IR")} عکس آماده ارسال است.</p> : null}
      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className="h-10 rounded-full border border-[#b7955b]/50 px-3 text-sm" onClick={() => void apply(`pick:${chip.id}`, images, chip.label)}>
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void apply(text);
          }}
          placeholder="جواب یا سؤالت را بنویس"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-transparent px-3 text-sm"
        />
        {allowImage ? (
          <label className="grid h-12 w-12 cursor-pointer place-items-center rounded-2xl border border-white/15">
            <ImagePlus className="size-5" />
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void addImages(event.target.files)} />
          </label>
        ) : null}
        <Button className="h-12 bg-[#b7955b] text-black" disabled={busy || waiting || !text.trim()} onClick={() => void apply(text)}>
          بفرست
        </Button>
      </div>
    </div>
  );
}

async function askStudio(question: string, history: { role: "user" | "assistant"; content: string }[]) {
  try {
    const res = await fetch("/api/tattoo-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });
    const data = (await res.json().catch(() => null)) as { answer?: string; error?: string } | null;
    return data?.answer || data?.error || "الان جواب این سؤال را ندارم. با ۰۹۲۱۶۸۱۲۸۵۲ تماس بگیر.";
  } catch {
    return "الان جواب این سؤال را ندارم. با ۰۹۲۱۶۸۱۲۸۵۲ تماس بگیر.";
  }
}

function customerText(raw: string) {
  if (raw.startsWith("pick:fix:")) return "اصلاح";
  if (raw === "pick:yes") return "درست است، بفرست";
  if (raw === "pick:skip") return "ندارم";
  if (raw.startsWith("pick:")) return raw.slice(5);
  return raw;
}
