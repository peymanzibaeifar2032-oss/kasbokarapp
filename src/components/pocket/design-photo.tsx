import { ImageIcon, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getSitePhoto } from "@/lib/pocket/site-photos";
import type { PocketBooking } from "@/lib/pocket-book";
import type { PocketLocale } from "@/lib/pocket/professions";

/**
 * Design image of one appointment: the site's design (cached offline on the phone after a download)
 * or the photo added on the phone. «نمایش طرح» opens it full screen with a zoom toggle.
 */
export function DesignPhoto({ row, locale, revision }: { row: PocketBooking; locale: PocketLocale; revision: number }) {
  const en = locale === "en";
  const siteKey = row.server?.photoKey || "";
  const [site, setSite] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState<string>("");

  useEffect(() => {
    let alive = true;
    if (!row.serverId) {
      setSite("");
      setChecked(true);
      return;
    }
    getSitePhoto(row.serverId)
      .then((p) => alive && setSite(p?.data || ""))
      .catch(() => alive && setSite(""))
      .finally(() => alive && setChecked(true));
    return () => {
      alive = false;
    };
  }, [row.serverId, siteKey, revision]);

  const src = site || row.photo || "";
  if (!src) {
    if (!siteKey || !checked) return null;
    return (
      <p className="pocket-muted pocket-design-missing">
        <ImageIcon size={14} aria-hidden />{" "}
        {en
          ? "This appointment has a design on the website; it is not saved on this phone yet. Download from the site again."
          : "این نوبت در سایت طرح دارد، ولی هنوز روی گوشی ذخیره نشده است. «بارگذاری از سایت» را دوباره بزنید."}
      </p>
    );
  }
  return (
    <div className="pocket-design">
      <button type="button" className="pocket-design-thumb" onClick={() => setOpen(src)} aria-label={en ? "Show design" : "نمایش طرح"}>
        <img src={src} alt="" loading="lazy" onError={() => setSite("")} />
      </button>
      <div className="pocket-design-side">
        <button type="button" className="pocket-btn pocket-btn-ghost pocket-design-open" onClick={() => setOpen(src)}>
          <ImageIcon size={16} aria-hidden /> {en ? "Show design" : "نمایش طرح"}
        </button>
        <span className="pocket-muted pocket-design-source">
          {site
            ? en ? "Website design · saved on phone" : "طرح سایت · ذخیره‌شده روی گوشی"
            : en ? "Photo added on phone" : "عکس ثبت‌شده در گوشی"}
        </span>
      </div>
      {open ? <DesignViewer src={open} title={row.name} locale={locale} onClose={() => setOpen("")} /> : null}
    </div>
  );
}

export function DesignViewer({ src, title, locale, onClose }: { src: string; title: string; locale: PocketLocale; onClose: () => void }) {
  const en = locale === "en";
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    toast.dismiss(); // a toast must not cover the viewer's close/zoom buttons
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div className="pocket-viewer" role="dialog" aria-modal="true" aria-label={en ? "Design" : "طرح"}>
      <div className="pocket-viewer-bar">
        <strong className="pocket-viewer-title">{en ? `Design · ${title}` : `طرح · ${title}`}</strong>
        <button type="button" className="pocket-viewer-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>
          {zoom ? <ZoomOut size={18} aria-hidden /> : <ZoomIn size={18} aria-hidden />}
          <span>{zoom ? (en ? "Fit" : "اندازهٔ صفحه") : en ? "Zoom" : "بزرگ‌نمایی"}</span>
        </button>
        <button type="button" className="pocket-viewer-btn" onClick={onClose}>
          <X size={18} aria-hidden />
          <span>{en ? "Close" : "بستن"}</span>
        </button>
      </div>
      <div className={zoom ? "pocket-viewer-stage is-zoom" : "pocket-viewer-stage"} onDoubleClick={() => setZoom((z) => !z)}>
        <img src={src} alt={en ? "Design" : "طرح"} />
      </div>
    </div>,
    document.body,
  );
}
