import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StudioTopBar } from "@/components/studio/top-bar";
import { JALALI_MONTHS, WEEKDAY_SHORT_FA, gregorianToJalali, jalaliMonthGrid, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { jalaliDayLabel, tehranClock, tehranDayKey } from "@/lib/hours";
import { isTehranThursday } from "@/lib/studio-apprentices";

export const Route = createFileRoute("/studio/open")({
  component: OpenDaysPage,
  head: () => ({
    meta: [
      { title: "روزهای خالی تاتو | پیمان زیبائی‌فر" },
      { name: "description", content: "روزهای کاملاً خالی استودیو. اسم مشتری‌ها اینجا نیست." },
    ],
  }),
});

function OpenDaysPage() {
  const now = tehranClock();
  const todayJ = gregorianToJalali(now.y, now.m, now.day);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const todayKey = tehranDayKey();

  useEffect(() => {
    let gone = false;
    void fetch("/api/tattoo-public?op=open-days")
      .then((response) => response.json())
      .then((body: { ok?: boolean; days?: string[] }) => {
        if (gone) return;
        if (!body?.ok) {
          setFailed(true);
          return;
        }
        setBusy(new Set(body.days || []));
        setReady(true);
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
    };
  }, []);

  const cells = useMemo(() => jalaliMonthGrid(month.jy, month.jm), [month.jy, month.jm]);
  const openCount = cells.filter((cell) => cell.inMonth && cell.dayKey >= todayKey && !isTehranThursday(cell.dayKey) && !busy.has(cell.dayKey)).length;

  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-xs tracking-[.18em] text-[#b7955b]">نوبت</p>
        <h1 className="mt-2 text-3xl font-black">روزهای خالی</h1>
        <p className="mt-3 text-sm leading-7 text-white/60">
          اسم هیچ مشتری‌ای اینجا نیست. سبز یعنی آن روز هیچ کاری ثبت نشده. اگر حتی یک کار باشد، روز بسته است. پنجشنبه فقط آموزش است.
          انتخاب روز یعنی درخواست، نه قطعی شدن نوبت.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100">خالی</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">پر</span>
          <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-100">پنجشنبه آموزش</span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="h-11 rounded-2xl border border-white/15 px-4 text-sm" onClick={() => setMonth((value) => shiftJalaliMonth(value.jy, value.jm, -1))}>
            ماه قبل
          </button>
          <p className="text-sm font-bold">
            {JALALI_MONTHS[month.jm - 1]} {toFaDigits(month.jy)}
          </p>
          <button type="button" className="h-11 rounded-2xl border border-white/15 px-4 text-sm" onClick={() => setMonth((value) => shiftJalaliMonth(value.jy, value.jm, 1))}>
            ماه بعد
          </button>
        </div>

        {failed ? (
          <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-7 text-red-100">
            تقویم الان خوانده نشد. روز خالی را حدس نزن.
            <Link to="/studio/request" className="mt-3 block font-bold text-[#e5d2ae]">
              درخواست را بدون انتخاب روز بفرست
            </Link>
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-white/40">
          {WEEKDAY_SHORT_FA.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            if (!cell.inMonth) return <span key={cell.dayKey + "-pad"} />;
            const past = cell.dayKey < todayKey;
            const thursday = isTehranThursday(cell.dayKey);
            const taken = busy.has(cell.dayKey);
            const open = ready && !past && !thursday && !taken;
            const tone = past
              ? "border-white/5 text-white/25"
              : thursday
                ? "border-violet-300/30 bg-violet-500/15 text-violet-100"
                : taken
                  ? "border-white/10 bg-white/[.04] text-white/45"
                  : open
                    ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-50"
                    : "border-white/10 text-white/40";
            return (
              <div key={cell.dayKey} className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center ${tone}`}>
                <span className="text-sm font-bold">{toFaDigits(cell.jd)}</span>
                <span className="mt-1 text-[10px] leading-4">{past ? "" : thursday ? "آموزش" : taken ? "پر" : open ? "خالی" : "…"}</span>
              </div>
            );
          })}
        </div>

        <section className="mt-6 grid gap-2">
          <h2 className="text-sm font-bold">درخواست برای یک روز خالی</h2>
          {!ready && !failed ? <p className="text-sm text-white/50">در حال خواندن تقویم…</p> : null}
          {ready && openCount === 0 ? <p className="text-sm leading-7 text-white/60">در این ماه روز کاملاً خالی نمانده. ماه بعد را ببین.</p> : null}
          {cells
            .filter((cell) => cell.inMonth && ready && cell.dayKey >= todayKey && !isTehranThursday(cell.dayKey) && !busy.has(cell.dayKey))
            .map((cell) => (
              <a
                key={cell.dayKey}
                href={`/studio/request?day=${cell.dayKey}`}
                className="flex h-12 items-center justify-between rounded-2xl bg-emerald-500/15 px-4 text-sm font-bold text-emerald-50"
              >
                <span>{jalaliDayLabel(cell.gy, cell.gm, cell.gd)}</span>
                <span>برای این روز درخواست بده</span>
              </a>
            ))}
        </section>
      </main>
    </div>
  );
}
