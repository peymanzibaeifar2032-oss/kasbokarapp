import { z } from "zod";
import { jalaliMonthLength, jalaliToGregorian } from "@/lib/calendar/jalali";
import { getSql } from "@/lib/db";
import { tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import { isStudioOwnerEmail, normalizeOwnerEmail } from "@/lib/studio-owner";
import { chairCut, weekKey, type StudioArtistCard, type StudioChairRow, type StudioDeal } from "@/lib/studio-artists";

type Sql = Awaited<ReturnType<typeof getSql>>;

export type StudioActor =
  | { role: "owner"; userId: string; artistId: null; ownerUserId: string }
  | { role: "artist"; userId: string; artistId: string; ownerUserId: string; name: string };

type ArtistRow = {
  id: string;
  owner_user_id: string;
  email: string;
  name: string;
  phone: string | null;
  deal: StudioDeal;
  percent: number;
  amount_toman: number;
  active: boolean;
};

function mapArtist(row: ArtistRow): StudioArtistCard {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    deal: row.deal,
    percent: Number(row.percent) || 0,
    amountToman: Number(row.amount_toman) || 0,
    active: Boolean(row.active),
  };
}

async function emailOf(sql: Sql, userId: string) {
  const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  return users[0]?.email ?? "";
}

export async function studioActor(userId: string): Promise<StudioActor | null> {
  const sql = await getSql();
  const email = normalizeOwnerEmail(await emailOf(sql, userId));
  if (!email) return null;
  if (isStudioOwnerEmail(email)) return { role: "owner", userId, artistId: null, ownerUserId: userId };
  const rows = await sql.query<ArtistRow>(
    `select id, owner_user_id, email, name, phone, deal, percent, amount_toman, active
       from studio_artists where lower(email) = $1 and active = true limit 1`,
    [email],
  );
  const row = rows[0];
  if (!row) return null;
  return { role: "artist", userId, artistId: row.id, ownerUserId: row.owner_user_id, name: row.name };
}

export async function performStudioWhoami(userId: string) {
  const actor = await studioActor(userId);
  if (!actor || actor.role !== "artist") return null;
  const sql = await getSql();
  const rows = await sql.query<ArtistRow>(
    `select id, owner_user_id, email, name, phone, deal, percent, amount_toman, active from studio_artists where id = $1`,
    [actor.artistId],
  );
  return rows[0] ? mapArtist(rows[0]) : null;
}

export async function performListStudioArtists(userId: string) {
  const actor = await studioActor(userId);
  if (!actor || actor.role !== "owner") throw new Error("فقط مدیر استودیو همکاران را می‌بیند.");
  const sql = await getSql();
  const rows = await sql.query<ArtistRow>(
    `select id, owner_user_id, email, name, phone, deal, percent, amount_toman, active
       from studio_artists where owner_user_id = $1 order by active desc, name`,
    [userId],
  );
  return rows.map(mapArtist);
}

export async function performSaveStudioArtist(userId: string, raw: unknown) {
  const actor = await studioActor(userId);
  if (!actor || actor.role !== "owner") throw new Error("فقط مدیر استودیو می‌تواند همکار اضافه کند.");
  const data = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().email(),
      phone: z.string().trim().max(40).optional(),
      deal: z.enum(["percent", "daily", "weekly"]),
      percent: z.number().int().min(0).max(100).optional(),
      amountToman: z.number().int().min(0).max(2_000_000_000).optional(),
      active: z.boolean().optional(),
    })
    .parse(raw);
  const email = normalizeOwnerEmail(data.email);
  if (isStudioOwnerEmail(email)) throw new Error("ایمیل خودت را به‌عنوان همکار نگذار.");
  if (data.deal === "percent" && !(data.percent && data.percent > 0)) throw new Error("درصد را از ۱ تا ۱۰۰ بنویس.");
  if (data.deal !== "percent" && !(data.amountToman && data.amountToman > 0)) throw new Error("مبلغ روزانه یا هفتگی را بنویس.");
  const sql = await getSql();
  const id = data.id || crypto.randomUUID();
  try {
    await sql.query(
      `insert into studio_artists (id, owner_user_id, email, name, phone, deal, percent, amount_toman, active)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set
         email = excluded.email, name = excluded.name, phone = excluded.phone,
         deal = excluded.deal, percent = excluded.percent, amount_toman = excluded.amount_toman,
         active = excluded.active`,
      [
        id,
        userId,
        email,
        data.name,
        data.phone?.trim() || null,
        data.deal,
        data.deal === "percent" ? data.percent || 0 : 0,
        data.deal === "percent" ? 0 : data.amountToman || 0,
        data.active !== false,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unique|duplicate/i.test(message)) throw new Error("این ایمیل قبلاً برای همکار دیگری ثبت شده.");
    throw error;
  }
  return { id };
}

