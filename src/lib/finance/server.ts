import { getSql } from "@/lib/db";
import { canSeeBusinessFinance, canSeeCustomerPayment, maskIban, rejectClientAmount } from "@/lib/finance/access";
import { applyCommission, pickCommissionRule, type CommissionRule } from "@/lib/finance/commission";
import { paymentEntries, refundEntries, settlementFailEntries, settlementReserveEntries, type LedgerSide } from "@/lib/finance/ledger";
import { formatTomanFromIrr, tomanToIrr } from "@/lib/finance/money";
import { paymentsEnabled, paymentProvider, settlementProvider, vandarStatus } from "@/lib/finance/providers";
import { ProviderDisabledError } from "@/lib/finance/providers/types";

type Sql = Awaited<ReturnType<typeof getSql>>;

async function audit(sql: Sql, actorId: string | null, action: string, targetType: string, targetId: string | null, before: unknown, after: unknown, reason?: string) {
  await sql.query(
    `insert into finance_audit (id, actor_id, action, target_type, target_id, before_safe, after_safe, reason)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`,
    [crypto.randomUUID(), actorId, action, targetType, targetId, JSON.stringify(before ?? null), JSON.stringify(after ?? null), reason ?? null],
  );
}

async function postLedger(
  sql: Sql,
  input: {
    kind: string;
    idempotencyKey: string;
    entries: LedgerSide[];
    bookingId?: string | null;
    paymentId?: string | null;
    settlementId?: string | null;
    businessId?: string | null;
    memo?: string;
  },
) {
  const existing = await sql.query<{ id: string }>(`select id from ledger_transactions where idempotency_key = $1`, [input.idempotencyKey]);
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await sql.query(
    `insert into ledger_transactions (id, kind, booking_id, payment_id, settlement_id, business_id, idempotency_key, memo)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, input.kind, input.bookingId ?? null, input.paymentId ?? null, input.settlementId ?? null, input.businessId ?? null, input.idempotencyKey, input.memo ?? null],
  );
  for (const e of input.entries) {
    await sql.query(
      `insert into ledger_entries (id, transaction_id, account_code, party_id, debit_irr, credit_irr)
       values ($1,$2,$3,$4,$5,$6)`,
      [crypto.randomUUID(), id, e.account, e.partyId ?? null, e.debit, e.credit],
    );
  }
  return id;
}

async function loadRules(sql: Sql): Promise<CommissionRule[]> {
  const rows = await sql.query<{ id: string; scope: CommissionRule["scope"]; scope_id: string | null; percent_bps: number; fixed_irr: number; active: boolean }>(
    `select id, scope, scope_id, percent_bps, fixed_irr, active from commission_rules where active = true`,
  );
  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeId: r.scope_id,
    percentBps: Number(r.percent_bps),
    fixedIrr: Number(r.fixed_irr),
    active: Boolean(r.active),
  }));
}

export async function payableIrr(sql: Sql, businessId: string) {
  const rows = await sql.query<{ n: string }>(
    `select coalesce(sum(e.credit_irr - e.debit_irr),0)::text as n
     from ledger_entries e
     join ledger_transactions t on t.id = e.transaction_id
     where e.account_code = 'business_payable' and e.party_id = $1`,
    [businessId],
  );
  return Number(rows[0]?.n || 0);
}

export async function financeProviderStatus() {
  return { ...vandarStatus(), paymentsEnabled: paymentsEnabled() };
}

export async function performCreateCheckout(userId: string, raw: { bookingId: string; clientAmountIrr?: number }) {
  if (!paymentsEnabled()) {
    throw new ProviderDisabledError("وندار");
  }
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    customer_id: string | null;
    business_id: string;
    service_title: string | null;
    prices: unknown;
    owner_id: string;
    category_id: number;
  }>(
    `select k.id, k.customer_id, k.business_id, k.service_title, b.prices, b.owner_id, b.category_id
     from bookings k join businesses b on b.id = k.business_id
     where k.id = $1`,
    [raw.bookingId],
  );
  const row = rows[0];
  if (!row || row.customer_id !== userId) throw new Error("دسترسی ندارید.");
  const prices = Array.isArray(row.prices) ? (row.prices as { title: string; price: number }[]) : [];
  const item = prices.find((p) => p.title === row.service_title) ?? prices[0];
  const toman = Math.max(0, Math.round(item?.price ?? 0));
  const amountIrr = rejectClientAmount(tomanToIrr(toman), raw.clientAmountIrr);
  if (amountIrr <= 0) throw new Error("مبلغ خدمت برای پرداخت ثبت نشده است.");
  const idempotencyKey = `checkout:${row.id}`;
  const existing = await sql.query<{ id: string; status: string }>(`select id, status from payments where idempotency_key = $1`, [idempotencyKey]);
  if (existing[0]?.status === "paid") return { paymentId: existing[0].id, alreadyPaid: true };
  const paymentId = existing[0]?.id ?? crypto.randomUUID();
  const reference = existing[0] ? paymentId : crypto.randomUUID();
  if (!existing[0]) {
    await sql.query(
      `insert into payments (id, booking_id, customer_id, business_id, amount, amount_irr, currency, status, provider, purpose, internal_reference, idempotency_key)
       values ($1,$2,$3,$4,$5,$6,'IRR','created','vandar','full',$7,$8)`,
      [paymentId, row.id, userId, row.business_id, toman, amountIrr, reference, idempotencyKey],
    );
  }
  const created = await paymentProvider().createPayment({
    amountIrr,
    orderId: paymentId,
    callbackUrl: `https://kasbokarapp.com/api/payments/callback?pid=${paymentId}`,
    description: `رزرو ${row.id}`,
  });
  await sql.query(
    `update payments set status = 'redirected', provider_payment_id = $2, redirected_at = now() where id = $1`,
    [paymentId, created.providerPaymentId],
  );
  await sql.query(`update bookings set finance_status = 'awaiting_payment' where id = $1`, [row.id]);
  return { paymentId, redirectUrl: created.redirectUrl };
}

