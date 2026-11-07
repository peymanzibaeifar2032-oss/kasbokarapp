import { gregorianToJalali } from "../calendar/jalali.ts";

type Sql = { query: <T>(query: string, params: unknown[]) => Promise<T[]> };

export type PocketExportBooking = {
  serverId: string;
  day: string;
  time: string;
  name: string;
  phone: string;
  style: string;
  placement: string;
  phone2: string;
  instagram: string;
  sizeCm: string;
  requestType: string;
  idea: string;
  priceMinToman: number;
  priceMaxToman: number;
  depositToman: number;
  paidToman: number;
  /** Same formula as the site panel (tattooBalance): max(0, price_min - paid). */
  remainingToman: number;
  settled: boolean;
  sessionCount: number;
  sessionMinutes: number;
  bookingId: string;
  slotStart: string;
};

function tehranParts(date: Date) {
  const s = date.toLocaleString("sv-SE", { timeZone: "Asia/Tehran" });
  const [ymd, hms] = s.split(" ");
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = (hms ?? "00:00").split(":").map(Number);
  return { y, m, d, hh, mm };
}

const money = (value: number | string | null) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Booked studio jobs exactly as the owner's panel stores them (tattoo_requests + live bookings).
 * Read-only. Caller MUST have verified the session and the studio-owner role first.
 * paid_toman is the panel's own running total (kept in sync with tattoo_payments by the site).
 */
export async function exportPocketBookings(sql: Sql): Promise<PocketExportBooking[]> {
  const rows = await sql.query<{
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_phone_2: string | null;
    customer_instagram: string | null;
    style: string | null;
    placement: string | null;
    size_cm: string | null;
    request_type: string | null;
    idea: string | null;
    price_min_toman: number | string | null;
    price_max_toman: number | string | null;
    deposit_toman: number | string | null;
    paid_toman: number | string | null;
    session_count: number | string | null;
    session_minutes: number | string | null;
    booking_id: string | null;
    slot_start: string | Date;
  }>(
    `select r.id, r.customer_name, r.customer_phone, r.customer_phone_2, r.customer_instagram,
            r.style, r.placement, r.size_cm, r.request_type, r.idea,
            r.price_min_toman, r.price_max_toman, r.deposit_toman, r.paid_toman,
            r.session_count, r.session_minutes, b.id as booking_id,
            coalesce(b.slot_start, r.proposed_slot_start) as slot_start
       from tattoo_requests r
       left join bookings b on b.id = r.booking_id and b.status <> 'cancelled'
      where r.status = 'booked'
        and coalesce(b.slot_start, r.proposed_slot_start) is not null
        and not exists (select 1 from studio_artists a where a.id = r.artist_id and a.deal = 'own')
      order by coalesce(b.slot_start, r.proposed_slot_start)
      limit 2000`,
    [],
  );
  return rows.flatMap((row) => {
    const when = new Date(row.slot_start);
    if (Number.isNaN(when.getTime())) return [];
    const t = tehranParts(when);
    const j = gregorianToJalali(t.y, t.m, t.d);
    const price = money(row.price_min_toman);
    const paid = money(row.paid_toman);
    return [{
      serverId: row.id,
      day: `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`,
      time: `${String(t.hh).padStart(2, "0")}:${String(t.mm).padStart(2, "0")}`,
      name: row.customer_name,
      phone: row.customer_phone || "",
      style: row.style || "",
      placement: row.placement || "",
      phone2: row.customer_phone_2 || "",
      instagram: row.customer_instagram || "",
      sizeCm: row.size_cm || "",
      requestType: row.request_type || "",
      idea: (row.idea || "").slice(0, 2000),
      priceMinToman: price,
      priceMaxToman: money(row.price_max_toman),
      depositToman: money(row.deposit_toman),
      paidToman: paid,
      remainingToman: Math.max(0, price - paid),
      settled: price > 0 && paid >= price,
      sessionCount: money(row.session_count),
      sessionMinutes: money(row.session_minutes),
      bookingId: row.booking_id || "",
      slotStart: when.toISOString(),
    }];
  });
}
