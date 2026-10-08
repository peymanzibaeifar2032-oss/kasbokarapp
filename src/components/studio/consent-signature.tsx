import { useEffect, useRef, useState, type PointerEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Optional finger signature. Nothing is stored until the user taps save. */
export function ConsentSignature({
  onPick,
  busy = false,
  saveLabel = "ذخیره امضا",
}: {
  onPick: (dataUrl: string) => void;
  busy?: boolean;
  saveLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#1c3d52";
    ctx.lineWidth = 2.4;
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

  function clear() {
    const canvas = canvasRef.current;
    const ctx = ctxOf();
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#1c3d52";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setDirty(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !dirty) return;
    const url = canvas.toDataURL("image/png");
    if (url.length > 900_000) {
      toast.error("امضا ذخیره نشد. یک بار دیگر ساده‌تر امضا کن.");
      return;
    }
    onPick(url);
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        امضای مشتری
      </Button>
    );
  }

  return (
    <div>
      <p className="text-xs leading-6 text-muted">مشتری با انگشت همین‌جا امضا می‌کند. تا «ذخیره امضا» را نزنی چیزی عوض نمی‌شود و برای ثبت نوبت لازم نیست.</p>
      <canvas
        ref={canvasRef}
        className="mt-2 h-36 w-full touch-none rounded-xl border border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!dirty || busy} onClick={save}>
          {saveLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clear}>
          پاک کردن
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          بستن
        </Button>
      </div>
    </div>
  );
}
