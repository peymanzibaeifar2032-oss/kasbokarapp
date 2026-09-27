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
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: IntakePayload & { images: WizardImage[] }) => void;
}) {
  const opened = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [images, setImages] = useState<WizardImage[]>([]);
  const [chips, setChips] = useState<{ id: string; label: string }[]>([]);
  const [allowImage, setAllowImage] = useState(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const first = startIntake();
    setDraft(first.draft);
    setLines(first.say.map((text) => ({ from: "desk", text })));
    setChips(first.chips);
    setAllowImage(first.image);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines, chips]);

  function apply(raw: string, nextImages = images, shown?: string) {
    if (!draft || busy) return;
    const turn = answerIntake(draft, raw, {
      count: nextImages.length,
      hasCurrent: nextImages.some((image) => image.kind === "current"),
    });
    setDraft(turn.draft);
    setLines((current) => [
      ...current,
      { from: "customer", text: shown || customerText(raw) },
      ...turn.say.map((text) => ({ from: "desk" as const, text })),
    ]);
    setChips(turn.payload ? [] : turn.chips);
    setAllowImage(turn.image);
    setText("");
    if (turn.payload) onSubmit({ ...turn.payload, images: nextImages });
  }

  async function addImages(list: FileList | null) {
    if (!list?.length || !draft) return;
    const kind = draft.requestType === "coverup" || draft.requestType === "repair" ? "current" : "reference";
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
      <p className="text-xs text-[#b7955b]">میز پذیرش</p>
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
            <button key={chip.id} type="button" className="h-10 rounded-full border border-[#b7955b]/50 px-3 text-sm" onClick={() => apply(`pick:${chip.id}`, images, chip.label)}>
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
            if (event.key === "Enter") apply(text);
          }}
          placeholder="جواب را بنویس"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-transparent px-3 text-sm"
        />
        {allowImage ? (
          <label className="grid h-12 w-12 cursor-pointer place-items-center rounded-2xl border border-white/15">
            <ImagePlus className="size-5" />
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void addImages(event.target.files)} />
          </label>
        ) : null}
        <Button className="h-12 bg-[#b7955b] text-black" disabled={busy || !text.trim()} onClick={() => apply(text)}>
          بفرست
        </Button>
      </div>
    </div>
  );
}

function customerText(raw: string) {
  if (raw.startsWith("pick:fix:")) return "اصلاح";
  if (raw === "pick:yes") return "درست است، بفرست";
  if (raw === "pick:skip") return "ندارم";
  if (raw.startsWith("pick:")) return raw.slice(5);
  return raw;
}
