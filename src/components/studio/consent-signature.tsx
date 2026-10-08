import { useEffect, useRef, useState, type PointerEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { stampSignatureOnConsent } from "@/components/studio/consent-board";

/** Draws a finger signature into the امضا box of an existing consent sheet. */
export function ConsentSignature({
  sheet,
  loadSheet,
  onPick,
  busy = false,
  saveLabel = "نشاندن امضا روی برگه",
}: {
  sheet: string;
  loadSheet?: () => Promise<string>;
  onPick: (stampedSheet: string) => void;
  busy?: boolean;
  saveLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState(sheet);
  const [stamping, setStamping] = useState(false);

  useEffect(() => {
    setPage(sheet);
  }, [sheet]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((rect.width || 320) * scale));
    const height = Math.max(1, Math.round((rect.height || 144) * scale));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#1c1c1c";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setDirty(false);
  }, [open]);

  function ctxOf() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxOf();
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ctxOf();
    if (!ctx) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDirty(true);
  }

  function end() {
    drawing.current = false;
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const ctx = ctxOf();
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#1c1c1c";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setDirty(false);
  }

  async function openPad() {
    setOpen(true);
    if (page || !loadSheet) return;
    try {
      const loaded = await loadSheet();
      if (loaded) setPage(loaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "برگه باز نشد.");
    }
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !dirty) return;
    if (!page.startsWith("data:image/")) {
      toast.error("اول خود برگهٔ رضایت‌نامه را بگذار. امضا به‌تنهایی ذخیره نمی‌شود.");
      return;
    }
    setStamping(true);
    try {
      const ink = canvas.toDataURL("image/png");
      const stamped = await stampSignatureOnConsent(page, ink);
      setPage(stamped);
      clearPad();
      onPick(stamped);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "امضا روی برگه ننشست.");
    } finally {
      setStamping(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => void openPad()}>
        امضا روی برگه
      </Button>
    );
  }

  return (
    <div>
      <p className="text-xs leading-6 text-muted">امضا فقط داخل کادر «امضا»ی پایین برگه می‌نشیند. متن برگه و عکس طرح سر جایش می‌ماند. برای ثبت نوبت لازم نیست.</p>
      {page ? (
        <img src={page} alt="برگه رضایت‌نامه" className="mt-2 max-h-64 w-full rounded-xl border border-border object-contain bg-white" />
      ) : (
        <p className="mt-2 text-sm text-destructive">اول عکس برگهٔ رضایت‌نامه را بگذار. بدون برگه، امضا ذخیره نمی‌شود.</p>
      )}
      <canvas
        ref={canvasRef}
        className="mt-2 h-36 w-full touch-none rounded-xl border border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!dirty || busy || stamping || !page} onClick={() => void save()}>
          {stamping ? "در حال نشاندن روی برگه…" : saveLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clearPad}>
          پاک کردن امضا
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          بستن
        </Button>
      </div>
    </div>
  );
}