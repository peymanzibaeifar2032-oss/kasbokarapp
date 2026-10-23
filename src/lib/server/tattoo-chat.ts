import type { Sql } from "@/lib/db";
import { isIranMobile, normalizeIranPhone } from "@/lib/format";
import { makeTattooTrackingCode } from "@/lib/tattoo-flow";

export type TattooChatLine = {
  id: string;
  from: "customer" | "desk";
  body: string;
  createdAt: string;
};

let ready = false;

export async function ensureTattooChat(sql: Sql) {
  if (ready) return;
  await sql.query(`create table if not exists tattoo_chat (
    id text primary key,
    phone text not null,
    request_id text,
    from_side text not null,
    body text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create index if not exists tattoo_chat_phone_idx on tattoo_chat (phone, created_at)`);
  await sql.query(`create table if not exists tattoo_chat_files (
    id text primary key,
    phone text not null,
    request_id text,
    kind text not null,
    image text not null,
    created_at timestamptz not null default now()
  )`);
  ready = true;
}

export async function postTattooChat(sql: Sql, phone: string, from: "customer" | "desk", body: string, requestId?: string | null) {
  const normalized = normalizeIranPhone(phone);
  const text = body.trim();
  if (!isIranMobile(normalized) || text.length < 1) return;
  await ensureTattooChat(sql);
  await sql.query(
    `insert into tattoo_chat (id, phone, request_id, from_side, body) values ($1,$2,$3,$4,$5)`,
    [crypto.randomUUID(), normalized, requestId || null, from, text.slice(0, 2000)],
  );
}

export function shouldFileChat(body: string) {
  const text = body.trim();
  if (text.length < 8 || text.startsWith("[[") || text.startsWith("درخواست ثبت شد")) return false;
  if (/^(سلام|درود|خسته نباشید|ممنون|مرسی|باشه|اوکی|ok)[.!؟?\s]*$/i.test(text)) return false;
  return true;
}

export async function listUnfiledTattooChats(sql: Sql) {
  await ensureTattooChat(sql);
  const rows = await sql.query<{ phone: string; body: string; created_at: string }>(
    `select phone, body, created_at
       from (
         select distinct on (phone) phone, body, created_at
           from tattoo_chat
          where from_side = 'customer'
            and created_at > now() - interval '21 days'
            and body not like 'درخواست ثبت شد%'
          order by phone, created_at desc
       ) c
      where not exists (
        select 1 from tattoo_requests r
         where right(regexp_replace(coalesce(r.customer_phone, ''), '\\D', '', 'g'), 10)
               = right(regexp_replace(c.phone, '\\D', '', 'g'), 10)
           and r.created_at > now() - interval '21 days'
      )
      order by created_at desc
      limit 30`,
  );
  return rows.map((row) => ({ phone: row.phone, body: row.body, createdAt: row.created_at }));
}

/** A site chat that never became a form still has to show up in «در جریان». */
export async function fileLooseChatRequests(sql: Sql) {
  const chats = await listUnfiledTattooChats(sql);
  for (const chat of chats) {
    if (!shouldFileChat(chat.body)) continue;
    try {
      await insertChatRequest(sql, chat.phone, chat.body);
    } catch {
      /* the inbox must still open */
    }
  }
}

export async function fileChatRequest(sql: Sql, phone: string, body: string) {
  if (!shouldFileChat(body)) return null;
  try {
    return await insertChatRequest(sql, phone, body);
  } catch {
    return null;
  }
}

async function insertChatRequest(sql: Sql, phone: string, body: string) {
  const normalized = normalizeIranPhone(phone);
  if (!isIranMobile(normalized)) return null;
  const existing = await sql.query<{ id: string }>(
    `select id from tattoo_requests
      where right(regexp_replace(coalesce(customer_phone, ''), '\\D', '', 'g'), 10)
            = right(regexp_replace($1, '\\D', '', 'g'), 10)
        and created_at > now() - interval '21 days'
      limit 1`,
    [normalized],
  );
  if (existing[0]) return null;
  const idea = `پیام مشتری از چت سایت، بدون فرم کامل:\n${body.trim()}`.slice(0, 1500);
  const id = crypto.randomUUID();
  let trackingCode = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    trackingCode = makeTattooTrackingCode();
    try {
      await sql.query(
        `insert into tattoo_requests
          (id, tracking_code, customer_id, customer_name, customer_phone, customer_phone_2, customer_instagram,
           request_type, style, idea, placement, size_cm, preferred_dates, reference_images, body_images)
         values ($1,$2,null,$3,$4,null,null,'consultation','از چت',$5,'نامشخص','نامشخص',null,'[]'::jsonb,'[]'::jsonb)`,
        [id, trackingCode, "مشتری چت", normalized, idea],
      );
      break;
    } catch (error) {
      if (attempt === 5 || !/unique|duplicate/i.test(error instanceof Error ? error.message : "")) throw error;
    }
  }
  try {
    const admins = await sql.query<{ user_id: string }>("select user_id from profiles where is_admin = true");
    for (const admin of admins) {
      await sql.query(
        `insert into notifications (id, user_id, title, body, kind) values ($1,$2,$3,$4,'tattoo_request_new')`,
        [crypto.randomUUID(), admin.user_id, "درخواست از چت سایت", `پیام بدون فرم از ${normalized} · کد ${trackingCode}`],
      );
    }
  } catch {
    /* the inbox row is enough */
  }
  return { id, trackingCode };
}

export async function readTattooChat(sql: Sql, phone: string): Promise<TattooChatLine[]> {
  const normalized = normalizeIranPhone(phone);
  if (!isIranMobile(normalized)) return [];
  await ensureTattooChat(sql);
  const rows = await sql.query<{ id: string; from_side: string; body: string; created_at: string }>(
    `select id, from_side, body, created_at from tattoo_chat where phone=$1 order by created_at asc limit 80`,
    [normalized],
  );
  return rows.map((row) => ({
    id: row.id,
    from: row.from_side === "desk" ? "desk" : "customer",
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function listTattooChatFiles(sql: Sql, phone: string) {
  const normalized = normalizeIranPhone(phone);
  if (!isIranMobile(normalized)) return [];
  await ensureTattooChat(sql);
  const rows = await sql.query<{ id: string; kind: string }>(
    `select id, kind from tattoo_chat_files where phone=$1 order by created_at asc limit 20`,
    [normalized],
  );
  return rows.map((row) => ({ id: row.id, kind: row.kind === "signed" ? "signed" as const : "offer" as const }));
}

export async function postTattooChatFile(sql: Sql, phone: string, requestId: string | null, kind: "offer" | "signed", image: string) {
  const normalized = normalizeIranPhone(phone);
  if (!isIranMobile(normalized) || !image.startsWith("data:image/")) throw new Error("برگه ذخیره نشد.");
  if (image.length > 1_200_000) throw new Error("برگه سنگین است.");
  await ensureTattooChat(sql);
  const id = crypto.randomUUID();
  await sql.query(
    `insert into tattoo_chat_files (id, phone, request_id, kind, image) values ($1,$2,$3,$4,$5)`,
    [id, normalized, requestId, kind, image],
  );
  return id;
}

export async function readTattooChatFile(sql: Sql, phone: string, id: string) {
  const normalized = normalizeIranPhone(phone);
  if (!isIranMobile(normalized)) return null;
  await ensureTattooChat(sql);
  const rows = await sql.query<{ image: string; kind: string }>(
    `select image, kind from tattoo_chat_files where id=$1 and phone=$2 limit 1`,
    [id, normalized],
  );
  return rows[0] ?? null;
}
