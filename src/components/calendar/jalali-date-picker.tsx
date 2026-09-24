import { useEffect, useMemo, useState } from "react";
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
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  busyKeys?: string[];
}) {
  const initial = parseDayKey(value);
  const now = tehranClock(new Date());
  const initialJ = gregorianToJalali(initial?.y ?? now.y, initial?.m ?? now.m, initial?.d ?? now.day);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState({ jy: initialJ.jy, jm: initialJ.jm });
  const thursday = useMemo(() => new Set(thursdayBusyKeys()), []);
  const busy = useMemo(() => new Set(busyKeys), [busyKeys]);
  const cells = useMemo(
    () =>
      jalaliMonthGrid(month.jy, month.jm).map((cell) => {
        let status: DayStatus = "free";
        if (busy.has(cell.dayKey)) status = "booked";
        else if (thursday.has(cell.dayKey)) status = "thursday";
        return { cell, status };
      }),
    [month.jy, month.jm, busy, thursday],
  );
  const selected = parseDayKey(value);

  useEffect(() => {
    const parsed = parseDayKey(value);
    if (!parsed || open) return;
    const j = gregorianToJalali(parsed.y, parsed.m, parsed.d);
    setMonth({ jy: j.jy, jm: j.jm });
  }, [value, open]);

  return (
    <div>
      <button
        type="button"
        className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-right text-sm"
        onClick={() => setOpen((x) => !x)}
      >
        {selected ? jalaliDayLabel(selected.y, selected.m, selected.d) : label}
      </button>
      {open ? (
        <div className="mt-2">
          <MonthGrid
            jy={month.jy}
            jm={month.jm}
            todayKey={tehranDayKey()}
            selectedKey={value}
            cells={cells}
            onPrev={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}
            onNext={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}
            onSelect={(cell) => {
              onChange(cell.dayKey);
              setOpen(false);
            }}
          />
          <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-950">خالی، اولویت ثبت</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-950">مشتری دارد</span>
            <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-950">پنجشنبه آموزش</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}