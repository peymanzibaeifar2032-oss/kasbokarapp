import { gregorianToJalali } from "../calendar/jalali.ts";
import { STUDIO_EXPENSE_CATEGORIES, studioMonthSummary } from "../studio-finance.ts";

type Sql = { query: <T>(query: string, params: unknown[]) => Promise<T[]> };

export type PocketServerCashRecord = {
  serverId: string;
  kind: "income" | "expense";
  day: string;
  amountToman: number;
  title: string;
  note: string;
  category: string;
  ref: string;
};

export type PocketServerFinance = {
  status: "ok";
  generatedAt: string;
  records: PocketServerCashRecord[];
  summary: { incomeToman: number; expenseToman: number; balanceToman: number; openReceivableToman: number };
  currentMonth: {
    jy: number;
    jm: number;
    paid: number;
    remainingMonth: number;
    remainingAll: number;
    salonCost: number;
    lifeCost: number;
    expenseTotal: number;
    salonProfit: number;
    leftover: number;
  };
  truncated: boolean;
};

const LIMIT = 5000;
/** Keep every exported field inside the app's wire limits so one odd DB row can't break the ledger. */
const safeId = (raw: string) => String(raw).replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 100) || "x";
const clip = (v: string | null | undefined, n: number) => (v ?? "").slice(0, n);

/** Asia/Tehran has had a fixed +03:30 offset since 2022. */
export function tehranJalaliDay(iso: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  const t = new Date(time + 3.5 * 3600 * 1000);
  const j = gregorianToJalali(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

const categoryLabel = (id: string) => STUDIO_EXPENSE_CATEGORIES.find((row) => row.id === id)?.label ?? "سایر هزینه";

/**
 * Read-only owner ledger from the same tables as the site's money tab (tattoo_payments + studio_expenses).
 * Caller MUST have verified the session and the studio-owner role before calling. Never writes,
 * never materializes recurring expense templates, never synthesizes rows.
 */
export async function exportPocketFinance(
  sql: Sql,
  ownerUserId: string,
  openReceivable: { month: number; all: number },
  now = new Date(),
): Promise<PocketServerFinance> {
  const payments = await sql.query<{
    id: string;
    request_id: string;
    amount_toman: number | string;
    note: string | null;
    created_at: string;
    customer_name: string | null;
    style: string | null;
    placement: string | null;
  }>(
    `select p.id, p.request_id, p.amount_toman, p.note, p.created_at::text as created_at,
            r.customer_name, r.style, r.placement
       from tattoo_payments p
       join tattoo_requests r on r.id = p.request_id
      where not exists (select 1 from studio_artists a where a.id = r.artist_id and a.deal = 'own')
      order by p.created_at desc
      limit ${LIMIT + 1}`,
    [],
  );
  const expenses = await sql.query<{
    id: string;
    category: string;
    title: string;
    amount_toman: number | string;
    month_jy: number;
    month_jm: number;
    note: string | null;
    created_at: string;
  }>(
    `select id, category, title, amount_toman, month_jy, month_jm, note, created_at::text as created_at
       from studio_expenses
      where user_id=$1
      order by month_jy desc, month_jm desc, created_at desc
      limit ${LIMIT + 1}`,
    [ownerUserId],
  );
  const truncated = payments.length > LIMIT || expenses.length > LIMIT;
  const records: PocketServerCashRecord[] = [];
  for (const row of payments.slice(0, LIMIT)) {
    const amount = Math.round(Number(row.amount_toman));
    const day = tehranJalaliDay(row.created_at);
    if (!day || !Number.isFinite(amount) || amount <= 0) continue;
    records.push({
      serverId: `pay:${safeId(row.id)}`,
      kind: "income",
      day,
      amountToman: amount,
      title: clip(row.customer_name?.trim() || "واریز مشتری", 200),
      note: clip(row.note, 500),
      category: "واریز مشتری",
      ref: clip([row.style, row.placement].filter(Boolean).join(" · "), 300),
    });
  }
  for (const row of expenses.slice(0, LIMIT)) {
    const amount = Math.round(Number(row.amount_toman));
    const jy = Number(row.month_jy);
    const jm = Number(row.month_jm);
    if (!Number.isFinite(amount) || amount <= 0 || !(jm >= 1 && jm <= 12) || !(jy > 1300)) continue;
    const daily = /^daily:(\d+)x(\d+)$/.exec(row.note || "");
    records.push({
      serverId: `exp:${safeId(row.id)}`,
      kind: "expense",
      day: `${jy}-${String(jm).padStart(2, "0")}-01`,
      amountToman: amount,
      title: clip(row.title?.trim() || categoryLabel(row.category), 200),
      note: daily ? `روزانه ${daily[1]} × ${daily[2]} روز` : clip(row.note, 500),
      category: clip(categoryLabel(row.category), 80),
      ref: "هزینهٔ ماهانهٔ سایت",
    });
  }
  let income = 0;
  let expense = 0;
  for (const row of records) {
    if (row.kind === "income") income += row.amountToman;
    else expense += row.amountToman;
  }
  const today = tehranJalaliDay(now.toISOString())!;
  const [jy, jm] = today.split("-").map(Number);
  const monthKey = `${jy}-${String(jm).padStart(2, "0")}-`;
  const monthPaid = records
    .filter((row) => row.kind === "income" && row.day.startsWith(monthKey))
    .reduce((sum, row) => sum + row.amountToman, 0);
  const monthExpenses = expenses
    .filter((row) => Number(row.month_jy) === jy && Number(row.month_jm) === jm)
    .map((row) => ({ category: row.category, amountToman: Number(row.amount_toman) || 0 }));
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    records,
    summary: {
      incomeToman: income,
      expenseToman: expense,
      balanceToman: income - expense,
      openReceivableToman: Math.max(0, Math.round(openReceivable.all) || 0),
    },
    currentMonth: { jy, jm, ...studioMonthSummary(monthPaid, openReceivable.month, openReceivable.all, monthExpenses) },
    truncated,
  };
}
