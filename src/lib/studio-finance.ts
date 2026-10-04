export const STUDIO_EXPENSE_CATEGORIES = [
  { id: "supplies", label: "مواد مصرفی", group: "salon" as const },
  { id: "salon_rent", label: "کرایه سالن", group: "salon" as const },
  { id: "other", label: "سایر هزینه سالن", group: "salon" as const },
  { id: "home_rent", label: "کرایه خانه", group: "life" as const },
  { id: "insurance", label: "بیمه", group: "life" as const },
  { id: "home", label: "هزینه خانه", group: "life" as const },
] as const;

export type StudioExpenseCategory = (typeof STUDIO_EXPENSE_CATEGORIES)[number]["id"];
export type StudioExpenseGroup = "salon" | "life";

export type StudioExpense = {
  id: string;
  category: StudioExpenseCategory;
  title: string;
  amountToman: number;
  monthJy: number;
  monthJm: number;
  recurring: boolean;
  note: string;
  createdAt: string;
};

export type StudioMonthPayment = {
  id: string;
  amountToman: number;
  note: string | null;
  createdAt: string;
  customerName: string;
  style: string;
  placement: string;
};

export function expenseCategoryMeta(id: string) {
  return STUDIO_EXPENSE_CATEGORIES.find((row) => row.id === id) ?? STUDIO_EXPENSE_CATEGORIES[2];
}

export function studioMonthSummary(
  paidToman: number,
  remainingMonthToman: number,
  remainingAllToman: number,
  expenses: { category: string; amountToman: number }[],
) {
  let salonCost = 0;
  let lifeCost = 0;
  for (const row of expenses) {
    const amount = Math.max(0, Math.round(Number(row.amountToman) || 0));
    if (expenseCategoryMeta(row.category).group === "life") lifeCost += amount;
    else salonCost += amount;
  }
  const paid = Math.max(0, Math.round(Number(paidToman) || 0));
  return {
    paid,
    remainingMonth: Math.max(0, Math.round(Number(remainingMonthToman) || 0)),
    remainingAll: Math.max(0, Math.round(Number(remainingAllToman) || 0)),
    salonCost,
    lifeCost,
    expenseTotal: salonCost + lifeCost,
    salonProfit: paid - salonCost,
    leftover: paid - salonCost - lifeCost,
  };
}

export type ReceivableJob = {
  who: string;
  style: string;
  placement: string;
  price: number;
  paid: number;
  continuation: boolean;
  followUp: boolean;
  closed: boolean;
  inMonth: boolean;
};