export async function performVerifyPayment(paymentId: string, actorUserId?: string) {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    status: string;
    amount_irr: number;
    provider_payment_id: string | null;
    booking_id: string;
    business_id: string;
    customer_id: string | null;
    purpose: string;
    commission_snapshot: unknown;
  }>(`select * from payments where id = $1`, [paymentId]);
  const p = rows[0];
  if (!p) throw new Error("پرداخت پیدا نشد.");
  if (p.status === "paid") return { ok: true as const, already: true };
  if (!p.provider_payment_id) throw new Error("شناسه درگاه موجود نیست.");
  const verified = await paymentProvider().verifyPayment({ providerPaymentId: p.provider_payment_id, amountIrr: Number(p.amount_irr) });
  if (verified.status !== "paid") {
    await sql.query(`update payments set status = 'failed', failed_at = now() where id = $1 and status <> 'paid'`, [p.id]);
    await sql.query(`update bookings set finance_status = 'payment_failed' where id = $1 and finance_status <> 'fully_paid'`, [p.booking_id]);
    return { ok: false as const, status: "failed" };
  }
  const rules = await loadRules(sql);
  const biz = await sql.query<{ category_id: number }>(`select category_id from businesses where id = $1`, [p.business_id]);
  const rule = pickCommissionRule(rules, { businessId: p.business_id, categoryId: biz[0]?.category_id });
  const snapshot = applyCommission(Number(p.amount_irr), rule);
  await postLedger(sql, {
    kind: "payment_verified",
    idempotencyKey: `pay:${p.id}:verified`,
    paymentId: p.id,
    bookingId: p.booking_id,
    businessId: p.business_id,
    entries: paymentEntries({
      grossIrr: snapshot.grossIrr,
      commissionIrr: snapshot.commissionIrr,
      businessId: p.business_id,
      held: p.purpose === "deposit",
    }),
  });
  await sql.query(
    `update payments set status = 'paid', verified_at = now(), paid_at = now(), commission_snapshot = $2::jsonb where id = $1`,
    [p.id, JSON.stringify(snapshot)],
  );
  await sql.query(`update bookings set finance_status = $2 where id = $1`, [p.booking_id, p.purpose === "deposit" ? "deposit_paid" : "fully_paid"]);
  await audit(sql, actorUserId ?? null, "payment_verified", "payment", p.id, { status: p.status }, { status: "paid" });
  return { ok: true as const, already: false };
}

