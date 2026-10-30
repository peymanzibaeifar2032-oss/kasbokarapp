import { createHash, randomBytes } from "node:crypto";
import { getSql, type Sql } from "@/lib/db";
import { canAddDevice, formatCode, normalizeCode, randomActivationCode } from "@/lib/tattoo-learn/codes";

export type LearnModule = {
  id: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
};

export type LearnLesson = {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  order: number;
  isPublished: boolean;
};

export type LearnImage = {
  id: string;
  lessonId: string;
  path: string;
  caption: string;
  order: number;
};

type CodeRow = {
  id: string;
  code: string;
  max_devices: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  note: string;
};

function id() {
  return crypto.randomUUID();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("hex");
}

function imagePath(imageId: string) {
  return `/api/tattoo/image/${imageId}`;
}

async function sql() {
  return getSql();
}

async function log(db: Sql, kind: string, codeId: string | null, deviceId: string, detail: string) {
  await db.query(
    `insert into tattoo_learn_log (id, kind, code_id, device_id, detail) values ($1,$2,$3,$4,$5)`,
    [id(), kind, codeId, deviceId.slice(0, 80), detail.slice(0, 240)],
  );
}

export async function activateLearnCode(rawCode: string, deviceId: string) {
  const code = formatCode(rawCode);
  const device = deviceId.trim();
  if (normalizeCode(code).length < 12 || device.length < 8 || device.length > 80) {
    return { error: "کد یا شناسه دستگاه درست نیست.", status: 400 as const };
  }
  const db = await sql();
  const codes = await db.query<CodeRow>(
    `select id, code, max_devices, used_count, is_active, expires_at, created_at, note
       from tattoo_activation_codes where code = $1`,
    [code],
  );
  const row = codes[0];
  if (!row || !row.is_active) {
    await log(db, "activate_denied", row?.id ?? null, device, "inactive");
    return { error: "این کد فعال نیست.", status: 403 as const };
  }
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    await log(db, "activate_denied", row.id, device, "expired");
    return { error: "مهلت این کد تمام شده.", status: 403 as const };
  }
  const existing = await db.query<{ id: string; is_blocked: boolean }>(
    `select id, is_blocked from tattoo_user_access where code_id = $1 and device_id = $2`,
    [row.id, device],
  );
  const token = newToken();
  if (existing[0]) {
    if (existing[0].is_blocked) {
      await log(db, "activate_denied", row.id, device, "blocked");
      return { error: "این دستگاه بسته شده.", status: 403 as const };
    }
    await db.query(
      `update tattoo_user_access set token_hash = $2, last_seen = now() where id = $1`,
      [existing[0].id, hashToken(token)],
    );
    await log(db, "activate_ok", row.id, device, "same-device");
    return { token, accessId: existing[0].id, maxDevices: row.max_devices, usedCount: row.used_count };
  }
  if (!canAddDevice(row.used_count, row.max_devices)) {
    await log(db, "activate_denied", row.id, device, "device-limit");
    return { error: "ظرفیت دستگاه این کد پر شده.", status: 403 as const };
  }
  const bumped = await db.query<{ id: string; used_count: number; max_devices: number }>(
    `update tattoo_activation_codes
        set used_count = used_count + 1
      where id = $1 and is_active = true and used_count < max_devices
        and (expires_at is null or expires_at > now())
      returning id, used_count, max_devices`,
    [row.id],
  );
  if (!bumped[0]) {
    await log(db, "activate_denied", row.id, device, "device-limit");
    return { error: "ظرفیت دستگاه این کد پر شده.", status: 403 as const };
  }
  const accessId = id();
  try {
    await db.query(
      `insert into tattoo_user_access (id, code_id, device_id, token_hash) values ($1,$2,$3,$4)`,
      [accessId, row.id, device, hashToken(token)],
    );
  } catch {
    await db.query(`update tattoo_activation_codes set used_count = greatest(0, used_count - 1) where id = $1`, [row.id]);
    return { error: "فعال‌سازی انجام نشد. یک بار دیگر بزن.", status: 409 as const };
  }
  await log(db, "activate_ok", row.id, device, "new-device");
  return { token, accessId, maxDevices: bumped[0].max_devices, usedCount: bumped[0].used_count };
}

