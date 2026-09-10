export function toEnDigits(raw: string) {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function formatToman(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "توافقی";
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

export function formatFaDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tehran" });
}

export function formatFaDateTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  });
}

export function toWhatsAppLink(raw: string | null | undefined, text?: string) {
  if (!raw) return null;
  const digits = toEnDigits(raw).replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  const intl = digits.startsWith("98") ? digits : digits.startsWith("0") ? `98${digits.slice(1)}` : `98${digits}`;
  const base = `https://wa.me/${intl}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function toTelLink(raw: string | null | undefined) {
  if (!raw) return null;
  return `tel:${toEnDigits(raw).replace(/\s/g, "")}`;
}

export function toWebsiteHref(raw: string | null | undefined) {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatKm(km: number) {
  if (km < 1) return `${new Intl.NumberFormat("fa-IR").format(Math.round(km * 1000))} متر`;
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(km)} کیلومتر`;
}

/** Web/app-link that starts car routing to the point (nshn.ir opens Neshan app when installed). */
export function neshanLink(lat: number, lng: number) {
  return `https://nshn.ir/maps?destination=${lat},${lng}&type=drive`;
}

export function openNeshan(lat: number, lng: number) {
  const web = neshanLink(lat, lng);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isAndroid) {
    const intent = `intent://nshn.ir/maps?destination=${lat},${lng}&type=drive#Intent;scheme=https;package=org.rajman.neshan.traffic.tehran.navigator;S.browser_fallback_url=${encodeURIComponent(web)};end`;
    window.location.href = intent;
    return;
  }
  if (isIOS) {
    const app = `neshan://?ll=${lat},${lng}`;
    const timer = window.setTimeout(() => {
      window.location.href = web;
    }, 900);
    const cancel = () => window.clearTimeout(timer);
    window.addEventListener("pagehide", cancel, { once: true });
    window.addEventListener("blur", cancel, { once: true });
    window.location.href = app;
    return;
  }
  window.open(web, "_blank", "noopener,noreferrer");
}

export function googleMapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function isIranMobile(raw: string) {
  const d = toEnDigits(raw).replace(/[^\d]/g, "");
  return /^(0?9\d{9}|98?9\d{9})$/.test(d);
}

function icsStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
}

export function bookingIcs(opts: {
  title: string;
  startIso: string;
  minutes?: number;
  location?: string;
  description?: string;
}) {
  const start = new Date(opts.startIso);
  const end = new Date(start.getTime() + (opts.minutes ?? 60) * 60000);
  const loc = (opts.location ?? "").replace(/\n/g, " ");
  const desc = (opts.description ?? "").replace(/\n/g, " ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kasbokar//FA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${opts.title}`,
    `LOCATION:${loc}`,
    `DESCRIPTION:${desc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeNextPath(raw: unknown) {
  if (typeof raw !== "string") return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return undefined;
  return raw;
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}
