import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  STUDIO_APPRENTICE_SEEDS,
  STUDIO_APPRENTICE_TEMPLATE,
  THURSDAY_CUSTOMER_BLOCK_MESSAGE,
  formatThursdayLabel,
  isTehranThursday,
  slotTimesIso,
  upcomingThursdays,
  type ApprenticeKind,
  type ApprenticeSlotStatus,
  type StudioApprentice,
  type StudioApprenticeSlot,
} from "@/lib/studio-apprentices";

type Sql = Awaited<ReturnType<typeof getSql>>;

type ApprenticeRow = {
  id: string;
  slug: string;
  name: string;
  phone: string;
  kind: ApprenticeKind;
  default_slot_key: string | null;
  sort_order: number;
  session_goal: number;
  sessions_done: number;
};

type SlotRow = {
  id: string;
  day_key: string;
  slot_key: string;
  start_time: string;
  end_time: string;
  status: ApprenticeSlotStatus;
  apprentice_id: string | null;
  booking_id: string | null;
};

function mapApprentice(row: ApprenticeRow): StudioApprentice {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    phone: row.phone,
    kind: row.kind,
    defaultSlotKey: row.default_slot_key,
    sortOrder: row.sort_order,
    sessionGoal: row.session_goal,
    sessionsDone: row.sessions_done,
  };
}

function mapSlot(row: SlotRow): StudioApprenticeSlot {
  return {
    id: row.id,
    dayKey: row.day_key,
    slotKey: row.slot_key,
    start: row.start_time,
    end: row.end_time,
    status: row.status,
    apprenticeId: row.apprentice_id,
    bookingId: row.booking_id,
  };
}

async function listApprentices(sql: Sql, userId: string) {
  const rows = await sql.query<ApprenticeRow>(
    `select id, slug, name, phone, kind, default_slot_key, sort_order, session_goal, sessions_done
       from studio_apprentices
      where user_id=$1 and active=true
      order by sort_order, name`,
    [userId],
  );
  return rows.map(mapApprentice);
}

export async function ensureStudioApprenticeRoster(sql: Sql, userId: string) {
  for (const seed of STUDIO_APPRENTICE_SEEDS) {
    await sql.query(
      `insert into studio_apprentices
         (id, user_id, slug, name, phone, kind, default_slot_key, sort_order, session_goal, sessions_done)
       values ($1,$2,$3,$4,$5,$6,$7,$8,10,0)
       on conflict (user_id, slug) do update set
         name=excluded.name,
         phone=excluded.phone,
         kind=excluded.kind,
         default_slot_key=excluded.default_slot_key,
         sort_order=excluded.sort_order`,
      [crypto.randomUUID(), userId, seed.slug, seed.name, seed.phone, seed.kind, seed.defaultSlotKey, seed.sortOrder],
    );
  }
}

async function bumpSessions(sql: Sql, apprenticeId: string | null, delta: number) {
  if (!apprenticeId || !delta) return;
  await sql.query(
    `update studio_apprentices
        set sessions_done = least(session_goal, greatest(0, sessions_done + $2))
      where id=$1`,
    [apprenticeId, delta],
  );
}

async function ensureDaySlots(sql: Sql, userId: string, dayKey: string) {
  const roster = await listApprentices(sql, userId);
  const bySlug = new Map(roster.map((row) => [row.slug, row]));
  for (const slot of STUDIO_APPRENTICE_TEMPLATE) {
    const person = slot.defaultSlug ? bySlug.get(slot.defaultSlug) : null;
    await sql.query(
      `insert into studio_apprentice_slots
         (id, user_id, day_key, slot_key, start_time, end_time, status, apprentice_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (user_id, day_key, slot_key) do nothing`,
      [
        crypto.randomUUID(),
        userId,
        dayKey,
        slot.slotKey,
        slot.start,
        slot.end,
        slot.kind === "lunch" ? "lunch" : "planned",
        person?.id ?? null,
      ],
    );
  }
}

