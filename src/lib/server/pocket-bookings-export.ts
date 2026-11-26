import { createHash } from "node:crypto";
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
  /**
   * Stable key of the first reference image (design), "" when there is none. The image itself is NOT
   * inlined: the Android client caps one response at 4 MB, so a few inline designs could fail the whole
   * sync. The app fetches images in small batches with `studioPocketPhotos` and caches them offline.
   */
  photoKey: string;
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
    photo_key: string | null;
  }>(
    `select r.id, r.customer_name, r.customer_phone, r.customer_phone_2, r.customer_instagram,
            r.style, r.placement, r.size_cm, r.request_type, r.idea,
            r.price_min_toman, r.price_max_toman, r.deposit_toman, r.paid_toman,
            r.session_count, r.session_minutes, b.id as booking_id,
            coalesce(b.slot_start, r.proposed_slot_start) as slot_start,
            ${PHOTO_KEY_SQL} as photo_key
       from tattoo_requests r
       left join bookings b on b.id = r.booking_id and b.status <> 'cancelled'
      where ${EXPORTABLE_SQL}
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
      name: (row.customer_name || "").trim().slice(0, 200) || "بدون نام",
      phone: row.customer_phone || "",
      style: row.style || "",
      placement: row.placement || "",
      phone2: (row.customer_phone_2 || "").slice(0, 40),
      instagram: (row.customer_instagram || "").slice(0, 80),
      sizeCm: (row.size_cm || "").slice(0, 200),
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
      photoKey: row.photo_key || "",
    }];
  });
}

/** Same row set the owner export sends (booked, scheduled, not an own-deal artist's job). */
const EXPORTABLE_SQL = `r.status = 'booked'
        and coalesce(b.slot_start, r.proposed_slot_start) is not null
        and not exists (select 1 from studio_artists a where a.id = r.artist_id and a.deal = 'own')`;

/**
 * Key of reference_images[0] computed in SQL so the export never reads image bytes:
 * panel uploads are data URLs (key "d"+md5), customer uploads are /api/tattoo-file?id=<uuid> (key "f"+uuid).
 */
const PHOTO_KEY_SQL = `(case
      when jsonb_typeof(r.reference_images) = 'array' and jsonb_typeof(r.reference_images->0) = 'string' then
        case
          when left(r.reference_images->>0, 11) = 'data:image/' then 'd' || md5(r.reference_images->>0)
          when r.reference_images->>0 ~ '^/api/tattoo-file\\?id=[0-9a-fA-F-]{36}$' then 'f' || lower(substr(r.reference_images->>0, 21))
          else ''
        end
      else ''
    end)`;

const IMAGE_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
/** Same cap as the app's backup schema for one photo. */
export const POCKET_PHOTO_MAX_CHARS = 1024 * 1024;
/** Per-response budget, well under the Android client's 4 MB response cap. */
export const POCKET_PHOTO_BUDGET_CHARS = 3 * 1024 * 1024;
export const POCKET_PHOTO_MAX_IDS = 8;

export type PocketPhotoReply = {
  photos: { serverId: string; key: string; data: string }[];
  /** No usable image (none, removed, unsupported format or larger than the cap). */
  missing: string[];
  /** Valid but did not fit this response's budget: ask again. */
  deferred: string[];
};

/**
 * First reference image of the given exported jobs. Read-only. Caller MUST have verified the session and
 * the studio-owner role first. Only rows the export would send are readable, and a tattoo-file reference
 * is resolved only inside its own request (file.request_id = job id).
 */
export async function exportPocketPhotos(
  sql: Sql,
  ids: string[],
  budget = POCKET_PHOTO_BUDGET_CHARS,
): Promise<PocketPhotoReply> {
  const wanted = [...new Set(ids)].slice(0, POCKET_PHOTO_MAX_IDS);
  const reply: PocketPhotoReply = { photos: [], missing: [], deferred: [] };
  if (!wanted.length) return reply;
  const rows = await sql.query<{ id: string; first: string | null }>(
    `select r.id,
            case when jsonb_typeof(r.reference_images) = 'array' then r.reference_images->>0 else null end as first
       from tattoo_requests r
       left join bookings b on b.id = r.booking_id and b.status <> 'cancelled'
      where r.id = any($1::text[]) and ${EXPORTABLE_SQL}`,
    [wanted],
  );
  const byId = new Map(rows.map((row) => [row.id, row.first || ""]));
  let used = 0;
  for (const id of wanted) {
    const first = byId.get(id) || "";
    let data = "";
    let key = "";
    if (first.startsWith("data:image/")) {
      data = first;
      key = "d" + createHash("md5").update(first, "utf8").digest("hex");
    } else {
      const file = /^\/api\/tattoo-file\?id=([0-9a-fA-F-]{36})$/.exec(first);
      if (file) {
        const found = await sql.query<{ data: string }>(
          `select data from tattoo_request_files where id = $1 and request_id = $2`,
          [file[1], id],
        );
        data = found[0]?.data || "";
        key = "f" + file[1].toLowerCase();
      }
    }
    if (!data || data.length > POCKET_PHOTO_MAX_CHARS || !IMAGE_DATA.test(data)) {
      reply.missing.push(id);
      continue;
    }
    if (reply.photos.length && used + data.length > budget) {
      reply.deferred.push(id);
      continue;
    }
    used += data.length;
    reply.photos.push({ serverId: id, key, data });
  }
  return reply;
}
