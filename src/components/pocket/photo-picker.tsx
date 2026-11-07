import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
export function PocketPhotoPicker({
  value,
  onChange,
  english = false,
}: {
  value: string;
  onChange: (value: string) => void;
  english?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function choose(file: File) {
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024)
      throw new Error("یک تصویر با حجم کمتر از ۲۰ مگابایت انتخاب کنید.");
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("این تصویر خوانده نشد. JPG یا PNG انتخاب کنید."));
        img.src = url;
      });
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("پردازش عکس ممکن نیست");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.82,
        data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > 750000 && quality > 0.35) {
        quality -= 0.12;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > 1024 * 1024)
        throw new Error("تصویر هنوز بزرگ است؛ تصویر کوچک‌تری انتخاب کنید.");
      onChange(data);
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  return (
    <div className="pocket-photo-picker">
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={english ? "Choose photo" : "انتخاب عکس از گالری"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void choose(file).catch((error) => toast.error(error.message));
        }}
      />
      <button
        className="pocket-btn pocket-gallery-btn"
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <ImagePlus size={24} />
        {busy
          ? "در حال آماده‌سازی عکس…"
          : english
            ? "Choose photo from gallery"
            : "انتخاب عکس از گالری"}
      </button>
      <p className="pocket-muted">
        {english
          ? "Saved offline with the appointment. Up to 20 MB; resized automatically."
          : "عکس همراه نوبت روی گوشی ذخیره می‌شود؛ تصویر تا ۲۰ مگابایت، با کاهش حجم خودکار."}
      </p>
      {value ? (
        <div className="pocket-photo-preview">
          <img src={value} alt={english ? "Selected photo" : "پیش‌نمایش عکس انتخاب‌شده"} />
          <button
            type="button"
            className="pocket-btn pocket-btn-danger"
            onClick={() => onChange("")}
          >
            <Trash2 size={16} />
            {english ? "Remove photo" : "حذف عکس"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
