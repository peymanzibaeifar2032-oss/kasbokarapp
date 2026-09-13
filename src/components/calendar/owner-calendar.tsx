import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MonthGrid } from "@/components/calendar/month-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { gregorianToJalali, jalaliMonthGrid, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { formatFaDateTime, toWhatsAppLink } from "@/lib/format";
import { jalaliDayLabel, tehranClock, tehranDayKey, tehranLocalToIso, type DayStatus } from "@/lib/hours";
import { t } from "@/lib/i18n";
import { friendlyError, saveAction } from "@/lib/save";
import type { Booking, Business } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "day" | "week" | "month";

function eventLabel(b: Booking) {
  if (b.kind === "block") {
    if (b.eventType === "break") return "استراحت";
    if (b.eventType === "personal") return "شخصی";
    if (b.eventType === "holiday") return "تعطیل";
    return t("blockLabel");
  }
  if (b.source === "manual") return t("manualAppt");
  return "رزرو";
}

function statusFa(status: Booking["status"]) {
  if (status === "requested") return "در انتظار";
  if (status === "confirmed") return "تأییدشده";
  if (status === "cancelled") return "لغو";
  if (status === "no_show") return t("noShow");
  return "انجام‌شده";
}

function gregKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function OwnerCalendar({
  items,
  businesses,
  onChange,
}: {
  items: Booking[];
  businesses: Business[];
  onChange: () => void;
}) {
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Booking | null>(null);
  const clock = tehranClock(cursor);
  const todayKey = tehranDayKey();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.day);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of items) {
      const c = tehranClock(new Date(b.slotStart));
      const key = gregKey(c.y, c.m, c.day);
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => +new Date(a.slotStart) - +new Date(b.slotStart));
    return map;
  }, [items]);

  const weekDays = useMemo(() => {
    const satOffset = (clock.weekday + 1) % 7;
    const out: { key: string; label: string; y: number; m: number; d: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const base = new Date(Date.UTC(clock.y, clock.m - 1, clock.day - satOffset + i));
      const y = base.getUTCFullYear();
      const m = base.getUTCMonth() + 1;
      const d = base.getUTCDate();
      out.push({ key: gregKey(y, m, d), label: jalaliDayLabel(y, m, d), y, m, d });
    }
    return out;
  }, [clock.day, clock.m, clock.weekday, clock.y]);

  const monthCells = useMemo(() => {
    return jalaliMonthGrid(month.jy, month.jm).map((cell) => {
      const rows = byDay.get(cell.dayKey) ?? [];
      const closed = rows.some((b) => b.kind === "block" && b.eventType === "holiday");
      const count = rows.filter((b) => b.kind !== "block" && b.status !== "cancelled").length;
      return {
        cell,
        status: (closed ? "closed" : count ? "limited" : "free") as DayStatus,
        badge: cell.inMonth ? (closed ? "تعطیل" : count ? toFaDigits(count) : "—") : undefined,
      };
    });
  }, [byDay, month.jy, month.jm]);

  function jumpDay(delta: number) {
    const next = new Date(Date.UTC(clock.y, clock.m - 1, clock.day + delta));
    setCursor(new Date(next.getTime() + 12 * 3600000));
  }

  const dayKey = gregKey(clock.y, clock.m, clock.day);
  const dayRows = byDay.get(dayKey) ?? [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("navCalendar")}</h2>
        <div className="flex gap-1">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-10 rounded-full border px-3 text-sm",
                view === v ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface",
              )}
            >
              {v === "day" ? t("todayAgenda") : v === "week" ? t("weekView") : t("monthView")}
            </button>
          ))}
        </div>
      </div>
      <QuickCreate businesses={businesses} onChange={onChange} />

      {view === "month" ? (
        <MonthGrid
          jy={month.jy}
          jm={month.jm}
          todayKey={todayKey}
          selectedKey={dayKey}
          cells={monthCells}
          onPrev={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}
          onNext={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}
          onSelect={(cell) => {
            setCursor(new Date(Date.UTC(cell.gy, cell.gm - 1, cell.gd, 12)));
            setView("day");
          }}
        />
      ) : null}

      {view === "week" ? (
        <div className="-mx-1 overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-2 px-1">
            {weekDays.map((day) => {
              const rows = byDay.get(day.key) ?? [];
              return (
                <section key={day.key} className="min-h-40 rounded-2xl border border-border bg-surface p-2">
                  <button type="button" className="w-full text-right text-xs font-medium" onClick={() => { setCursor(new Date(Date.UTC(day.y, day.m - 1, day.d, 12))); setView("day"); }}>
                    {day.label.replace("،", "\n")}
                  </button>
                  <ul className="mt-2 space-y-1">
                    {rows.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(b)}
                          className="w-full rounded-lg bg-bg px-1.5 py-1 text-right text-[11px]"
                        >
                          <span className="block truncate">{eventLabel(b)}</span>
                          <span className="tabular-nums text-muted">{formatFaDateTime(b.slotStart).split("،").pop()}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "day" ? (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="h-11 rounded-full border px-3 text-sm" onClick={() => jumpDay(-1)}>
              روز قبل
            </button>
            <p className="text-sm font-medium">{jalaliDayLabel(clock.y, clock.m, clock.day)}</p>
            <button type="button" className="h-11 rounded-full border px-3 text-sm" onClick={() => jumpDay(1)}>
              روز بعد
            </button>
          </div>
          {!dayRows.length ? <p className="mt-3 text-sm text-muted">نوبتی در این روز نیست</p> : null}
          <ul className="mt-3 space-y-2">
            {dayRows.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setSelected(b)} className="w-full rounded-xl border border-border px-3 py-2 text-right text-sm">
                  <span className="flex items-center justify-between gap-2">
                    <strong>{eventLabel(b)}</strong>
                    <Badge>{b.kind === "block" ? t("blockLabel") : statusFa(b.status)}</Badge>
                  </span>
                  <span className="mt-1 block tabular-nums text-muted">{formatFaDateTime(b.slotStart)}</span>
                  {b.kind !== "block" ? <span className="block">{b.customerName}</span> : null}
                  {b.serviceTitle ? <span className="block text-xs text-muted">{b.serviceTitle}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selected ? <AppointmentCard booking={selected} onClose={() => setSelected(null)} onChange={onChange} /> : null}
    </div>
  );
}

function AppointmentCard({
  booking,
  onClose,
  onChange,
}: {
  booking: Booking;
  onClose: () => void;
  onChange: () => void;
}) {
  const isBlock = booking.kind === "block";
  const wa = isBlock ? null : toWhatsAppLink(booking.customerPhone);
  const clock = tehranClock(new Date(booking.slotStart));
  const [day, setDay] = useState(gregKey(clock.y, clock.m, clock.day));
  const [time, setTime] = useState(`${String(clock.hh).padStart(2, "0")}:${String(clock.mm).padStart(2, "0")}`);

  async function setStatus(status: Booking["status"]) {
    try {
      await saveAction("bookingStatus", { id: booking.id, status });
      onChange();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }
  async function reschedule() {
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const start = tehranLocalToIso(y, m, d, hh, mm);
    const dur = Math.max(10, (new Date(booking.slotEnd || booking.slotStart).getTime() - new Date(booking.slotStart).getTime()) / 60000);
    const endClock = tehranClock(new Date(new Date(start).getTime() + dur * 60000));
    const slotEnd = tehranLocalToIso(endClock.y, endClock.m, endClock.day, endClock.hh, endClock.mm);
    try {
      await saveAction("reschedule", { id: booking.id, slotStart: start, slotEnd });
      toast.success("زمان جابه‌جا شد.");
      onChange();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }
  return (
    <article className="rounded-2xl border border-accent/30 bg-surface p-4">
      <div className="flex justify-between gap-3">
        <h3 className="font-semibold">{eventLabel(booking)}</h3>
        <button type="button" onClick={onClose} className="text-sm text-muted">
          بستن
        </button>
      </div>
      {!isBlock ? <p className="mt-1">{booking.customerName}</p> : null}
      {!isBlock && booking.customerPhone ? (
        <div className="mt-1 flex gap-3 text-sm">
          <a className="text-accent" href={`tel:${booking.customerPhone}`}>
            {booking.customerPhone}
          </a>
          {wa ? (
            <a className="text-accent" href={wa}>
              واتساپ
            </a>
          ) : null}
        </div>
      ) : null}
      <p className="mt-2 text-sm">{booking.serviceTitle}</p>
      <p className="text-sm">{formatFaDateTime(booking.slotStart)}{booking.slotEnd ? ` – ${formatFaDateTime(booking.slotEnd)}` : ""}</p>
      <p className="text-xs text-muted">ثبت: {formatFaDateTime(booking.createdAt)}</p>
      {booking.note ? <p className="mt-2 text-sm text-muted">{booking.note}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!isBlock && booking.status === "requested" ? (
          <Button size="sm" onClick={() => void setStatus("confirmed")}>تأیید</Button>
        ) : null}
        {!isBlock && booking.status === "confirmed" ? (
          <>
            <Button size="sm" variant="accent" onClick={() => void setStatus("done")}>تکمیل شد</Button>
            <Button size="sm" variant="outline" onClick={() => void setStatus("no_show")}>{t("noShow")}</Button>
          </>
        ) : null}
        {booking.status !== "cancelled" && booking.status !== "done" && booking.status !== "no_show" ? (
          <Button size="sm" variant="outline" onClick={() => void setStatus("cancelled")}>
            {isBlock ? "برداشتن بستن" : "لغو"}
          </Button>
        ) : null}
      </div>
      {!isBlock && booking.status !== "cancelled" && booking.status !== "done" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Button size="sm" variant="outline" onClick={() => void reschedule()}>جابه‌جایی زمان</Button>
        </div>
      ) : null}
    </article>
  );
}

function QuickCreate({ businesses, onChange }: { businesses: Business[]; onChange: () => void }) {
  const [mode, setMode] = useState<"block" | "manual">("block");
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState<"block" | "break" | "personal" | "holiday">("block");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!businessId && businesses[0]) setBusinessId(businesses[0].id);
  }, [businesses, businessId]);

  async function submit() {
    if (!day || !businessId) {
      toast.error("روز و کسب‌وکار را انتخاب کنید.");
      return;
    }
    const [y, m, d] = day.split("-").map(Number);
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const slotStart = tehranLocalToIso(y, m, d, sh, sm);
    const slotEnd = tehranLocalToIso(y, m, d, eh, em);
    setBusy(true);
    try {
      if (mode === "block") {
        await saveAction("blockInterval", { businessId, slotStart, slotEnd, note, eventType });
        toast.success("بازه بسته شد.");
      } else {
        if (name.trim().length < 2) throw new Error("نام مشتری را بنویسید.");
        await saveAction("manualAppointment", { businessId, slotStart, slotEnd, customerName: name, customerPhone: phone || undefined, note });
        toast.success("نوبت دستی ثبت شد.");
      }
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <div className="flex gap-2">
        <button type="button" className={cn("h-10 rounded-full border px-3 text-sm", mode === "block" ? "border-primary bg-primary text-primary-fg" : "border-border")} onClick={() => setMode("block")}>
          {t("blockInterval")}
        </button>
        <button type="button" className={cn("h-10 rounded-full border px-3 text-sm", mode === "manual" ? "border-primary bg-primary text-primary-fg" : "border-border")} onClick={() => setMode("manual")}>
          {t("manualAppt")}
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </NativeSelect>
        {mode === "block" ? (
          <NativeSelect value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)}>
            <option value="block">بستن</option>
            <option value="break">استراحت</option>
            <option value="personal">شخصی</option>
            <option value="holiday">تعطیلی</option>
          </NativeSelect>
        ) : null}
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {mode === "manual" ? (
          <>
            <Input placeholder="نام مشتری" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="موبایل" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </>
        ) : null}
        <Textarea placeholder="یادداشت" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button className="mt-3" disabled={busy} onClick={() => void submit()}>
        {mode === "block" ? t("blockSubmit") : "ثبت نوبت دستی"}
      </Button>
    </article>
  );
}