export async function accessFromToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await sql();
  const rows = await db.query<{ id: string; device_id: string; code_id: string }>(
    `update tattoo_user_access a
        set last_seen = now()
       from tattoo_activation_codes c
      where a.token_hash = $1
        and a.is_blocked = false
        and c.id = a.code_id
        and c.is_active = true
        and (c.expires_at is null or c.expires_at > now())
      returning a.id, a.device_id, a.code_id`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function listPublicModules() {
  const db = await sql();
  const rows = await db.query<{ id: string; title: string; description: string; order: number }>(
    `select id, title, description, "order" from tattoo_modules where is_active = true order by "order", created_at`,
  );
  return rows.map((row) => ({ id: row.id, title: row.title, description: row.description, order: row.order }));
}

export async function listPublicLessons(moduleId: string) {
  const db = await sql();
  const rows = await db.query<{ id: string; title: string; order: number }>(
    `select l.id, l.title, l."order"
       from tattoo_lessons l
       join tattoo_modules m on m.id = l.module_id
      where l.module_id = $1 and l.is_published = true and m.is_active = true
      order by l."order", l.created_at`,
    [moduleId],
  );
  return rows;
}

export async function publicLesson(lessonId: string) {
  const db = await sql();
  const rows = await db.query<LearnLesson & { module_active: boolean }>(
    `select l.id, l.module_id as "moduleId", l.title, l.content, l."order", l.is_published as "isPublished",
            m.is_active as module_active
       from tattoo_lessons l
       join tattoo_modules m on m.id = l.module_id
      where l.id = $1 and l.is_published = true and m.is_active = true`,
    [lessonId],
  );
  const lesson = rows[0];
  if (!lesson) return null;
  const images = await db.query<LearnImage>(
    `select id, lesson_id as "lessonId", image_path as path, caption, "order"
       from tattoo_lesson_images where lesson_id = $1 order by "order", id`,
    [lessonId],
  );
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    content: lesson.content,
    order: lesson.order,
    images,
  };
}

export async function askQuestion(accessId: string, deviceId: string, lessonId: string | null, text: string) {
  const db = await sql();
  if (lessonId) {
    const found = await db.query<{ id: string }>(
      `select id from tattoo_lessons where id = $1 and is_published = true`,
      [lessonId],
    );
    if (!found[0]) return { error: "این درس پیدا نشد.", status: 404 as const };
  }
  const questionId = id();
  await db.query(
    `insert into tattoo_questions (id, access_id, device_id, lesson_id, question_text, status)
     values ($1,$2,$3,$4,$5,'pending')`,
    [questionId, accessId, deviceId, lessonId, text],
  );
  await log(db, "question", null, deviceId, questionId);
  return { id: questionId };
}

export async function myQuestions(accessId: string) {
  const db = await sql();
  return db.query<{
    id: string;
    lessonId: string | null;
    questionText: string;
    answerText: string | null;
    status: string;
    createdAt: string;
    answeredAt: string | null;
  }>(
    `select id, lesson_id as "lessonId", question_text as "questionText", answer_text as "answerText",
            status, created_at as "createdAt", answered_at as "answeredAt"
       from tattoo_questions where access_id = $1 order by created_at desc limit 100`,
    [accessId],
  );
}

export async function lessonImage(imageId: string) {
  const db = await sql();
  const rows = await db.query<{ image_data: string }>(
    `select image_data from tattoo_lesson_images where id = $1`,
    [imageId],
  );
  return rows[0]?.image_data || "";
}

export async function schoolSnapshot() {
  const db = await sql();
  const ownerCode = await ownerTestCode(db);
  const modules = await db.query<LearnModule>(
    `select id, title, description, "order", is_active as "isActive" from tattoo_modules order by "order", created_at`,
  );
  const lessons = await db.query<LearnLesson>(
    `select id, module_id as "moduleId", title, content, "order", is_published as "isPublished"
       from tattoo_lessons order by "order", created_at`,
  );
  const images = await db.query<LearnImage>(
    `select id, lesson_id as "lessonId", image_path as path, caption, "order"
       from tattoo_lesson_images order by "order", id`,
  );
  const codes = await db.query(
    `select id, code, max_devices as "maxDevices", used_count as "usedCount", is_active as "isActive",
            expires_at as "expiresAt", created_at as "createdAt", note
       from tattoo_activation_codes order by created_at desc limit 200`,
  );
  const access = await db.query(
    `select a.id, a.device_id as "deviceId", a.activated_at as "activatedAt", a.last_seen as "lastSeen",
            a.is_blocked as "isBlocked", c.code
       from tattoo_user_access a
       join tattoo_activation_codes c on c.id = a.code_id
      order by a.last_seen desc limit 200`,
  );
  const questions = await db.query(
    `select q.id, q.question_text as "questionText", q.answer_text as "answerText", q.status,
            q.created_at as "createdAt", q.device_id as "deviceId", q.lesson_id as "lessonId",
            l.title as "lessonTitle"
       from tattoo_questions q
       left join tattoo_lessons l on l.id = q.lesson_id
      order by case when q.status = 'pending' then 0 else 1 end, q.created_at desc
      limit 200`,
  );
  return { modules, lessons, images, codes, access, questions, ownerCode };
}

