import { tehranDayKey } from "@/lib/hours";
import type { getSql } from "@/lib/db";

function asTehranDay(value: unknown) {
  if (value instanceof Date) return tehranDayKey(value);
  if (typeof value !== "string" || !value) return "";
  const plain = value.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (plain) return plain[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : tehranDayKey(date);
}

/** Days that already have the owner's work, or one chair artist's work. No names. */
export async function occupiedDayKeys(sql: Awaited<ReturnType<typeof getSql>>, artistId: string | null) {
  const rows = artistId
    ? await sql.query<{ slot: string | Date | null }>(
        `select coalesce(b.slot_start, t.proposed_slot_start) as slot
           from tattoo_requests t
           left join bookings b on b.id = t.booking_id and b.status not in ('cancelled')
          where t.status = 'booked'
            and t.artist_id = $1
            and coalesce(b.slot_start, t.proposed_slot_start) is not null
            and coalesce(b.slot_start, t.proposed_slot_start) >= now() - interval '40 days'
            and coalesce(b.slot_start, t.proposed_slot_start) < now() + interval '120 days'
         union
         select k.slot_start
           from bookings k
          where k.artist_id = $1
            and k.status in ('requested', 'confirmed')
            and k.kind in ('booking', 'block')
            and k.slot_start >= now() - interval '40 days'
            and k.slot_start < now() + interval '120 days'`,
        [artistId],
      )
    : await sql.query<{ slot: string | Date | null }>(
        `select coalesce(b.slot_start, t.proposed_slot_start) as slot
           from tattoo_requests t
           left join bookings b on b.id = t.booking_id and b.status not in ('cancelled')
          where t.status = 'booked'
            and coalesce(b.slot_start, t.proposed_slot_start) is not null
            and coalesce(b.slot_start, t.proposed_slot_start) >= now() - interval '40 days'
            and coalesce(b.slot_start, t.proposed_slot_start) < now() + interval '120 days'
            and (
              t.artist_id is null
              or not exists (
                select 1 from studio_artists a
                 where a.id = t.artist_id and a.deal = 'own' and a.active = true
              )
            )
         union
         select k.slot_start as slot
           from bookings k
          where k.status in ('requested', 'confirmed')
            and k.kind in ('booking', 'block')
            and k.slot_start >= now() - interval '40 days'
            and k.slot_start < now() + interval '120 days'
            and k.artist_id is null
            and exists (
              select 1 from businesses biz
                join "user" u on u.id = biz.owner_id
               where biz.id = k.business_id
                 and replace(lower(u.email), '.', '') = 'peymanzibaeifar2032@gmail.com'
            )`,
      );
  return [...new Set(rows.map((row) => asTehranDay(row.slot)).filter(Boolean))];
}
