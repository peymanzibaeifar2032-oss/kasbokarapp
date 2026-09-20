import { useMemo, useState } from "react";
import { MonthGrid } from "@/components/calendar/month-grid";
import { gregorianToJalali, jalaliMonthGrid, shiftJalaliMonth } from "@/lib/calendar/jalali";
import { jalaliDayLabel, tehranClock, tehranDayKey, type DayStatus } from "@/lib/hours";

function parseDayKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? { y, m, d } : null;
}

export function JalaliDatePicker({
  value,
  onChange,
  label = "انتخاب تاریخ شمسی",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const initial = parseDayKey(value);
  const now = tehranClock(new Date());
  const initialJ = gregorianToJalali(
    initial?.y ?? now.y,
    initial?.m ?? now.m,
    initial?.d ?? now.day,
  );
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState({ jy: initialJ.jy, jm: initialJ.jm });
  const cells = useMemo(
    () =>
      jalaliMonthGrid(month.jy, month.jm).map((cell) => ({ cell, status: "free" as DayStatus })),
    [month.jy, month.jm],
  );
  const selected = parseDayKey(value);

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
        </div>
      ) : null}
    </div>
  );
}