async function ownerTestCode(db: Sql) {
  const existing = await db.query<{ code: string }>(
    `select code from tattoo_activation_codes where note = $1 and is_active = true order by created_at desc limit 1`,
    ["ورود خودم"],
  );
  if (existing[0]?.code) return existing[0].code;
  const made = await makeCodes(1, 2, "ورود خودم", null);
  return made[0] || "";
}

export async function saveModule(input: { id?: string; title: string; description: string; order: number; isActive: boolean }) {
  const db = await sql();
  const moduleId = input.id || id();
  await db.query(
    `insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
     values ($1,$2,$3,$4,$5, now())
     on conflict (id) do update set
       title = excluded.title, description = excluded.description, "order" = excluded."order",
       is_active = excluded.is_active, updated_at = now()`,
    [moduleId, input.title, input.description, input.order, input.isActive],
  );
  return { id: moduleId };
}

export async function deleteModule(moduleId: string) {
  const db = await sql();
  await db.query(`delete from tattoo_modules where id = $1`, [moduleId]);
}

export async function saveLesson(input: {
  id?: string;
  moduleId: string;
  title: string;
  content: string;
  order: number;
  isPublished: boolean;
}) {
  const db = await sql();
  const lessonId = input.id || id();
  await db.query(
    `insert into tattoo_lessons (id, module_id, title, content, "order", is_published, updated_at)
     values ($1,$2,$3,$4,$5,$6, now())
     on conflict (id) do update set
       module_id = excluded.module_id, title = excluded.title, content = excluded.content,
       "order" = excluded."order", is_published = excluded.is_published, updated_at = now()`,
    [lessonId, input.moduleId, input.title, input.content, input.order, input.isPublished],
  );
  return { id: lessonId };
}

export async function deleteLesson(lessonId: string) {
  const db = await sql();
  await db.query(`delete from tattoo_lessons where id = $1`, [lessonId]);
}

export async function saveLessonImage(input: { id?: string; lessonId: string; caption: string; order: number; imageData?: string }) {
  const db = await sql();
  const imageId = input.id || id();
  const path = imagePath(imageId);
  if (input.imageData) {
    await db.query(
      `insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
       values ($1,$2,$3,$4,$5,$6)
       on conflict (id) do update set
         lesson_id = excluded.lesson_id, image_path = excluded.image_path, image_data = excluded.image_data,
         caption = excluded.caption, "order" = excluded."order"`,
      [imageId, input.lessonId, path, input.imageData, input.caption, input.order],
    );
  } else {
    await db.query(
      `update tattoo_lesson_images set caption = $2, "order" = $3, lesson_id = $4 where id = $1`,
      [imageId, input.caption, input.order, input.lessonId],
    );
  }
  return { id: imageId, path };
}

export async function deleteLessonImage(imageId: string) {
  const db = await sql();
  await db.query(`delete from tattoo_lesson_images where id = $1`, [imageId]);
}

export async function makeCodes(count: number, maxDevices: number, note: string, expiresAt: string | null) {
  const db = await sql();
  const made: string[] = [];
  for (let i = 0; i < count; i += 1) {
    let stored = false;
    for (let attempt = 0; attempt < 5 && !stored; attempt += 1) {
      const code = randomActivationCode();
      try {
        await db.query(
          `insert into tattoo_activation_codes (id, code, max_devices, note, expires_at) values ($1,$2,$3,$4,$5)`,
          [id(), code, maxDevices, note, expiresAt],
        );
        made.push(code);
        stored = true;
      } catch {
        stored = false;
      }
    }
  }
  return made;
}

export async function setCodeActive(codeId: string, isActive: boolean) {
  const db = await sql();
  await db.query(`update tattoo_activation_codes set is_active = $2 where id = $1`, [codeId, isActive]);
}

export async function setAccessBlocked(accessId: string, blocked: boolean) {
  const db = await sql();
  await db.query(`update tattoo_user_access set is_blocked = $2 where id = $1`, [accessId, blocked]);
}

export async function answerQuestion(questionId: string, answer: string) {
  const db = await sql();
  await db.query(
    `update tattoo_questions
        set answer_text = $2, status = 'answered', answered_at = now()
      where id = $1`,
    [questionId, answer],
  );
}

export async function ownerPreview(lessonId: string) {
  const db = await sql();
  const rows = await db.query<LearnLesson>(
    `select id, module_id as "moduleId", title, content, "order", is_published as "isPublished"
       from tattoo_lessons where id = $1`,
    [lessonId],
  );
  const lesson = rows[0];
  if (!lesson) return null;
  const images = await db.query<LearnImage>(
    `select id, lesson_id as "lessonId", image_path as path, caption, "order"
       from tattoo_lesson_images where lesson_id = $1 order by "order", id`,
    [lessonId],
  );
  return { ...lesson, images };
}
