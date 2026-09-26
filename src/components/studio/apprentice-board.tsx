import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { JALALI_MONTHS, gregorianToJalali, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { friendlyError, saveAction } from "@/lib/save";
import {
  apprenticeRemaining,
  nextSessionNumber,
  type ApprenticePayment,
  type StudioApprentice,
  type StudioApprenticeBoard,
} from "@/lib/studio-apprentices";
import { digitsOnly, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";
import { cn } from "@/lib/utils";

export function StudioApprenticeBoard() {
  const [dayKey, setDayKey] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<{ jy: number; jm: number } | null>(null);
  const [board, setBoard] = useState<StudioApprenticeBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(nextDay?: string, nextMonth = month) {
    setLoading(true);
    setError("");
    try {
      const data = await saveAction<StudioApprenticeBoard>("studioApprenticeBoard", {
        dayKey: nextDay,
        jy: nextMonth?.jy,
        jm: nextMonth?.jm,
      });
      setBoard(data);
      setDayKey(data.dayKey);
      setMonth({ jy: data.financeMonth.jy, jm: data.financeMonth.jm });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(type: string, payload: unknown) {
    setBusy(true);
    try {
      const data = await saveAction<StudioApprenticeBoard>(type, payload);
      if (data?.dayKey) {
        setBoard(data);
        setDayKey(data.dayKey);
      } else {
        await load(dayKey, month);
      }
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function setDone(apprenticeId: string, sessionsDone: number) {
    setBusy(true);
    try {
      await saveAction("setApprenticeProgress", { apprenticeId, sessionsDone });
      toast.success("شمارش جلسه ثبت شد.");
      await load(dayKey, month);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !board) return <p className="mt-6 text-sm text-muted">در حال آماده کردن پنجشنبه‌ها…</p>;
  if (error && !board) {
    return (
      <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button className="mt-3" variant="outline" onClick={() => void load()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }
  if (!board) return null;
  const sina = board.roster.find((row) => row.kind === "substitute");

  return (
    <div className="mt-5 grid gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-bold">پنجشنبه‌های هنرجو</h2>
        <p className="mt-1 text-sm leading-7 text-muted">
          هر پنجشنبه سال برای هنرجوهاست و نوبت مشتری نمی‌گیرد. اگر کسی نیاید، همان روز استراحت است.
          ناهار ۱۲ تا ۱۳ قفل است. فقط «حاضر شد» جزو ۱۰ جلسه است. «کنسل شد» هیچ جلسه‌ای اضافه نمی‌کند.
          پول هنرجو جدا از واریزی سالن است. جمع همه ماه‌ها و مانده هر نفر همین‌جا دیده می‌شود.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <h3 className="font-bold">جمع واریزی هنرجوها</h3>
        <p className="mt-3 text-2xl font-bold">{formatTattooToman(board.payments.reduce((sum, row) => sum + row.amountToman, 0))}</p>
        <p className="mt-1 text-sm text-muted">همه ماه‌هایی که تا حالا ثبت شده. داخل درآمد سالن حساب نمی‌شود.</p>
        <ul className="mt-3 grid gap-1 text-sm">
          {paymentMonths(board.payments).map((row) => (
            <li key={`${row.jy}-${row.jm}`} className="flex items-center justify-between gap-3">
              <span>{row.label}</span>
              <span className="font-semibold">{formatTattooToman(row.amount)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">مانده بدهی همه: {formatTattooToman(board.debtTotal)}</p>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">ثبت واریزی یک ماه</h3>
            <p className="mt-1 text-sm text-muted">{JALALI_MONTHS[board.financeMonth.jm - 1]} {toFaDigits(board.financeMonth.jy)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={busy || !month} onClick={() => month && void load(dayKey, shiftJalaliMonth(month.jy, month.jm, -1))}>
              ماه قبل
            </Button>
            <Button variant="outline" size="sm" disabled={busy || !month} onClick={() => month && void load(dayKey, shiftJalaliMonth(month.jy, month.jm, 1))}>
              ماه بعد
            </Button>
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold">{formatTattooToman(board.monthReceived)}</p>
        <p className="mt-1 text-sm text-muted">فقط واریزی‌های {JALALI_MONTHS[board.financeMonth.jm - 1]}. ماه‌های دیگر در جمع بالا هستند.</p>
      </section>

      <div className="grid gap-3">
        {board.roster.map((person) => (
          <ApprenticeRosterCard
            key={person.id}
            person={person}
            payments={board.payments.filter((row) => row.apprenticeId === person.id)}
            month={board.financeMonth}
            disabled={busy}
            onSetDone={(n) => void setDone(person.id, n)}
            onAdd={async (amountToman, paidOn) => {
              await saveAction("addApprenticePayment", { apprenticeId: person.id, amountToman, paidOn });
              toast.success("واریزی هنرجو ثبت شد و داخل درآمد سالن نرفت.");
              await load(dayKey, month);
            }}
            onDelete={async (id) => {
              await saveAction("deleteApprenticePayment", { id });
              await load(dayKey, month);
            }}
            onDebt={async (debtToman) => {
              await saveAction("setApprenticeDebt", { apprenticeId: person.id, debtToman });
              toast.success("مانده بدهی ثبت شد.");
              await load(dayKey, month);
            }}
          />
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {board.thursdays.map((day) => (
          <button
            key={day.dayKey}
            type="button"
            disabled={busy}
            onClick={() => void load(day.dayKey)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-4 text-sm",
              day.dayKey === board.dayKey
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-muted",
            )}
          >
            {day.label}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold">{board.label}</p>

      {board.slots.map((slot) => {
        if (slot.kind === "lunch") {
          return (
            <article key={slot.id} className="rounded-3xl border border-dashed border-border bg-bg p-4">
              <p className="font-bold">{slot.label}</p>
              <p className="mt-1 text-sm text-muted">وقت ناهار تو. کسی در این ساعت نمی‌آید.</p>
            </article>
          );
        }
        return (
          <article key={slot.id} className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold">{slot.label}</p>
                <p className="mt-1 text-sm">
                  {slot.person ? `${slot.person.name} · ${slot.person.phone}` : "هنرجو انتخاب نشده"}
                </p>
                {slot.person ? (
                  <p className="mt-1 text-xs text-muted">
                    جلسه {toFaDigits(nextSessionNumber(slot.person.sessionsDone))} از ۱۰ · مانده{" "}
                    {toFaDigits(apprenticeRemaining(slot.person.sessionsDone))}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  slot.status === "present"
                    ? "bg-emerald-100 text-emerald-900"
                    : slot.status === "absent"
                      ? "bg-amber-100 text-amber-950"
                      : "bg-bg text-muted",
                )}
              >
                {slot.status === "present" ? "حاضر" : slot.status === "absent" ? "کنسل · بدون شمارش" : "برنامه"}
              </span>
            </div>
            <label className="mt-3 grid gap-1.5 text-sm">
              <span className="font-medium">انتخاب هنرجو</span>
              <NativeSelect
                disabled={busy}
                value={slot.apprenticeId ?? ""}
                onChange={(e) =>
                  void run("assignApprenticeSlot", {
                    slotId: slot.id,
                    apprenticeId: e.target.value || null,
                  })
                }
              >
                <option value="">خالی</option>
                {board.roster.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.phone}
                    {person.kind === "substitute" ? " · جایگزین" : ""}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy || !slot.apprenticeId}
                onClick={() => void run("markApprenticeSlot", { slotId: slot.id, status: "present" })}
              >
                حاضر شد
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void run("markApprenticeSlot", { slotId: slot.id, status: "absent" })}
              >
                کنسل شد، جزو ۱۰ جلسه نیست
              </Button>
              {sina ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || slot.apprenticeId === sina.id}
                  onClick={() => void run("assignApprenticeSlot", { slotId: slot.id, apprenticeId: sina.id })}
                >
                  جایگزین با سینا
                </Button>
              ) : null}
              {slot.person?.phone ? (
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${slot.person.phone}`}>تماس</a>
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function paymentMonths(payments: ApprenticePayment[]) {
  const groups = new Map<string, { jy: number; jm: number; label: string; amount: number }>();
  for (const row of payments) {
    const [y, m, d] = row.paidOn.split("-").map(Number);
    const j = gregorianToJalali(y, m, d);
    const key = `${j.jy}-${j.jm}`;
    const current = groups.get(key) ?? { jy: j.jy, jm: j.jm, label: `${JALALI_MONTHS[j.jm - 1]} ${toFaDigits(j.jy)}`, amount: 0 };
    current.amount += row.amountToman;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.jy - a.jy || b.jm - a.jm);
}

function paymentMonthLabel(paidOn: string) {
  const [y, m, d] = paidOn.split("-").map(Number);
  const j = gregorianToJalali(y, m, d);
  return `${toFaDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${toFaDigits(j.jy)}`;
}

function ApprenticeRosterCard({
  person,
  payments,
  month,
  disabled,
  onSetDone,
  onAdd,
  onDelete,
  onDebt,
}: {
  person: StudioApprentice;
  payments: ApprenticePayment[];
  month: { jy: number; jm: number; label: string };
  disabled: boolean;
  onSetDone: (n: number) => void;
  onAdd: (amountToman: number, paidOn: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDebt: (debtToman: number) => Promise<void>;
}) {
  const remaining = apprenticeRemaining(person.sessionsDone, person.sessionGoal);
  const done = person.sessionsDone >= person.sessionGoal;
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [debt, setDebt] = useState(String(person.debtToman || ""));
  const [localBusy, setLocalBusy] = useState(false);
  useEffect(() => {
    setDebt(String(person.debtToman || ""));
  }, [person.debtToman]);
  const monthPaid = payments.filter((row) => {
    const [y, m, d] = row.paidOn.split("-").map(Number);
    const j = gregorianToJalali(y, m, d);
    return j.jy === month.jy && j.jm === month.jm;
  });

  async function add() {
    if (!amount || Number(amount) <= 0) return toast.error("مبلغ واریزی را بنویس.");
    if (!paidOn) return toast.error("تاریخ واریز را انتخاب کن، حتی اگر مال ماه قبل است.");
    setLocalBusy(true);
    try {
      await onAdd(Number(amount), paidOn);
      setAmount("");
      setPaidOn("");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLocalBusy(false);
    }
  }

  async function saveDebt() {
    setLocalBusy(true);
    try {
      await onDebt(Number(debt || 0));
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{person.name}</p>
          <a className="mt-1 inline-block text-sm text-accent" href={`tel:${person.phone}`} dir="ltr">
            {person.phone}
          </a>
          <p className="mt-1 text-xs text-muted">
            {person.kind === "substitute" ? "جایگزین هفته · " : ""}
            {done ? "دوره ۱۰ جلسه تمام شد" : `جلسه ${toFaDigits(nextSessionNumber(person.sessionsDone))} از ۱۰`}
          </p>
          <p className="mt-2 text-sm font-semibold">واریزی کل: {formatTattooToman(payments.reduce((sum, row) => sum + row.amountToman, 0))}</p>
          <p className={cn("text-sm font-semibold", person.debtToman > 0 ? "text-destructive" : "text-muted")}>
            مانده بدهی: {formatTattooToman(person.debtToman)}
          </p>
          {paymentMonths(payments).map((row) => (
            <p key={`${row.jy}-${row.jm}`} className="text-xs text-muted">
              {row.label}: {formatTattooToman(row.amount)}
            </p>
          ))}
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", done ? "bg-primary text-primary-fg" : "bg-bg text-muted")}>
          مانده {toFaDigits(remaining)} جلسه
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">خانه جلسه چندم را بزن؛ از همان عدد تا ۱۰ شمرده می‌شود.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: person.sessionGoal }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled || localBusy}
            onClick={() => onSetDone(n === person.sessionsDone ? n - 1 : n)}
            className={cn(
              "size-9 rounded-xl text-sm font-bold",
              n <= person.sessionsDone ? "bg-primary text-primary-fg" : "border border-border bg-bg text-muted",
            )}
          >
            {toFaDigits(n)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-bg p-3">
        <p className="text-sm font-semibold">واریزی {JALALI_MONTHS[month.jm - 1]}: {formatTattooToman(monthPaid.reduce((sum, row) => sum + row.amountToman, 0))}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">مبلغ واریزی</span>
            <Input value={formatGroupedDigits(amount)} onChange={(e) => setAmount(digitsOnly(e.target.value))} inputMode="numeric" dir="ltr" className="text-left tracking-wide" placeholder="تومان" />
          </label>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">تاریخ واریز</span>
            <JalaliDatePicker value={paidOn} onChange={setPaidOn} label="تاریخ واریز" />
          </div>
        </div>
        <Button className="mt-3" size="sm" disabled={disabled || localBusy} onClick={() => void add()}>
          ثبت واریزی
        </Button>
        {payments.length ? (
          <ul className="mt-3 grid gap-2">
            {payments.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{paymentMonthLabel(row.paidOn)} · {formatTattooToman(row.amountToman)}</span>
                <Button size="sm" variant="outline" disabled={disabled || localBusy} onClick={() => void onDelete(row.id)}>
                  حذف
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted">هنوز واریزی ثبت نشده.</p>
        )}
        <label className="mt-4 grid gap-1.5 text-sm">
          <span className="font-medium">مانده بدهی</span>
          <Input value={formatGroupedDigits(debt)} onChange={(e) => setDebt(digitsOnly(e.target.value))} inputMode="numeric" dir="ltr" className="text-left tracking-wide" placeholder="تومان" />
        </label>
        <Button className="mt-2" size="sm" variant="outline" disabled={disabled || localBusy} onClick={() => void saveDebt()}>
          ثبت مانده
        </Button>
      </div>
    </article>
  );
}