export async function performBusinessFinance(userId: string, isAdmin: boolean, businessId?: string) {
  const sql = await getSql();
  const mine = await sql.query<{ id: string; owner_id: string; name: string }>(
    businessId
      ? `select id, owner_id, name from businesses where id = $1`
      : `select id, owner_id, name from businesses where owner_id = $1`,
    [businessId ?? userId],
  );
  const rows = isAdmin && businessId ? mine : mine.filter((b) => canSeeBusinessFinance({ actorId: userId, isAdmin, ownerId: b.owner_id }));
  if (businessId && !rows[0]) throw new Error("دسترسی ندارید.");
  const ids = rows.map((b) => b.id);
  if (!ids.length) {
    return { provider: await financeProviderStatus(), businesses: [], totals: emptyTotals() };
  }
  const sums = await sql.query<{
    business_id: string;
    gmv: string;
    commission: string;
    payable: string;
    held: string;
    settled: string;
    refunds: string;
  }>(
    `select e.party_id as business_id,
            coalesce(sum(e.credit_irr) filter (where e.account_code = 'business_payable'),0)::text as payable,
            coalesce(sum(e.credit_irr) filter (where t.kind = 'payment_verified' and e.account_code = 'customer_clearing'),0)::text as gmv,
            coalesce(sum(e.credit_irr) filter (where e.account_code = 'platform_commission'),0)::text as commission,
            coalesce(sum(e.credit_irr - e.debit_irr) filter (where e.account_code = 'deposit_held'),0)::text as held,
            coalesce(sum(e.debit_irr) filter (where t.kind = 'settlement_completed' and e.account_code = 'settlement_clearing'),0)::text as settled,
            coalesce(sum(e.credit_irr) filter (where e.account_code = 'refund_liability'),0)::text as refunds
     from ledger_entries e
     join ledger_transactions t on t.id = e.transaction_id
     where e.party_id = any($1::text[]) or t.business_id = any($1::text[])
     group by e.party_id`,
    [ids],
  );
  const ibans = await sql.query<{ business_id: string; iban: string; owner_name: string; verification_status: string }>(
    `select business_id, iban, owner_name, verification_status from business_settlement_accounts where business_id = any($1::text[])`,
    [ids],
  );
  const payments = await sql.query<{
    id: string;
    business_id: string;
    booking_id: string;
    amount_irr: number;
    status: string;
    created_at: string;
    internal_reference: string | null;
    commission_snapshot: { commissionIrr?: number; businessNetIrr?: number } | null;
  }>(
    `select id, business_id, booking_id, amount_irr, status, created_at, internal_reference, commission_snapshot
     from payments where business_id = any($1::text[]) order by created_at desc limit 80`,
    [ids],
  );
  const byId = new Map(sums.map((s) => [s.business_id, s]));
  const businesses = rows.map((b) => {
    const s = byId.get(b.id);
    const iban = ibans.find((i) => i.business_id === b.id);
    return {
      id: b.id,
      name: b.name,
      gmvIrr: Number(s?.gmv || 0),
      commissionIrr: Number(s?.commission || 0),
      payableIrr: Number(s?.payable || 0),
      heldIrr: Number(s?.held || 0),
      settledIrr: Number(s?.settled || 0),
      refundIrr: Number(s?.refunds || 0),
      ibanMasked: iban ? maskIban(iban.iban) : null,
      ibanStatus: iban?.verification_status ?? null,
    };
  });
  return {
    provider: await financeProviderStatus(),
    businesses,
    payments: payments.map((p) => ({
      id: p.id,
      businessId: p.business_id,
      bookingId: p.booking_id,
      amountIrr: Number(p.amount_irr),
      status: p.status,
      createdAt: p.created_at,
      reference: p.internal_reference,
      commissionIrr: p.commission_snapshot?.commissionIrr ?? 0,
      netIrr: p.commission_snapshot?.businessNetIrr ?? 0,
    })),
    totals: businesses.reduce((a, b) => ({
      gmvIrr: a.gmvIrr + b.gmvIrr,
      commissionIrr: a.commissionIrr + b.commissionIrr,
      payableIrr: a.payableIrr + b.payableIrr,
      heldIrr: a.heldIrr + b.heldIrr,
      settledIrr: a.settledIrr + b.settledIrr,
      refundIrr: a.refundIrr + b.refundIrr,
    }), emptyTotals()),
  };
}

function emptyTotals() {
  return { gmvIrr: 0, commissionIrr: 0, payableIrr: 0, heldIrr: 0, settledIrr: 0, refundIrr: 0 };
}

export async function performMyPayments(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    business_id: string;
    booking_id: string;
    amount_irr: number;
    status: string;
    purpose: string;
    created_at: string;
    internal_reference: string | null;
    customer_id: string | null;
    name: string;
  }>(
    `select p.id, p.business_id, p.booking_id, p.amount_irr, p.status, p.purpose, p.created_at, p.internal_reference, p.customer_id, b.name
     from payments p join businesses b on b.id = p.business_id
     where p.customer_id = $1
     order by p.created_at desc limit 80`,
    [userId],
  );
  return rows.filter((r) => canSeeCustomerPayment({ actorId: userId, isAdmin: false, customerId: r.customer_id || "" })).map((r) => ({
    id: r.id,
    businessName: r.name,
    bookingId: r.booking_id,
    amountLabel: formatTomanFromIrr(Number(r.amount_irr)),
    status: r.status,
    purpose: r.purpose,
    createdAt: r.created_at,
    reference: r.internal_reference,
  }));
}