function monthRange(jy: number, jm: number) {
  const start = jalaliToGregorian(jy, jm, 1);
  const last = jalaliToGregorian(jy, jm, jalaliMonthLength(jy, jm));
  const next = new Date(Date.UTC(last.gy, last.gm - 1, last.gd + 1));
  return {
    start: tehranLocalToIso(start.gy, start.gm, start.gd, 0, 0),
    end: tehranLocalToIso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0),
  };
}

async function ledgerFor(sql: Sql, artists: ArtistRow[], jy: number, jm: number): Promise<StudioChairRow[]> {
  if (!artists.length) return [];
  const range = monthRange(jy, jm);
  const jobs = await sql.query<{
    id: string;
    artist_id: string;
    customer_name: string;
    price_min_toman: number | null;
    slot_start: string;
  }>(
    `select r.id, r.artist_id, r.customer_name, r.price_min_toman, k.slot_start
       from tattoo_requests r
       join bookings k on k.id = r.booking_id
      where r.artist_id = any($1::text[])
        and k.status <> 'cancelled'
        and k.slot_start >= $2 and k.slot_start < $3
      order by k.slot_start`,
    [artists.map((row) => row.id), range.start, range.end],
  );
  return artists.map((artist) => {
    const mine = jobs.filter((job) => job.artist_id === artist.id);
    const days = new Set(mine.map((job) => tehranDayKey(new Date(job.slot_start))));
    const weeks = new Set([...days].map(weekKey));
    const gross = mine.reduce((sum, job) => sum + (Number(job.price_min_toman) || 0), 0);
    const cut = chairCut(artist.deal, Number(artist.percent) || 0, Number(artist.amount_toman) || 0, gross, days.size, weeks.size);
    return {
      ...mapArtist(artist),
      grossToman: gross,
      jobCount: mine.length,
      days: days.size,
      weeks: weeks.size,
      studioCutToman: cut,
      artistKeepToman: Math.max(0, gross - cut),
      jobs: mine.map((job) => ({
        id: job.id,
        customerName: job.customer_name,
        priceToman: Number(job.price_min_toman) || 0,
        slotStart: job.slot_start,
      })),
    };
  });
}

export async function performStudioChairLedger(userId: string, raw: unknown) {
  const actor = await studioActor(userId);
  if (!actor) throw new Error("دسترسی مدیریت ندارید.");
  const data = z.object({ jy: z.number().int(), jm: z.number().int().min(1).max(12) }).parse(raw ?? {});
  const sql = await getSql();
  const rows =
    actor.role === "owner"
      ? await sql.query<ArtistRow>(
          `select id, owner_user_id, email, name, phone, deal, percent, amount_toman, active
             from studio_artists where owner_user_id = $1 and active = true order by name`,
          [actor.userId],
        )
      : await sql.query<ArtistRow>(
          `select id, owner_user_id, email, name, phone, deal, percent, amount_toman, active
             from studio_artists where id = $1`,
          [actor.artistId],
        );
  const artists = await ledgerFor(sql, rows, data.jy, data.jm);
  return {
    monthJy: data.jy,
    monthJm: data.jm,
    studioCutToman: artists.reduce((sum, row) => sum + row.studioCutToman, 0),
    artists,
  };
}
