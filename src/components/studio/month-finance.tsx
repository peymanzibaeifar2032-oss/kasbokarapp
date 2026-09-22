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
  type StudioExpense,
  type StudioMonthPayment,
} from "@/lib/studio-finance";
import { digitsOnly, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";

type Summary = ReturnType<typeof studioMonthSummary>;

type FinancePayload = {
  payments: StudioMonthPayment[];
  expenses: StudioExpense[];
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
  const [category, setCategory] = useState<(typeof STUDIO_EXPENSE_CATEGORIES)[number]["id"]>("supplies");
  const [recurring, setRecurring] = useState(false);
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
    if (title.trim().length < 2) return toast.error("عنوان هزینه را بنویسید. مثلاً سوزن یا الکل.");
    if (!amount || Number(amount) <= 0) return toast.error("مبلغ را بنویسید.");
    setBusy(true);
    try {
      await saveAction("addStudioExpense", {
        category,
        title: title.trim(),
        amountToman: Number(amount),
        jy: month.jy,
        jm: month.jm,
        recurring,
      });
      toast.success(recurring ? "هزینه ثبت شد و ماه بعد هم می‌آید." : "هزینه ثبت شد.");
      setTitle("");
      setAmount("");
      setRecurring(false);
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

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-lg font-bold">درآمد و هزینه {monthLabel}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted">
            واریزی یعنی پولی که همین ماه به کارت آمده. مانده یعنی طلب از مشتری، هنوز نقد نیست. سود سالن جدا از کرایه خانه و بیمه حساب می‌شود.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, -1))}>
            ماه قبل
          </Button>
          <p className="min-w-28 text-center text-sm font-semibold">{monthLabel}</p>
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => shiftJalaliMonth(m.jy, m.jm, 1))}>
            ماه بعد
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : null}
      {loading ? <p className="text-sm text-muted">در حال جمع‌کردن حساب ماه…</p> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MoneyCard label="واریزی این ماه" value={summary.paid} hint="بیعانه و پرداخت دستی" />
          <MoneyCard label="مانده کارهای این ماه" value={summary.remainingMonth} hint="طلب مشتری برای نوبت همین ماه" />
          <MoneyCard label="مانده کل مشتریان" value={summary.remainingAll} hint="هنوز نقد نشده" />
          <MoneyCard label="هزینه سالن" value={summary.salonCost} hint="مواد + کرایه سالن" />
          <MoneyCard label="سود سالن" value={summary.salonProfit} hint="واریزی منهای هزینه سالن" accent />
          <MoneyCard label="باقیمانده بعد از زندگی" value={summary.leftover} hint="بعد از کرایه خانه، بیمه و خانه" accent />
        </div>
      ) : null}

      <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="font-bold">ثبت هزینه</h3>
        <p className="mt-1 text-sm leading-7 text-muted">
          سوزن، الکل، دستمال، سلفون، کرایه سالن را اینجا بزن. کرایه خانه و بیمه را جدا انتخاب کن تا با سود سالن قاطی نشود.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">نوع</span>
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {STUDIO_EXPENSE_CATEGORIES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">عنوان</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً سوزن / الکل / کرایه" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">مبلغ</span>
            <Input
              value={formatGroupedDigits(amount)}
              onChange={(e) => setAmount(digitsOnly(e.target.value))}
              inputMode="numeric"
              dir="ltr"
              className="text-left tracking-wide"
              placeholder="تومان"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-current"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            هر ماه تکرار شود
          </label>
        </div>
        <Button className="mt-3" disabled={busy} onClick={() => void addExpense()}>
          افزودن هزینه
        </Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
          <h3 className="font-bold">واریزی‌های این ماه</h3>
          {!data?.payments.length ? (
            <p className="mt-3 text-sm leading-7 text-muted">این ماه واریزی ثبت نشده. پرداخت دستی لیست کار هم اینجا جمع می‌شود.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.payments.map((row) => (
                <li key={row.id} className="rounded-2xl border border-border bg-bg px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.customerName}</p>
                      <p className="text-muted">
                        {row.style}
                        {row.placement ? ` · ${row.placement}` : ""}
                      </p>
                      <p className="text-xs text-muted">{formatFaDateTime(row.createdAt)}</p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatTattooToman(row.amountToman)}</p>
                  </div>
                  {row.note ? <p className="mt-1 text-xs text-muted">{row.note}</p> : null}
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
            <ul className="mt-3 space-y-2 text-sm">
              {data.expenses.map((row) => (
                <li key={row.id} className="rounded-2xl border border-border bg-bg px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.title}</p>
                      <p className="text-muted">
                        {expenseCategoryMeta(row.category).label}
                        {row.recurring ? " · تکرار ماهانه" : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatTattooToman(row.amountToman)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void removeExpense(row.id, false)}>
                      حذف از این ماه
                    </Button>
                    {row.recurring ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => void removeExpense(row.id, true)}>
                        دیگر تکرار نشود
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-3xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-surface"}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold">{formatTattooToman(value)}</p>
      <p className="mt-1 text-xs leading-6 text-muted">{hint}</p>
    </div>
  );
}
