import type { Sql } from "@/lib/db";
import { isIranMobile, normalizeIranPhone } from "@/lib/format";

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
