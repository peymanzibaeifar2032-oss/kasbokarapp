import { gregorianToJalali } from "../calendar/jalali.ts";
/** Wire shape consumed by the Pocket app (mirrors src/lib/pocket/trainees.ts on the client). */
export type Trainee = {
  id: string; name: string; phone: string; honorific: string; sessionGoal: number; sessionsDone: number;
  feeTotalToman: number; paidToman: number; notes: string; startedOn: string; createdAt: string;
  serverId?: string; debtToman?: number;
};
export type TraineePayment = { id: string; traineeId: string; amountToman: number; paidOn: string; note: string };
type Sql = { query: <T>(query: string, params: unknown[]) => Promise<T[]> };
const jalaliDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const j = gregorianToJalali(y, m, d);
  return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
};
/** Read-only existing tables. Caller MUST supply verified session + owner authorization first. Never seed roster. */
export async function exportPocketTrainees(
  sql: Sql,
  ownerUserId: string,
): Promise<{ trainees: Trainee[]; traineePayments: TraineePayment[] }> {
  const rows = await sql.query<{
    id: string;
    name: string;
    phone: string;
    kind: string;
    session_goal: number;
    sessions_done: number;
    debt_toman: number;
    created_at: string;
  }>(
    `select id, name, phone, kind, session_goal, sessions_done, coalesce(debt_toman,0) as debt_toman, created_at::text as created_at
       from studio_apprentices where user_id=$1 and active=true order by sort_order, name`,
    [ownerUserId],
  );
  const payments = await sql.query<{
    id: string;
    apprentice_id: string;
    amount_toman: number | string;
    paid_on: string;
    note: string | null;
  }>(
    `select p.id,p.apprentice_id,p.amount_toman,p.paid_on::text as paid_on,p.note
       from studio_apprentice_payments p join studio_apprentices a on a.id=p.apprentice_id and a.user_id=p.user_id
      where p.user_id=$1 and a.active=true order by p.paid_on,p.id`,
    [ownerUserId],
  );
  const paid = new Map<string, number>();
  for (const row of payments)
    paid.set(row.apprentice_id, (paid.get(row.apprentice_id) || 0) + Number(row.amount_toman));
  return {
    trainees: rows.map((row) => ({
      id: `srv-trainee-${row.id}`,
      serverId: row.id,
      name: row.name,
      phone: row.phone,
      honorific: "",
      sessionGoal: Number(row.session_goal),
      sessionsDone: Number(row.sessions_done),
      feeTotalToman: (paid.get(row.id) || 0) + Math.max(0, Number(row.debt_toman) || 0),
      paidToman: paid.get(row.id) || 0,
      debtToman: Math.max(0, Number(row.debt_toman) || 0),
      notes: row.kind === "substitute" ? "هنرجوی جایگزین" : "",
      startedOn: jalaliDate(row.created_at),
      createdAt: new Date(row.created_at).toISOString(),
    })),
    traineePayments: payments.map((row) => ({
      id: `srv-tpay-${row.id}`,
      traineeId: `srv-trainee-${row.apprentice_id}`,
      amountToman: Number(row.amount_toman),
      paidOn: jalaliDate(row.paid_on),
      note: row.note || "",
    })),
  };
}
