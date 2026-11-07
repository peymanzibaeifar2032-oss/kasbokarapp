import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { toFaDigits } from "@/lib/calendar/jalali";
import { friendlyError } from "@/lib/save";
import type { PocketAppStats } from "@/lib/pocket/sync-response";
import type { PocketLocale } from "@/lib/pocket/professions";
import "./pocket.css";

type Report = PocketAppStats;

type Props = {
  locale: PocketLocale;
  /** Snapshot from the server-verified owner probe; never from local storage. */
  initial: PocketAppStats | null;
  refresh: () => Promise<PocketAppStats | null>;
};

function toman(n: number, locale: PocketLocale) {
  const f = new Intl.NumberFormat("en-US").format(Math.round(n || 0));
  return locale === "en" ? `${f} toman` : `${toFaDigits(f)} تومان`;
}

export function PocketStatsPanel({ locale, initial, refresh }: Props) {
  const [data, setData] = useState<Report | null>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = await refresh();
      setData(next);
      if (!next) setError(locale === "en" ? "Stats are not available for this session." : "آمار برای این نشست در دسترس نیست.");
    } catch (err) {
      setData(null);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }


  return (
    <section className="grid gap-4">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <BarChart3 size={18} color="#0ea5e9" aria-hidden />
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>
          {locale === "en" ? "App statistics" : "آمار اپلیکیشن"}
        </h2>
      </div>
      <p className="pocket-muted" style={{ margin: 0 }}>
        {locale === "en"
          ? "Owner-only, online. Shows recorded installs, APK downloads via /api/booking-apk, account emails, and reported monthly cash totals. No estimates."
          : "فقط صاحب استودیو و فقط آنلاین. نصب‌های ثبت‌شده، دانلود از مسیر /api/booking-apk، ایمیل حساب‌ها و جمع ماهانه صندوق گزارش‌شده — بدون تخمین."}
      </p>
      <button type="button" className="pocket-btn pocket-btn-ghost" onClick={() => void load()} style={{ borderColor: "#7dd3fc", color: "#0369a1", background: "#e0f2fe" }}>
        {locale === "en" ? "Refresh" : "تازه‌سازی"}
      </button>
      {loading ? <p className="pocket-muted">{locale === "en" ? "Loading…" : "در حال بارگذاری…"}</p> : null}
      {error ? (
        <p className="pocket-banner" style={{ background: "#fee2e2", borderColor: "#fecaca" }}>
          {error}
        </p>
      ) : null}
      {data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div className="pocket-stat" style={{ background: "#e0f2fe", borderColor: "#7dd3fc" }}>
              <p>{locale === "en" ? "Installs (devices)" : "نصب (دستگاه‌ها)"}</p>
              <p>{locale === "en" ? data.installs : toFaDigits(data.installs)}</p>
            </div>
            <div className="pocket-stat" style={{ background: "#ede9fe", borderColor: "#ddd6fe" }}>
              <p>{locale === "en" ? "APK downloads" : "دانلود APK"}</p>
              <p>{locale === "en" ? data.downloads : toFaDigits(data.downloads)}</p>
            </div>
          </div>
          <div className="pocket-card">
            <p style={{ margin: 0, fontWeight: 900 }}>{locale === "en" ? "Accounts using the app" : "ایمیل حساب‌های استفاده‌کننده"}</p>
            <ul style={{ margin: "0.75rem 0 0", padding: 0, listStyle: "none", display: "grid", gap: "0.45rem" }}>
              {data.accounts.length ? (
                data.accounts.map((row) => (
                  <li key={row.email} className="pocket-muted" style={{ margin: 0 }}>
                    <span className="pocket-phone">{row.email}</span>
                    {" · "}
                    {(locale === "en" ? "devices" : "دستگاه") + " " + (locale === "en" ? row.devices : toFaDigits(row.devices))}
                  </li>
                ))
              ) : (
                <li className="pocket-muted">{locale === "en" ? "No accounts recorded yet." : "هنوز حسابی ثبت نشده."}</li>
              )}
            </ul>
          </div>
          <div className="pocket-card">
            <p style={{ margin: 0, fontWeight: 900 }}>{locale === "en" ? "Monthly revenue by account" : "درآمد ماهانه هر حساب"}</p>
            <ul style={{ margin: "0.75rem 0 0", padding: 0, listStyle: "none", display: "grid", gap: "0.45rem" }}>
              {data.monthlyRevenue.length ? (
                data.monthlyRevenue.map((row) => (
                  <li key={`${row.email}-${row.jy}-${row.jm}`} style={{ margin: 0 }}>
                    <span className="pocket-phone">{row.email}</span>
                    <span className="pocket-muted">
                      {" · "}
                      {locale === "en" ? `${row.jy}/${row.jm}` : toFaDigits(`${row.jy}/${row.jm}`)}
                      {" · "}
                    </span>
                    <span className="pocket-price">{toman(row.incomeToman, locale)}</span>
                  </li>
                ))
              ) : (
                <li className="pocket-muted">{locale === "en" ? "No revenue reports yet." : "هنوز درآمد ماهانه‌ای گزارش نشده."}</li>
              )}
            </ul>
          </div>
        </>
      ) : null}
      {!loading && !data && !error ? (
        <p className="pocket-muted">{locale === "en" ? "No data." : "داده‌ای نیست."}</p>
      ) : null}
      <p className="pocket-muted" style={{ fontSize: "0.78rem" }}>
        {locale === "en"
          ? "Install ≠ download. Installs are distinct device IDs on first launch. Downloads only count /api/booking-apk hits."
          : "نصب ≠ دانلود. نصب یعنی شناسه یکتای دستگاه در اولین اجرا. دانلود فقط از مسیر /api/booking-apk شمارش می‌شود."}
      </p>
    </section>
  );
}