async function syncSlotBooking(
  sql: Sql,
  businessId: string,
  person: StudioApprentice | null,
  slot: StudioApprenticeSlot,
) {
  const template = STUDIO_APPRENTICE_TEMPLATE.find((row) => row.slotKey === slot.slotKey);
  const { startIso, endIso } = slotTimesIso(slot.dayKey, slot.start, slot.end);
  const isLunch = template?.kind === "lunch" || slot.status === "lunch";
  const eventType = isLunch ? "personal" : "block";
  const note = isLunch ? "ناهار پیمان" : `آموزش هنرجو · ${person?.name ?? "بدون هنرجو"}`;
  if (slot.bookingId) {
    await sql.query(
      `update bookings
          set slot_start=$2, slot_end=$3, event_type=$4, note=$5, customer_name=$6, status='confirmed'
        where id=$1 and status <> 'cancelled'`,
      [slot.bookingId, startIso, endIso, eventType, note, isLunch ? null : person?.name ?? null],
    );
    return slot.bookingId;
  }
  const id = crypto.randomUUID();
  try {
    await sql.query(
      `insert into bookings
         (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, source, event_type, note, status, service_title, party_size)
       values ($1,$2,null,$3,$4,$5,$6,'block','manual',$7,$8,'confirmed',null,1)`,
      [id, businessId, isLunch ? null : person?.name ?? null, person?.phone ?? null, startIso, endIso, eventType, note],
    );
  } catch {
    return null;
  }
  await sql.query(`update studio_apprentice_slots set booking_id=$2, updated_at=now() where id=$1`, [slot.id, id]);
  return id;
}

async function loadDay(sql: Sql, userId: string, dayKey: string) {
  const rows = await sql.query<SlotRow>(
    `select id, day_key, slot_key, start_time, end_time, status, apprentice_id, booking_id
       from studio_apprentice_slots
      where user_id=$1 and day_key=$2`,
    [userId, dayKey],
  );
  const order = new Map(STUDIO_APPRENTICE_TEMPLATE.map((row, index) => [row.slotKey, index]));
  return rows.map(mapSlot).sort((a, b) => (order.get(a.slotKey) ?? 99) - (order.get(b.slotKey) ?? 99));
}

async function syncDayBookings(sql: Sql, userId: string, businessId: string, dayKey: string) {
  const roster = await listApprentices(sql, userId);
  const people = new Map(roster.map((row) => [row.id, row]));
  const slots = await loadDay(sql, userId, dayKey);
  for (const slot of slots) {
    await syncSlotBooking(sql, businessId, slot.apprenticeId ? people.get(slot.apprenticeId) ?? null : null, slot);
  }
}

async function boardPayload(sql: Sql, userId: string, businessId: string, dayKey: string) {
  await syncDayBookings(sql, userId, businessId, dayKey);
  const roster = await listApprentices(sql, userId);
  const people = new Map(roster.map((row) => [row.id, row]));
  const fresh = await loadDay(sql, userId, dayKey);
  return {
    dayKey,
    label: formatThursdayLabel(dayKey),
    thursdays: upcomingThursdays(undefined, 16).map((key) => ({ dayKey: key, label: formatThursdayLabel(key) })),
    roster,
    slots: fresh.map((slot) => ({
      ...slot,
      label: STUDIO_APPRENTICE_TEMPLATE.find((row) => row.slotKey === slot.slotKey)?.label ?? slot.slotKey,
      kind: STUDIO_APPRENTICE_TEMPLATE.find((row) => row.slotKey === slot.slotKey)?.kind ?? "lesson",
      person: slot.apprenticeId ? people.get(slot.apprenticeId) ?? null : null,
    })),
  };
}

