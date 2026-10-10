import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { JALALI_MONTHS, gregorianToJalali, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { formatFaDateTime } from "@/lib/format";
import { tehranClock } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import {
  STUDIO_EXPENSE_CATEGORIES,
  expenseCategoryMeta,
  studioMonthSummary,
  readDailyExpense,
  type MonthCustomerLine,
  type StudioExpense,
  type StudioMonthPayment,
} from "@/lib/studio-finance";
import { digitsOnly, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";

type Summary = ReturnType<typeof studioMonthSummary>;

type FinancePayload = {
  payments: StudioMonthPayment[];
  expenses: StudioExpense[];
  customers?: MonthCustomerLine[];
  warnings?: string[];
  summary: Summary;
};

export function StudioMonthFinance() {
  const clock = tehranClock();
  const todayJ = gregorianToJalali(clock.y, clock.m, clock.day);
  const [month, setMonth] = useState({ jy: todayJ.jy, jm: todayJ.jm });
  const [data, setData] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof STUDIO_EXPENSE_CATEGORIES)[number]["id"]>("pocket");
  const [cadence, setCadence] = useState<"once" | "month" | "day">("day");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = await saveAction<FinancePayload>("studioMonthFinance", { jy: month.jy, jm: month.jm });
      setData(next);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [month.jy, month.jm]);

  async function addExpense() {
    if (title.trim().length < 2) return toast.error("عنوان را بنویس. مثلاً سیگار یا قهوه.");
    if (!amount || Number(amount) <= 0) return toast.error("مبلغ را بنویس.");
    setBusy(true);
    try {
      await saveAction("addStudioExpense", {
        category,
        title: title.trim(),
        amountToman: Number(amount),
        jy: month.jy,
        jm: month.jm,
        cadence,
      });
      toast.success(
        cadence === "day"
          ? "ثبت شد. از این به بعد هر روز خودش به جمع ماه اضافه می‌شود."
          : cadence === "month"
            ? "ثبت شد و ماه‌های بعد هم می‌آید."
            : "هزینه همین ماه ثبت شد.",
      );
      setTitle("");
      setAmount("");
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeExpense(id: string, stopRecurring = false) {
    setBusy(true);
    try {
      await saveAction("deleteStudioExpense", { id, stopRecurring });
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const summary = data?.summary;
  const monthLabel = `${JALALI_MONTHS[month.jm - 1]} ${toFaDigits(month.jy)}`;
  const thisMonth = month.jy === todayJ.jy && month.jm === todayJ.jm;
  const previous = shiftJalaliMonth(todayJ.jy, todayJ.jm, -1);
  const onPrevious = month.jy === previous.jy && month.jm === previous.jm;
  const paid = summary?.paid ?? 0;
  const spent = summary?.expenseTotal ?? 0;

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">صندوق</h2>
        <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
          <button type="button" className={`rounded-xl px-3 py-2 ${thisMonth ? "bg-white shadow-sm" : ""}`} onClick={() => setMonth({ jy: todayJ.jy, jm: todayJ.jm })}>
            همین ماه
          </button>
          <button type="button" className={`rounded-xl px-3 py-2 ${onPrevious ? "bg-white shadow-sm" : ""}`} onClick={() => setMonth(previous)}>
            ماه قبل
          </button>
          <button type="button" className="rounded-xl px-3 py-2 text-muted" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}>
            ماه بعد
          </button>
        </div>
      </div>
      <p className="text-center text-sm font-semibold text-muted">{monthLabel}</p>

      {data?.warnings?.length ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-7">
          {data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}
      {loading ? <p className="text-sm text-muted">در حال جمع‌کردن حساب ماه…</p> : null}

      {summary ? (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-[#2f80ed] p-4 text-white">
              <p className="text-sm text-white/80">دریافتی دوره</p>
              <p className="mt-3 text-2xl font-bold tracking-tight">{formatPlainToman(paid)}</p>
            </div>
            <div className="rounded-3xl bg-[#eb5757] p-4 text-white">
              <p className="text-sm text-white/80">هزینه دوره</p>
              <p className="mt-3 text-2xl font-bold tracking-tight">{formatPlainToman(spent)}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-surface px-4 py-6">
            <Ring paid={paid} spent={spent} leftover={summary.leftover} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs leading-6">
              <p>سود سالن<br /><span className="text-sm font-bold">{formatPlainToman(summary.salonProfit)}</span></p>
              <p>طلب این ماه<br /><span className="text-sm font-bold">{formatPlainToman(summary.remainingMonth)}</span></p>
              <p>طلب کل<br /><span className="text-sm font-bold">{formatPlainToman(summary.remainingAll)}</span></p>
            </div>
            <p className="mt-3 text-center text-xs leading-6 text-muted">طلب هنوز نقد نیست و داخل دریافتی نمی‌آید. خرج روزانه، مثل سیگار و قهوه، هر روز به هزینه اضافه می‌شود.</p>
          </div>
          <SpendRing expenses={data?.expenses ?? []} />
        </div>
      ) : null}

      <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="font-bold">حساب هر مشتری</h3>
        <p className="mt-1 text-sm leading-7 text-muted">شماره، معیار یک نفر است. اسم با «آقای» یا بدون آن جدا حساب نمی‌شود.</p>
        {!data?.customers?.length ? (
          <p className="mt-3 text-sm leading-7 text-muted">این ماه برای مشتری‌ها واریز یا نوبتی نیست.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.customers.map((row) => (
              <li key={row.who} className="rounded-2xl border border-border bg-bg px-3 py-3">
                <p className="font-semibold">{row.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs leading-6 sm:grid-cols-4">
                  <p>قیمت کل<br /><span className="text-sm font-semibold">{formatTattooToman(row.price)}</span></p>
                  <p>واریزی این ماه<br /><span className="text-sm font-semibold">{formatTattooToman(row.paidThisMonth)}</span></p>
                  <p>جمع واریزی<br /><span className="text-sm font-semibold">{formatTattooToman(row.paid)}</span></p>
                  <p>مانده<br /><span className="text-sm font-semibold">{formatTattooToman(row.remaining)}</span></p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <h3 className="font-bold">یک خرج</h3>
        <p className="mt-1 text-sm leading-7 text-muted">
          سیگار و قهوه را روی «هر روز» بگذار و مبلغ همان یک روز را بنویس. جمع ماه را خودش حساب می‌کند.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-bold">
          {([
            ["day", "هر روز"],
            ["month", "هر ماه"],
            ["once", "فقط این ماه"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`h-11 rounded-2xl border ${cadence === id ? "border-[#2f80ed] bg-[#2f80ed] text-white" : "border-border"}`}
              onClick={() => setCadence(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">نوع</span>
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {STUDIO_EXPENSE_CATEGORIES.map((row) => (
                <option key={row.id} value={row.id}>{row.label}</option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">عنوان</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="سیگار، قهوه، سوزن" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{cadence === "day" ? "مبلغ یک روز" : "مبلغ"}</span>
            <Input
              value={formatGroupedDigits(amount)}
              onChange={(e) => setAmount(digitsOnly(e.target.value))}
              inputMode="numeric"
              dir="ltr"
              className="text-left tracking-wide"
              placeholder="تومان"
            />
          </label>
        </div>
        <Button className="mt-3 h-12 w-full" disabled={busy} onClick={() => void addExpense()}>
          ثبت
        </Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
          <h3 className="font-bold">واریزی‌های این ماه</h3>
          {!data?.payments.length ? (
            <p className="mt-3 text-sm leading-7 text-muted">این ماه واریزی ثبت نشده. پرداخت دستی لیست کار هم اینجا جمع می‌شود.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {data.payments.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e8f6ee] text-sm font-bold text-[#1f8a4c]">+</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{row.customerName}</p>
                    <p className="text-xs text-muted">
                      {row.style}
                      {row.placement ? ` · ${row.placement}` : ""}
                      {" · "}
                      {formatFaDateTime(row.createdAt)}
                    </p>
                  </div>
                  <p className="font-bold text-[#1f8a4c]">{formatPlainToman(row.amountToman)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
          <h3 className="font-bold">هزینه‌های این ماه</h3>
          {!data?.expenses.length ? (
            <p className="mt-3 text-sm leading-7 text-muted">هنوز هزینه‌ای برای این ماه نیست.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {data.expenses.map((row) => {
                const daily = readDailyExpense(row.note);
                return (
                  <li key={row.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fde8e8] text-sm font-bold text-[#eb5757]">−</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{row.title}</p>
                      <p className="text-xs text-muted">
                        {expenseCategoryMeta(row.category).label}
                        {daily ? ` · هر روز ${formatPlainToman(daily.perDay)} × ${toFaDigits(daily.days)} روز` : row.recurring ? " · هر ماه" : ""}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[#eb5757]">{formatPlainToman(row.amountToman)}</p>
                      <button type="button" className="text-xs text-muted" disabled={busy} onClick={() => void removeExpense(row.id, row.recurring)}>
                        {row.recurring ? "قطع تکرار" : "حذف"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function formatPlainToman(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(Number(value) || 0));
}

function Ring({ paid, spent, leftover }: { paid: number; spent: number; leftover: number }) {
  const total = paid + spent;
  const paidDeg = total > 0 ? (paid / total) * 360 : 0;
  const background = total > 0
    ? `conic-gradient(#1f8a4c 0deg ${paidDeg}deg, #6d28d9 ${paidDeg}deg 360deg)`
    : "#e7e2da";
  return (
    <div className="relative mx-auto grid size-52 place-items-center">
      <div className="absolute inset-0 rounded-full" style={{ background }} />
      <div className="absolute inset-[18%] rounded-full bg-surface" />
      <div className="relative text-center">
        <p className="text-xs text-muted">مانده دست تو</p>
        <p className={`mt-1 text-xl font-bold ${leftover < 0 ? "text-[#eb5757]" : ""}`}>{formatPlainToman(leftover)}</p>
        <p className="mt-1 text-[11px] text-muted">سبز دریافتی · بنفش هزینه</p>
      </div>
    </div>
  );
}

const SPEND_COLORS = ["#6d28d9", "#2f80ed", "#f2c94c", "#eb5757", "#1f8a4c", "#9b59b6", "#e67e22"];

function SpendRing({ expenses }: { expenses: StudioExpense[] }) {
  const groups = new Map<string, number>();
  for (const row of expenses) {
    const label = expenseCategoryMeta(row.category).label;
    groups.set(label, (groups.get(label) || 0) + row.amountToman);
  }
  const parts = [...groups.entries()].filter(([, amount]) => amount > 0);
  const total = parts.reduce((sum, [, amount]) => sum + amount, 0);
  if (!total) return null;
  let cursor = 0;
  const stops = parts.map(([, amount], index) => {
    const start = cursor;
    cursor += (amount / total) * 360;
    return `${SPEND_COLORS[index % SPEND_COLORS.length]} ${start}deg ${cursor}deg`;
  });
  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <p className="text-center text-sm font-bold">ترکیب هزینه‌ها</p>
      <div className="relative mx-auto mt-4 grid size-40 place-items-center">
        <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${stops.join(",")})` }} />
        <div className="absolute inset-[22%] rounded-full bg-surface" />
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {parts.map(([label, amount], index) => (
          <li key={label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: SPEND_COLORS[index % SPEND_COLORS.length] }} />
              {label}
            </span>
            <span className="font-semibold">{formatPlainToman(amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
