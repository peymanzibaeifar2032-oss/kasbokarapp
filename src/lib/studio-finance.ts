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