export async function performSaveIban(userId: string, raw: { businessId: string; iban: string; ownerName: string }) {
  const sql = await getSql();
  const owned = await sql.query<{ id: string }>(`select id from businesses where id = $1 and owner_id = $2`, [raw.businessId, userId]);
  if (!owned[0]) throw new Error("دسترسی ندارید.");
  const iban = raw.iban.replace(/\s/g, "").toUpperCase();
  if (!/^IR\d{24}$/.test(iban)) throw new Error("شماره شبا معتبر نیست.");
  await sql.query(
    `insert into business_settlement_accounts (business_id, iban, owner_name, verification_status, updated_at)
     values ($1,$2,$3,'unverified', now())
     on conflict (business_id) do update set iban = excluded.iban, owner_name = excluded.owner_name, verification_status = 'unverified', updated_at = now()`,
    [raw.businessId, iban, raw.ownerName.trim()],
  );
  await audit(sql, userId, "iban_change", "business", raw.businessId, null, { iban: maskIban(iban) });
  return { ok: true as const, masked: maskIban(iban) };
}

export async function performRequestSettlement(userId: string, raw: { businessId: string; amountIrr: number }) {
  if (!settlementProvider().isEnabled()) throw new ProviderDisabledError("وندار تسویه");
  const sql = await getSql();
  const owned = await sql.query<{ id: string }>(`select id from businesses where id = $1 and owner_id = $2`, [raw.businessId, userId]);
  if (!owned[0]) throw new Error("دسترسی ندارید.");
  const available = await payableIrr(sql, raw.businessId);
  if (raw.amountIrr > available) throw new Error("مانده قابل تسویه کافی نیست.");
  const iban = await sql.query<{ iban: string }>(`select iban from business_settlement_accounts where business_id = $1`, [raw.businessId]);
  if (!iban[0]) throw new Error("ابتدا شماره شبا را ثبت کنید.");
  const id = crypto.randomUUID();
  const track = crypto.randomUUID();
  await postLedger(sql, {
    kind: "settlement_reserve",
    idempotencyKey: `set:${id}`,
    settlementId: id,
    businessId: raw.businessId,
    entries: settlementReserveEntries(raw.businessId, raw.amountIrr),
  });
  await sql.query(
    `insert into settlements (id, business_id, amount_irr, provider, internal_track_id, destination_iban, status, idempotency_key)
     values ($1,$2,$3,'vandar',$4,$5,'requested',$6)`,
    [id, raw.businessId, raw.amountIrr, track, iban[0].iban, `set:${id}`],
  );
  await audit(sql, userId, "settlement_request", "settlement", id, null, { amountIrr: raw.amountIrr });
  return { id, trackId: track, status: "requested" as const };
}

export async function performAdminFinance(userId: string) {
  const sql = await getSql();
  const admin = await sql.query<{ is_admin: boolean }>(`select is_admin from profiles where user_id = $1`, [userId]);
  if (!admin[0]?.is_admin) throw new Error("دسترسی ندارید.");
  return performBusinessFinance(userId, true);
}

export async function performFinanceCsv(userId: string, isAdmin: boolean, businessId?: string) {
  const data = await performBusinessFinance(userId, isAdmin, businessId);
  const header = "date,booking,gross_irr,commission_irr,net_irr,status,reference";
  const lines = (data.payments ?? []).map((p) => [p.createdAt, p.bookingId, p.amountIrr, p.commissionIrr, p.netIrr, p.status, p.reference ?? ""].join(","));
  return { csv: [header, ...lines].join("\n") };
}

export async function performRefundPayment(userId: string, paymentId: string, isAdmin: boolean) {
  const sql = await getSql();
  if (!isAdmin) throw new Error("دسترسی ندارید.");
  const rows = await sql.query<{
    id: string;
    status: string;
    amount_irr: number;
    business_id: string;
    purpose: string;
    commission_snapshot: { commissionIrr?: number } | null;
  }>(`select id, status, amount_irr, business_id, purpose, commission_snapshot from payments where id = $1`, [paymentId]);
  const p = rows[0];
  if (!p || p.status !== "paid") throw new Error("پرداخت قابل استرداد نیست.");
  const commissionReturned = p.commission_snapshot?.commissionIrr ?? 0;
  await postLedger(sql, {
    kind: "refund",
    idempotencyKey: `refund:${p.id}`,
    paymentId: p.id,
    businessId: p.business_id,
    entries: refundEntries({
      grossIrr: Number(p.amount_irr),
      commissionReturnedIrr: commissionReturned,
      businessId: p.business_id,
      fromHeld: p.purpose === "deposit",
    }),
  });
  await sql.query(`update payments set status = 'refunded', refunded_at = now() where id = $1`, [p.id]);
  await audit(sql, userId, "refund", "payment", p.id, { status: "paid" }, { status: "refunded" });
  return { ok: true as const };
}

export { settlementFailEntries };
