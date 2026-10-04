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
export function openReceivable(rows: ReceivableJob[], monthOnly: boolean) {
  const grouped = new Map<string, { price: number; paid: number; inMonth: boolean }>();
  for (const row of rows) {
    const key = `${row.who}|${row.style.trim().toLowerCase()}|${row.placement.trim().toLowerCase()}`;
    const current = grouped.get(key) ?? { price: 0, paid: 0, inMonth: false };
    if (!row.continuation && !row.followUp && !row.closed) current.price = Math.max(current.price, row.price);
    if (row.continuation) current.price = Math.max(current.price, row.price);
    if (!row.followUp && !(row.closed && !row.continuation)) current.paid += Math.max(0, row.paid);
    if (row.inMonth) current.inMonth = true;
    grouped.set(key, current);
  }
  let total = 0;
  for (const row of grouped.values()) {
    if (monthOnly && !row.inMonth) continue;
    const paid = Math.min(row.price, row.paid);
    total += Math.max(0, row.price - paid);
  }
  return total;
}