export async function performStudioApprenticeBoard(
  userId: string,
  raw: unknown,
  opts: { requireAdmin: (id: string) => Promise<void>; ensureStudioShop: (sql: Sql, id: string) => Promise<string> },
) {
  await opts.requireAdmin(userId);
  const data = z.object({ dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(raw ?? {});
  const dayKey = data.dayKey || upcomingThursdays()[0];
  if (!dayKey || !isTehranThursday(dayKey)) throw new Error("فقط پنجشنبه‌ها برای هنرجو است.");
  const sql = await getSql();
  const businessId = await opts.ensureStudioShop(sql, userId);
  await ensureStudioApprenticeRoster(sql, userId);
  for (const key of upcomingThursdays(undefined, 16)) {
    await ensureDaySlots(sql, userId, key);
    await syncDayBookings(sql, userId, businessId, key);
  }
  await ensureDaySlots(sql, userId, dayKey);
  return boardPayload(sql, userId, businessId, dayKey);
}

export async function performSetApprenticeProgress(userId: string, raw: unknown, requireAdmin: (id: string) => Promise<void>) {
  await requireAdmin(userId);
  const data = z.object({
    apprenticeId: z.string(),
    sessionsDone: z.number().int().min(0).max(10),
  }).parse(raw);
  const sql = await getSql();
  const row = await sql.query<{ id: string }>(
    `update studio_apprentices set sessions_done=$3 where id=$1 and user_id=$2 returning id`,
    [data.apprenticeId, userId, data.sessionsDone],
  );
  if (!row[0]) throw new Error("هنرجو پیدا نشد.");
  return { ok: true as const, sessionsDone: data.sessionsDone };
}

export async function performMarkApprenticeSlot(
  userId: string,
  raw: unknown,
  opts: { requireAdmin: (id: string) => Promise<void>; ensureStudioShop: (sql: Sql, id: string) => Promise<string> },
) {
  await opts.requireAdmin(userId);
  const data = z.object({
    slotId: z.string(),
    status: z.enum(["planned", "present", "absent"]),
  }).parse(raw);
  const sql = await getSql();
  const current = await sql.query<SlotRow>(
    `select id, day_key, slot_key, start_time, end_time, status, apprentice_id, booking_id
       from studio_apprentice_slots where id=$1 and user_id=$2`,
    [data.slotId, userId],
  );
  const slot = current[0];
  if (!slot) throw new Error("این ساعت پیدا نشد.");
  if (slot.status === "lunch") throw new Error("ساعت ناهار قفل است.");
  const wasPresent = slot.status === "present";
  const willPresent = data.status === "present";
  if (wasPresent && !willPresent) await bumpSessions(sql, slot.apprentice_id, -1);
  if (!wasPresent && willPresent) await bumpSessions(sql, slot.apprentice_id, 1);
  await sql.query(
    `update studio_apprentice_slots set status=$2, updated_at=now() where id=$1`,
    [data.slotId, data.status],
  );
  const businessId = await opts.ensureStudioShop(sql, userId);
  return boardPayload(sql, userId, businessId, slot.day_key);
}

export async function performAssignApprenticeSlot(
  userId: string,
  raw: unknown,
  opts: { requireAdmin: (id: string) => Promise<void>; ensureStudioShop: (sql: Sql, id: string) => Promise<string> },
) {
  await opts.requireAdmin(userId);
  const data = z.object({
    slotId: z.string(),
    apprenticeId: z.string().nullable(),
  }).parse(raw);
  const sql = await getSql();
  const current = await sql.query<SlotRow>(
    `select id, day_key, slot_key, start_time, end_time, status, apprentice_id, booking_id
       from studio_apprentice_slots where id=$1 and user_id=$2`,
    [data.slotId, userId],
  );
  const slot = current[0];
  if (!slot) throw new Error("این ساعت پیدا نشد.");
  if (slot.status === "lunch") throw new Error("ساعت ناهار قفل است.");
  if (data.apprenticeId) {
    const person = await sql.query<{ id: string; kind: string }>(
      `select id, kind from studio_apprentices where id=$1 and user_id=$2`,
      [data.apprenticeId, userId],
    );
    if (!person[0]) throw new Error("هنرجو در لیست نیست.");
    const others = await sql.query<SlotRow>(
      `select id, day_key, slot_key, start_time, end_time, status, apprentice_id, booking_id
         from studio_apprentice_slots
        where user_id=$1 and day_key=$2 and apprentice_id=$3 and id <> $4`,
      [userId, slot.day_key, data.apprenticeId, slot.id],
    );
    const roster = await listApprentices(sql, userId);
    for (const other of others) {
      if (other.status === "present") await bumpSessions(sql, other.apprentice_id, -1);
      const fallback = roster.find((row) => row.defaultSlotKey === other.slot_key) ?? null;
      await sql.query(
        `update studio_apprentice_slots set apprentice_id=$2, status='planned', updated_at=now() where id=$1`,
        [other.id, fallback?.id ?? null],
      );
    }
  }
  if (slot.status === "present" && slot.apprentice_id && slot.apprentice_id !== data.apprenticeId) {
    await bumpSessions(sql, slot.apprentice_id, -1);
  }
  await sql.query(
    `update studio_apprentice_slots
        set apprentice_id=$2, status=case when status='lunch' then status else 'planned' end, updated_at=now()
      where id=$1`,
    [data.slotId, data.apprenticeId],
  );
  const businessId = await opts.ensureStudioShop(sql, userId);
  return boardPayload(sql, userId, businessId, slot.day_key);
}

export { THURSDAY_CUSTOMER_BLOCK_MESSAGE };
