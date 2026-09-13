import { JALALI_MONTHS, WEEKDAY_SHORT_FA, toFaDigits, type JalaliCell } from "@/lib/calendar/jalali";
import type { DayStatus } from "@/lib/hours";
import { cn } from "@/lib/utils";

export type MonthCellState = {
  cell: JalaliCell;
  status: DayStatus;
  badge?: string;
};

const STATUS_TEXT: Record<DayStatus, string> = {
  free: "آزاد",
  limited: "کم",
  full: "پر",
  closed: "تعطیل",
  past: "گذشته",
  beyond: "خارج",
};

export function MonthGrid({
  jy,
  jm,
  todayKey,
  selectedKey,
  cells,
  loading,
  onSelect,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
}: {
  jy: number;
  jm: number;
  todayKey: string;
  selectedKey: string;
  cells: MonthCellState[];
  loading?: boolean;
  onSelect: (cell: JalaliCell, status: DayStatus) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-3" data-testid="jalali-month-calendar">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="h-11 min-w-11 rounded-full border border-border px-3 text-sm disabled:opacity-40"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="ماه قبل"
        >
          ‹ ماه قبل
        </button>
        <p className="text-center text-base font-semibold">
          {JALALI_MONTHS[jm - 1]} {toFaDigits(jy)}
        </p>
        <button
          type="button"
          className="h-11 min-w-11 rounded-full border border-border px-3 text-sm disabled:opacity-40"
          onClick={onNext}
          disabled={!canNext}
          aria-label="ماه بعد"
        >
          ماه بعد ›
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAY_SHORT_FA.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      {loading ? (
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map(({ cell, status, badge }) => {
            const selected = cell.dayKey === selectedKey;
            const today = cell.dayKey === todayKey;
            const disabled = !cell.inMonth || status === "past" || status === "beyond" || status === "closed";
            const waitlist = status === "full";
            return (
              <button
                key={cell.dayKey + String(cell.inMonth)}
                type="button"
                disabled={disabled && !waitlist}
                onClick={() => onSelect(cell, status)}
                aria-current={today ? "date" : undefined}
                aria-pressed={selected}
                aria-label={`${toFaDigits(cell.jd)} ${JALALI_MONTHS[cell.jm - 1]}، ${STATUS_TEXT[status]}`}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-xl border px-0.5 py-1 text-sm",
                  !cell.inMonth && "invisible",
                  today && "ring-2 ring-accent ring-offset-1 ring-offset-bg",
                  selected && "border-primary bg-primary text-primary-fg",
                  !selected && status === "free" && "border-border bg-surface",
                  !selected && status === "limited" && "border-border bg-surface",
                  !selected && status === "full" && "border-dashed border-border bg-surface",
                  !selected && status === "closed" && "border-transparent bg-transparent text-muted",
                  !selected && (status === "past" || status === "beyond") && "border-transparent text-muted",
                )}
              >
                <span className="font-medium tabular-nums">{toFaDigits(cell.jd)}</span>
                {cell.inMonth ? (
                  <span className="text-[10px] leading-tight">
                    {badge ?? (status === "past" || status === "beyond" ? "" : STATUS_TEXT[status])}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