/** One open balance per customer and design. A later session does not create a second price. */
export function groupedDesigns(rows: ReceivableJob[]) {
  const grouped = new Map<string, { who: string; price: number; paid: number; inMonth: boolean }>();
  for (const row of rows) {
    const key = `${row.who}|${row.style.trim().toLowerCase()}|${row.placement.trim().toLowerCase()}`;
    const current = grouped.get(key) ?? { who: row.who, price: 0, paid: 0, inMonth: false };
    if (!row.continuation && !row.followUp && !row.closed) current.price = Math.max(current.price, row.price);
    if (row.continuation) current.price = Math.max(current.price, row.price);
    if (!row.followUp && !row.continuation && !row.closed) current.paid = Math.max(current.paid, row.paid);
    if (row.continuation) current.paid += Math.max(0, row.paid);
    if (row.inMonth) current.inMonth = true;
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

export function openReceivable(rows: ReceivableJob[], monthOnly: boolean) {
  let total = 0;
  for (const row of groupedDesigns(rows)) {
    if (monthOnly && !row.inMonth) continue;
    total += Math.max(0, row.price - Math.min(row.price, row.paid));
  }
  return total;
}

export function accountTotals(rows: ReceivableJob[]) {
  let price = 0;
  let paid = 0;
  let remaining = 0;
  for (const row of groupedDesigns(rows)) {
    const applied = Math.min(row.price, row.paid);
    price += row.price;
    paid += applied;
    remaining += row.price - applied;
  }
  return { price, paid, remaining, settled: price > 0 && remaining === 0 };
}

export function normalizeLedgerName(name: string) {
  return name
    .replace(/[يىكئ]/g, (ch) => (ch === "ك" ? "ک" : "ی"))
    .replace(/[\u200c\s]+/g, "")
    .toLowerCase()
    .replace(/^(آقای|خانوم|خانم|آقا)/, "");
}

export function ledgerDisplayName(name: string) {
  return name
    .replace(/[يك]/g, (ch) => (ch === "ك" ? "ک" : "ی"))
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(آقای|خانوم|خانم|آقا)\s+/, "");
}

export type MonthCustomerLine = {
  who: string;
  name: string;
  price: number;
  paid: number;
  paidThisMonth: number;
  remaining: number;
};

export function monthCustomerLines(
  jobs: Array<ReceivableJob & { name: string }>,
  monthPayments: Array<{ who: string; amount: number; name?: string }>,
) {
  const byWho = new Map<string, { name: string; jobs: ReceivableJob[]; monthPaid: number }>();
  const touch = (who: string, name: string) => {
    const current = byWho.get(who) ?? { name: "", jobs: [], monthPaid: 0 };
    const clean = ledgerDisplayName(name);
    if (clean && (!current.name || /^(آقا|خانم|خانوم)/.test(current.name))) current.name = clean;
    byWho.set(who, current);
    return current;
  };
  for (const job of jobs) touch(job.who, job.name).jobs.push(job);
  for (const payment of monthPayments) {
    touch(payment.who, payment.name || "").monthPaid += Math.max(0, Math.round(payment.amount));
  }
  const lines: MonthCustomerLine[] = [];
  for (const [who, row] of byWho) {
    if (!row.jobs.some((job) => job.inMonth) && row.monthPaid <= 0) continue;
    const totals = accountTotals(row.jobs);
    lines.push({
      who,
      name: row.name || "بدون نام",
      price: totals.price,
      paid: totals.paid,
      paidThisMonth: row.monthPaid,
      remaining: totals.remaining,
    });
  }
  return lines.sort((a, b) => b.paidThisMonth - a.paidThisMonth || a.name.localeCompare(b.name, "fa"));
}

export function samePersonWarnings(rows: Array<{ name: string; phone: string; phone2?: string }>) {
  const tail = (raw: string | undefined) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length < 10 || digits.endsWith("9000000000")) return "";
    return digits.slice(-10);
  };
  const byName = new Map<string, { label: string; phones: Set<string> }>();
  for (const row of rows) {
    const key = normalizeLedgerName(row.name);
    if (!key) continue;
    const current = byName.get(key) ?? { label: ledgerDisplayName(row.name) || row.name, phones: new Set<string>() };
    const phones = [tail(row.phone), tail(row.phone2)].filter(Boolean);
    if (!phones.length) current.phones.add("");
    for (const phone of phones) current.phones.add(phone);
    if (ledgerDisplayName(row.name) && /^(آقا|خانم|خانوم)/.test(current.label)) current.label = ledgerDisplayName(row.name);
    byName.set(key, current);
  }
  const warnings: string[] = [];
  for (const row of byName.values()) {
    const real = [...row.phones].filter(Boolean);
    if (real.length > 1) warnings.push(`${row.label} با بیشتر از یک شماره ثبت شده. اگر یک نفر است، شماره را یکی کن.`);
    else if (real.length === 1 && row.phones.has("")) warnings.push(`${row.label} یک بار هم بدون شماره ثبت شده و ممکن است حسابش دو تکه باشد.`);
  }
  return warnings;
}

/** Extra deposit: keep older money, then add the new amount once. */
export function paymentPlan(recorded: number, ledger: number, incoming: number) {
  const inserts: { amount: number; note: string }[] = [];
  let paid = Math.max(0, ledger);
  const gap = Math.max(0, recorded) - paid;
  if (gap > 0) {
    inserts.push({ amount: gap, note: "واریز قبلی" });
    paid += gap;
  }
  if (incoming > 0) {
    inserts.push({ amount: incoming, note: "واریز" });
    paid += incoming;
  }
  return { inserts, paid };
}

/** Approving a receipt must not add the deposit a second time if it is already in the balance. */
export function receiptPlan(recorded: number, ledger: number, deposit: number, depositRowExists: boolean) {
  if (deposit <= 0 || depositRowExists) return paymentPlan(recorded, ledger, 0);
  if (recorded - ledger >= deposit) return paymentPlan(recorded, ledger, 0);
  return paymentPlan(recorded, ledger, deposit);
}
