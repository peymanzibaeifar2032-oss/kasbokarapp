import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STUDIO_GUIDE_CARDS } from "@/lib/studio-guide";

export function StudioGuideGallery({
  compact,
}: {
  compact?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className={compact ? "grid grid-cols-3 gap-1.5" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {STUDIO_GUIDE_CARDS.map((card, index) => (
          <button
            key={card.slug}
            type="button"
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[.03] text-start"
            onClick={() => setOpen(index)}
          >
            <img src={`/studio-guide/${card.slug}.png`} alt={card.title} className="aspect-[4/5] w-full object-cover" />
            {compact ? null : <span className="block p-3 text-sm font-bold">{card.title}</span>}
          </button>
        ))}
      </div>
      {open != null ? <GuideLightbox index={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function GuideLightbox({ index, onClose }: { index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const last = STUDIO_GUIDE_CARDS.length - 1;
  const card = STUDIO_GUIDE_CARDS[current];

  function go(next: number) {
    setCurrent(Math.min(last, Math.max(0, next)));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(current + 1);
      if (e.key === "ArrowRight") go(current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/92 text-[#f4f1ea]"
      dir="rtl"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold">
          {card.title}
          <span className="ms-2 text-xs text-white/45">
            {new Intl.NumberFormat("fa-IR").format(current + 1)} از {new Intl.NumberFormat("fa-IR").format(last + 1)}
          </span>
        </p>
        <button type="button" className="grid size-11 place-items-center rounded-full bg-white/10" onClick={onClose} aria-label="بستن">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {current > 0 ? (
          <button
            type="button"
            className="absolute end-2 z-10 grid size-12 place-items-center rounded-full bg-[#b7955b] text-black"
            onClick={() => go(current - 1)}
            aria-label="عکس قبلی"
          >
            <ChevronRight className="size-6" />
          </button>
        ) : null}
        <img src={`/studio-guide/${card.slug}.png`} alt={card.title} className="max-h-[78dvh] w-full max-w-lg object-contain" />
        {current < last ? (
          <button
            type="button"
            className="absolute start-2 z-10 grid size-12 place-items-center rounded-full bg-[#b7955b] text-black"
            onClick={() => go(current + 1)}
            aria-label="عکس بعدی"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : null}
      </div>
      <p className="px-5 py-4 text-center text-sm leading-7 text-white/70" onClick={(e) => e.stopPropagation()}>
        {card.lead}
      </p>
    </div>
  );
}
