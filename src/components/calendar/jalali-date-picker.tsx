import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MonthGrid } from "@/components/calendar/month-grid";
import { gregorianToJalali, jalaliMonthGrid, shiftJalaliMonth } from "@/lib/calendar/jalali";
import { jalaliDayLabel, tehranClock, tehranDayKey, type DayStatus } from "@/lib/hours";
import { thursdayBusyKeys } from "@/lib/studio-apprentices";

function parseDayKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? { y, m, d } : null;
}

export function JalaliDatePicker({
  value,
  onChange,
  label = "انتخاب تاریخ شمسی",
  busyKeys = [],
  alwaysOpen = false,
  emptyOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  busyKeys?: string[];
  alwaysOpen?: boolean;
  emptyOnly?: boolean;
}) {
  const initial = parseDayKey(value);
  const now = tehranClock(new Date());
  const initialJ = gregorianToJalali(initial?.y ?? now.y, initial?.m ?? now.m, initial?.d ?? now.day);
  const [open, setOpen] = useState(alwaysOpen);
  const [month, setMonth] = useState({ jy: initialJ.jy, jm: initialJ.jm });
  const thursday = useMemo(() => new Set(thursdayBusyKeys()), []);
  const busy = useMemo(() => new Set(busyKeys), [busyKeys]);
  const todayKey = tehranDayKey();
  const cells = useMemo(
    () =>
      jalaliMonthGrid(month.jy, month.jm).map((cell) => {
        let status: DayStatus = "free";
        if (cell.dayKey < todayKey) status = "past";
        else if (busy.has(cell.dayKey)) status = "booked";
        else if (thursday.has(cell.dayKey)) status = "thursday";
        return { cell, status };
      }),
    [month.jy, month.jm, busy, thursday, todayKey],
  );
  const selected = parseDayKey(value);

  useEffect(() => {
    const parsed = parseDayKey(value);
    if (!parsed || (open && !alwaysOpen)) return;
    const j = gregorianToJalali(parsed.y, parsed.m, parsed.d);
    setMonth({ jy: j.jy, jm: j.jm });
  }, [value, open, alwaysOpen]);

  function choose(cell: { dayKey: string }, status: DayStatus) {
    if (emptyOnly && status !== "free") {
      toast.error(status === "thursday" ? "پنجشنبه فقط آموزش است." : status === "booked" ? "این روز مشتری دارد. فقط روز کاملاً خالی." : "این روز قابل ثبت نیست.");
      return;
    }
    onChange(cell.dayKey);
    if (!alwaysOpen) setOpen(false);
  }

  const grid = (
    <div className="mt-2">
      <MonthGrid
        jy={month.jy}
        jm={month.jm}
        todayKey={todayKey}
        selectedKey={value}
        cells={cells}
        onPrev={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}
        onNext={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}
        onSelect={choose}
      />
      <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-950">خالی، بزن و انتخاب کن</span>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-950">حتی یک کار، بسته</span>
        <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-950">پنجشنبه آموزش</span>
      </p>
    </div>
  );

  if (alwaysOpen) return grid;

  return (
    <div>
      <button
        type="button"
        className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-right text-sm"
        onClick={() => setOpen((x) => !x)}
      >
        {selected ? jalaliDayLabel(selected.y, selected.m, selected.d) : label}
      </button>
      {open ? grid : null}
    </div>
  );
}