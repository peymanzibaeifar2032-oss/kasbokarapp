import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JALALI_MONTHS, gregorianToJalali, jalaliMonthGrid, jalaliMonthLength, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { tehranClock } from "@/lib/hours";
import { applyDownload, listPocketBookings, newPocketId, savePocketBookings, type PocketBooking, type PocketIncoming } from "@/lib/pocket-book";
import { friendlyError, saveAction } from "@/lib/save";

export const Route = createFileRoute("/studio/pocket")({
  component: PocketCalendarPage,
  head: () => ({
    meta: [
      { title: "تقویم نوبت تاتو" },
      { name: "apple-mobile-web-app-title", content: "تقویم نوبت" },
      { name: "theme-color", content: "#1d6fb5" },
    ],
  }),
});

const WEEK = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;
const WEEK_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

type Draft = {
  id: string;
  name: string;
  phone: string;
  style: string;
  placement: string;
  time: string;
  note: string;
};

function emptyDraft(): Draft {
  return { id: "", name: "", phone: "", style: "", placement: "", time: "", note: "" };
}

function dayKey(jy: number, jm: number, jd: number) {
  return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
}

function PocketCalendarPage() {
  const clock = tehranClock();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.day);
  const todayKey = dayKey(todayJ.jy, todayJ.jm, todayJ.jd);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  const [selected, setSelected] = useState(todayKey);
  const [rows, setRows] = useState<PocketBooking[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    void listPocketBookings()
      .then(setRows)
      .catch(() => toast.error("حافظهٔ گوشی باز نشد."))
      .finally(() => setReady(true));
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/studio/pocket-sw.js", { scope: "/studio/pocket" }).catch(() => undefined);
    }
  }, []);

  async function persist(next: PocketBooking[]) {
    setRows(next);
    await savePocketBookings(next);
  }

  const cells = useMemo(() => jalaliMonthGrid(month.jy, month.jm), [month.jy, month.jm]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.day, (map.get(row.day) || 0) + 1);
    return map;
  }, [rows]);
  const selectedParts = selected.split("-").map(Number);
  const selectedJd = selectedParts[2] || 1;
  const selectedCell = cells.find((cell) => cell.dayKey === selected);
  const weekday = WEEK[selectedCell?.satIndex ?? 0];
  const dayRows = rows.filter((row) => row.day === selected);

  function openDay(key: string) {
    if (movingId) {
      const current = rows.find((row) => row.id === movingId);
      if (!current) {
        setMovingId(null);
        return;
      }
      void persist(rows.map((row) => (row.id === movingId ? { ...row, day: key, pinned: true } : row)));
      setSelected(key);
      setMovingId(null);
      const [jy, jm] = key.split("-").map(Number);
      if (jy && jm) setMonth({ jy, jm });
      toast.success("نوبت به این روز منتقل شد.");
      return;
    }
    setSelected(key);
    setDraft(null);
  }

  function saveDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (name.length < 2) {
      toast.error("اسم مشتری را بنویس.");
      return;
    }
    const nextRow: PocketBooking = {
      id: draft.id || newPocketId(),
      day: selected,
      name,
      phone: draft.phone.trim(),
      style: draft.style.trim(),
      placement: draft.placement.trim(),
      time: draft.time,
      note: draft.note.trim(),
      serverId: rows.find((row) => row.id === draft.id)?.serverId ?? null,
      pinned: true,
    };
    const next = draft.id ? rows.map((row) => (row.id === draft.id ? nextRow : row)) : [...rows, nextRow];
    void persist(next);
    setDraft(null);
    toast.success("نوبت ذخیره شد.");
  }

  function removeRow(id: string) {
    if (!window.confirm("این نوبت از تقویم گوشی حذف شود؟")) return;
    void persist(rows.filter((row) => row.id !== id));
  }

  async function download() {
    setDownloading(true);
    setBanner("");
    try {
      const data = await saveAction<{ bookings: PocketIncoming[] }>("studioPocketExport");
      const next = applyDownload(rows, data.bookings || []);
      await persist(next);
      setBanner("بارگذاری کامل شد");
      toast.success("بارگذاری کامل شد");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setDownloading(false);
    }
  }

  const gregorian = selectedCell ? `${selectedCell.gd} / ${selectedCell.gm} / ${selectedCell.gy}` : "";

  return (
    <main className="min-h-dvh bg-pocket text-pocket-ink" dir="rtl">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-5">
          <div>
            <p className="text-2xl font-black">{JALALI_MONTHS[month.jm - 1]} {toFaDigits(month.jy)}</p>
            <p className="mt-1 text-sm text-pocket-ink/80" dir="ltr">{gregorian}</p>
          </div>
          <div className="text-left">
            <p className="text-xl font-black">{weekday}</p>
            <p className="mt-1 grid size-16 place-items-center rounded-full bg-white/15 text-3xl font-black">{toFaDigits(selectedJd)}</p>
          </div>
        </header>

        <div className="flex items-center justify-between px-4 pb-3">
          <button type="button" className="h-11 rounded-full bg-pocket-deep px-4 text-sm font-bold" onClick={() => setMonth((item) => shiftJalaliMonth(item.jy, item.jm, -1))}>
            ماه قبل
          </button>
          <button type="button" className="h-11 rounded-full bg-white/15 px-4 text-sm font-bold" onClick={() => { setMonth({ jy: todayJ.jy, jm: todayJ.jm }); setSelected(todayKey); }}>
            امروز
          </button>
          <button type="button" className="h-11 rounded-full bg-pocket-deep px-4 text-sm font-bold" onClick={() => setMonth((item) => shiftJalaliMonth(item.jy, item.jm, 1))}>
            ماه بعد
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 text-center text-sm font-bold text-pocket-ink/80">
          {WEEK_SHORT.map((name, index) => (
            <p key={name} className={`py-2 text-base ${index === 6 ? "text-pocket-friday" : ""}`}>{name}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 px-2 pb-4">
          {cells.map((cell) => {
            const count = counts.get(cell.dayKey) || 0;
            const active = cell.dayKey === selected;
            const friday = cell.satIndex === 6;
            return (
              <button
                key={cell.dayKey}
                type="button"
                className={`relative grid h-12 place-items-center text-lg font-bold ${cell.inMonth ? "" : "invisible"} ${active ? "rounded-full bg-white text-pocket" : ""} ${friday && !active ? "text-pocket-friday" : ""}`}
                onClick={() => cell.inMonth && openDay(cell.dayKey)}
              >
                {cell.inMonth ? toFaDigits(cell.jd) : ""}
                {count > 0 && cell.inMonth ? <span className={`absolute bottom-1 size-1.5 rounded-full ${active ? "bg-pocket-mark" : "bg-white"}`} /> : null}
                {count === 0 && cell.dayKey === todayKey && !active ? <span className="absolute bottom-1 size-1.5 rounded-full bg-pocket-mark" /> : null}
              </button>
            );
          })}
        </div>

        <section className="flex-1 rounded-t-3xl bg-bg px-4 pb-8 pt-5 text-fg">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{weekday} {toFaDigits(selectedJd)} {JALALI_MONTHS[(selectedParts[1] || month.jm) - 1]}</h2>
            <button type="button" className="h-11 rounded-full bg-primary px-4 text-sm font-bold text-primary-fg" disabled={downloading} onClick={() => void download()}>
              {downloading ? "در حال بارگذاری" : "دانلود نوبت‌ها"}
            </button>
          </div>
          {banner ? <p className="mt-3 rounded-2xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg">{banner}</p> : null}
          {movingId ? <p className="mt-3 rounded-2xl bg-pocket px-3 py-2 text-sm font-bold text-pocket-ink">روز تازه را روی تقویم بزن.</p> : null}
          <p className="mt-2 text-sm leading-6 text-muted">این نوبت‌ها روی خود گوشی می‌مانند. بدون اینترنت هم دیده و ویرایش می‌شوند.</p>

          {!ready ? <p className="mt-6 text-sm text-muted">در حال خواندن حافظهٔ گوشی…</p> : null}
          {ready && !dayRows.length && !draft ? (
            <p className="mt-6 text-sm leading-7 text-muted">این روز خالی است.</p>
          ) : null}

          <ul className="mt-4 grid gap-3">
            {dayRows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-surface p-3">
                <p className="font-black">{row.name}</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {[row.time, row.style, row.placement, row.phone].filter(Boolean).join(" · ")}
                </p>
                {row.note ? <p className="mt-1 text-sm leading-6">{row.note}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="h-10 rounded-xl border border-border px-3 text-sm font-bold" onClick={() => setDraft({ id: row.id, name: row.name, phone: row.phone, style: row.style, placement: row.placement, time: row.time, note: row.note })}>
                    ویرایش
                  </button>
                  <button type="button" className="h-10 rounded-xl border border-border px-3 text-sm font-bold" onClick={() => setMovingId(row.id)}>
                    جابه‌جایی
                  </button>
                  <button type="button" className="h-10 rounded-xl border border-border px-3 text-sm font-bold text-danger" onClick={() => removeRow(row.id)}>
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {draft ? (
            <form className="mt-4 grid gap-2" onSubmit={(event) => { event.preventDefault(); saveDraft(); }}>
              <input className="h-12 rounded-xl border border-border bg-surface px-3" placeholder="اسم مشتری" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              <input className="h-12 rounded-xl border border-border bg-surface px-3" placeholder="موبایل" inputMode="tel" dir="ltr" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              <input className="h-12 rounded-xl border border-border bg-surface px-3" placeholder="طرح" value={draft.style} onChange={(event) => setDraft({ ...draft, style: event.target.value })} />
              <input className="h-12 rounded-xl border border-border bg-surface px-3" placeholder="محل روی بدن" value={draft.placement} onChange={(event) => setDraft({ ...draft, placement: event.target.value })} />
              <input className="h-12 rounded-xl border border-border bg-surface px-3" type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
              <textarea className="min-h-20 rounded-xl border border-border bg-surface px-3 py-2" placeholder="یادداشت" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
              <div className="flex gap-2">
                <button type="submit" className="h-12 flex-1 rounded-xl bg-primary font-bold text-primary-fg">ذخیره</button>
                <button type="button" className="h-12 rounded-xl border border-border px-4 font-bold" onClick={() => setDraft(null)}>بستن</button>
              </div>
            </form>
          ) : (
            <button type="button" className="mt-4 h-12 w-full rounded-xl bg-primary font-bold text-primary-fg" onClick={() => setDraft(emptyDraft())}>
              ثبت نوبت همین روز
            </button>
          )}
          <p className="mt-4 text-xs leading-5 text-muted">دانلود، نوبت‌های ثبت‌شده روی سرور را می‌آورد. نوبتی که اینجا ویرایش یا جابه‌جا شده، با دانلود بعدی برنمی‌گردد.</p>
          <p className="sr-only">{jalaliMonthLength(month.jy, month.jm)}</p>
        </section>
      </div>
    </main>
  );
}
