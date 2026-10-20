import { tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import type { getSql } from "@/lib/db";

function asTehranDay(value: unknown) {
  if (value instanceof Date) return tehranDayKey(value);
  if (typeof value !== "string" || !value) return "";
  const plain = value.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (plain) return plain[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : tehranDayKey(date);
}

const ownerScope = `(
  artist_id is null
  or not exists (
    select 1 from studio_artists a
     where a.id = artist_id and a.deal = 'own' and a.active = true
  )
)`;

/** Days that already have any customer, even a one-hour sitting. No names. */
export async function occupiedDayKeys(sql: Awaited<ReturnType<typeof getSql>>, artistId: string | null) {
  const scope = artistId ? "artist_id = $1" : ownerScope;
  const params = artistId ? [artistId] : [];
  const rows = await sql.query<{ slot: string | Date | null }>(
    `select coalesce(b.slot_start, t.proposed_slot_start) as slot
       from tattoo_requests t
       left join bookings b on b.id = t.booking_id and b.status <> 'cancelled'
      where t.status = 'booked'
        and coalesce(b.slot_start, t.proposed_slot_start) is not null
        and coalesce(b.slot_start, t.proposed_slot_start) >= now() - interval '60 days'
        and coalesce(b.slot_start, t.proposed_slot_start) < now() + interval '540 days'
        and ${scope.replaceAll("artist_id", "t.artist_id")}
     union
     select k.slot_start as slot
       from bookings k
      where k.status <> 'cancelled'
        and k.kind = 'booking'
        and k.slot_start is not null
        and k.slot_start >= now() - interval '60 days'
        and k.slot_start < now() + interval '540 days'
        and ${scope.replaceAll("artist_id", "k.artist_id")}`,
    params,
  );
  return [...new Set(rows.map((row) => asTehranDay(row.slot)).filter(Boolean))];
}

/** A day with any remaining customer sitting is full, whatever the length. */
export async function dayAlreadyTaken(
  sql: Awaited<ReturnType<typeof getSql>>,
  startIso: string,
  exceptBookingId: string | null,
  artistScope: string | null,
) {
  const day = tehranDayKey(new Date(startIso));
  const [y, m, d] = day.split("-").map(Number);
  const start = tehranLocalToIso(y, m, d, 0, 0);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const end = tehranLocalToIso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0);
  const scope =
    artistScope && artistScope !== "owner"
      ? "artist_id = $4"
      : ownerScope;
  const params = artistScope && artistScope !== "owner" ? [start, end, exceptBookingId ?? "", artistScope] : [start, end, exceptBookingId ?? ""];
  const rows = await sql.query<{ customer_name: string | null }>(
    `select customer_name from (
       select t.customer_name
         from tattoo_requests t
         left join bookings b on b.id = t.booking_id and b.status <> 'cancelled'
        where t.status = 'booked'
          and coalesce(b.slot_start, t.proposed_slot_start) >= $1
          and coalesce(b.slot_start, t.proposed_slot_start) < $2
          and coalesce(t.booking_id, '') <> $3
          and ${scope.replaceAll("artist_id", "t.artist_id")}
       union
       select k.customer_name
         from bookings k
        where k.status <> 'cancelled'
          and k.kind = 'booking'
          and k.slot_start >= $1
          and k.slot_start < $2
          and k.id <> $3
          and ${scope.replaceAll("artist_id", "k.artist_id")}
     ) taken
     limit 1`,
    params,
  );
  return rows[0] ?? null;
}
