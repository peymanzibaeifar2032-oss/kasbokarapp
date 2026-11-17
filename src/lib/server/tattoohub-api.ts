import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { cleanAudio, cleanImage, cleanText } from "@/lib/tattoohub";

type Sql = Awaited<ReturnType<typeof getSql>>;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });
}

async function viewerId(sql: Sql, request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token.startsWith("th_")) {
    const rows = await sql.query<{ user_id: string }>("select user_id from tattoohub_tokens where token = $1", [token]);
    if (rows[0]) return rows[0].user_id;
  }
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  return session?.user?.id || "";
}

async function ensureProfile(sql: Sql, userId: string) {
  const existing = await sql.query<{ user_id: string }>("select user_id from tattoohub_profiles where user_id = $1", [userId]);
  if (existing[0]) return;
  const users = await sql.query<{ name: string | null; email: string | null }>(`select name, email from "user" where id = $1`, [userId]);
  const user = users[0];
  const name = cleanText(user?.name, 80) || cleanText(user?.email?.split("@")[0], 80) || "آرتیست";
  await sql.query(
    `insert into tattoohub_profiles (user_id, name) values ($1, $2) on conflict (user_id) do nothing`,
    [userId, name],
  );
}

export async function handleTattooHub(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "روش نادرست است." }, 405);
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "درخواست نامعتبر است." }, 400);
  }
  const action = cleanText(body.action, 40);
  try {
    const sql = await getSql();
    const userId = await viewerId(sql, request);
    if (action === "mint") {
      if (!userId) return json({ error: "اول با گوگل وارد شو." }, 401);
      await ensureProfile(sql, userId);
      const token = `th_${crypto.randomUUID().replace(/-/g, "")}`;
      await sql.query("insert into tattoohub_tokens (token, user_id) values ($1, $2)", [token, userId]);
      return json({ token });
    }
    if (action === "feed") return json(await loadFeed(sql, userId, body));
    if (!userId) return json({ error: "برای این کار باید با گوگل وارد شوی." }, 401);
    await ensureProfile(sql, userId);
    if (action === "profile") return json(await saveProfile(sql, userId, body));
    if (action === "post") return json(await createPost(sql, userId, body));
    if (action === "like") return json(await toggleLike(sql, userId, cleanText(body.postId, 40)));
    if (action === "comment") return json(await addComment(sql, userId, body));
    if (action === "story") return json(await addStory(sql, userId, body));
    if (action === "storyReply") return json(await storyReply(sql, userId, body));
    if (action === "send") return json(await sendMessage(sql, userId, body));
    if (action === "thread") return json(await loadThread(sql, userId, cleanText(body.withId, 80)));
    if (action === "typing") return json(await touchTyping(sql, userId, cleanText(body.withId, 80)));
    if (action === "save") return json(await saveCollection(sql, userId, body));
    return json({ error: "این کار شناخته نشد." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "انجام نشد.";
    return json({ error: message }, 400);
  }
}

async function loadFeed(sql: Sql, userId: string, body: Record<string, unknown>) {
  const limit = Math.min(36, Math.max(6, Number(body.limit) || 18));
  const offset = Math.max(0, Number(body.offset) || 0);
  const posts = await sql.query<Record<string, unknown>>(
    `select p.id, p.user_id, p.caption, p.image, p.compare, p.style, p.technique, p.ink, p.needle, p.needle_type, p.machine, p.created_at,
            coalesce(pr.name, 'آرتیست') as name, pr.avatar, pr.city,
            (select count(*)::int from tattoohub_likes l where l.post_id = p.id) as likes,
            exists(select 1 from tattoohub_likes l where l.post_id = p.id and l.user_id = $1) as liked
       from tattoohub_posts p
       left join tattoohub_profiles pr on pr.user_id = p.user_id
      order by p.created_at desc
      limit $2 offset $3`,
    [userId, limit, offset],
  );
  const ids = posts.map((row) => String(row.id));
  const comments = ids.length
    ? await sql.query<Record<string, unknown>>(
        `select c.id, c.post_id, c.body, c.created_at, coalesce(pr.name, 'آرتیست') as name
           from tattoohub_comments c
           left join tattoohub_profiles pr on pr.user_id = c.user_id
          where c.post_id = any($1::text[])
          order by c.created_at`,
        [ids],
      )
    : [];
  const stories = await sql.query<Record<string, unknown>>(
    `select s.id, s.user_id, s.body, s.image, s.created_at, coalesce(pr.name, 'آرتیست') as name, pr.avatar
       from tattoohub_stories s
       left join tattoohub_profiles pr on pr.user_id = s.user_id
      where s.created_at > now() - interval '24 hours'
      order by s.created_at desc`,
  );
  const people = await sql.query<Record<string, unknown>>(
    `select user_id, name, city, avatar, bio, styles from tattoohub_profiles order by updated_at desc limit 80`,
  );
  const me = userId
    ? (await sql.query<Record<string, unknown>>(`select user_id, name, city, avatar, bio, styles from tattoohub_profiles where user_id = $1`, [userId]))[0] || null
    : null;
  const unreadRows = userId
    ? await sql.query<{ c: number }>(`select count(*)::int as c from tattoohub_messages where to_id = $1 and read_at is null`, [userId])
    : [];
  const recent = userId
    ? await sql.query(
        `select id, from_id, to_id, body, image, audio, created_at, read_at
           from tattoohub_messages where from_id = $1 or to_id = $1
          order by created_at desc limit 200`,
        [userId],
      )
    : [];
  const savedRows = userId
    ? await sql.query<{ post_ids: string[] }>(`select post_ids from tattoohub_collections where user_id = $1 and name = 'ذخیره‌ها'`, [userId])
    : [];
  const byPost = new Map<string, Record<string, unknown>[]>();
  for (const comment of comments) {
    const key = String(comment.post_id);
    const list = byPost.get(key) || [];
    list.push({ id: comment.id, name: comment.name, text: comment.body });
    byPost.set(key, list);
  }
  return {
    me,
    people,
    stories,
    posts: posts.map((row) => ({ ...row, comments: byPost.get(String(row.id)) || [] })),
    unread: unreadRows[0]?.c || 0,
    recent,
    saved: savedRows[0]?.post_ids || [],
  };
}

async function saveProfile(sql: Sql, userId: string, body: Record<string, unknown>) {
  const name = cleanText(body.name, 80);
  if (name.length < 2) throw new Error("نام را بنویس.");
  const avatar = body.avatar ? cleanImage(body.avatar) : "";
  const styles = Array.isArray(body.styles) ? body.styles.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 6) : [];
  await sql.query(
    `insert into tattoohub_profiles (user_id, name, bio, city, styles, avatar, updated_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, now())
     on conflict (user_id) do update set name = $2, bio = $3, city = $4, styles = $5::jsonb,
       avatar = case when $6 = '' then tattoohub_profiles.avatar else $6 end, updated_at = now()`,
    [userId, name, cleanText(body.bio, 280), cleanText(body.city, 60), JSON.stringify(styles), avatar],
  );
  return { ok: true };
}

async function createPost(sql: Sql, userId: string, body: Record<string, unknown>) {
  const caption = cleanText(body.caption, 1500);
  const image = body.image ? cleanImage(body.image) : "";
  const compareIn = body.compare && typeof body.compare === "object" ? (body.compare as Record<string, unknown>) : null;
  const compare = compareIn
    ? {
        sketch: compareIn.sketch ? cleanImage(compareIn.sketch) : "",
        fresh: compareIn.fresh ? cleanImage(compareIn.fresh) : "",
        healed: compareIn.healed ? cleanImage(compareIn.healed) : "",
      }
    : null;
  if (!image && !compare) throw new Error("حداقل یک عکس از گالری انتخاب کن.");
  if (compare && !compare.sketch && !compare.fresh && !compare.healed) throw new Error("حداقل یک عکس از گالری انتخاب کن.");
  const id = crypto.randomUUID();
  await sql.query(
    `insert into tattoohub_posts (id, user_id, caption, image, compare, style, technique, ink, needle, needle_type, machine)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      userId,
      caption,
      image,
      compare ? JSON.stringify(compare) : null,
      cleanText(body.style, 40),
      cleanText(body.technique, 40),
      cleanText(body.ink, 40),
      cleanText(body.needle, 40),
      cleanText(body.type, 40),
      cleanText(body.machine, 40),
    ],
  );
  return { id };
}

async function toggleLike(sql: Sql, userId: string, postId: string) {
  if (!postId) throw new Error("پست پیدا نشد.");
  const existing = await sql.query("select 1 from tattoohub_likes where post_id = $1 and user_id = $2", [postId, userId]);
  if (existing[0]) await sql.query("delete from tattoohub_likes where post_id = $1 and user_id = $2", [postId, userId]);
  else await sql.query("insert into tattoohub_likes (post_id, user_id) values ($1, $2)", [postId, userId]);
  return { ok: true };
}

async function addComment(sql: Sql, userId: string, body: Record<string, unknown>) {
  const text = cleanText(body.text, 500);
  const postId = cleanText(body.postId, 40);
  if (text.length < 1 || !postId) throw new Error("نظر را بنویس.");
  await sql.query("insert into tattoohub_comments (id, post_id, user_id, body) values ($1, $2, $3, $4)", [crypto.randomUUID(), postId, userId, text]);
  return { ok: true };
}

async function addStory(sql: Sql, userId: string, body: Record<string, unknown>) {
  const text = cleanText(body.text, 280);
  const image = body.image ? cleanImage(body.image) : "";
  if (text.length < 1 && !image) throw new Error("برای استوری متن یا عکس بگذار.");
  await sql.query("insert into tattoohub_stories (id, user_id, body, image) values ($1, $2, $3, $4)", [crypto.randomUUID(), userId, text, image]);
  return { ok: true };
}

async function sendMessage(sql: Sql, userId: string, body: Record<string, unknown>) {
  const to = cleanText(body.to, 80);
  const text = cleanText(body.text, 1000);
  const image = body.image ? cleanImage(body.image) : "";
  const audio = body.audio ? cleanAudio(body.audio) : "";
  if (!to || to === userId || (!text && !image && !audio)) throw new Error("پیام را بنویس.");
  await sql.query(
    "insert into tattoohub_messages (id, from_id, to_id, body, image, audio) values ($1, $2, $3, $4, $5, $6)",
    [crypto.randomUUID(), userId, to, text, image, audio],
  );
  return loadThread(sql, userId, to);
}

async function touchTyping(sql: Sql, userId: string, withId: string) {
  if (!withId) return { ok: true };
  await sql.query(
    `insert into tattoohub_typing (user_id, with_id, updated_at) values ($1, $2, now())
     on conflict (user_id, with_id) do update set updated_at = now()`,
    [userId, withId],
  );
  return { ok: true };
}

async function loadThread(sql: Sql, userId: string, withId: string) {
  await sql.query(
    `update tattoohub_messages set read_at = now() where to_id = $1 and from_id = $2 and read_at is null`,
    [userId, withId],
  );
  const rows = await sql.query(
    `select id, from_id, to_id, body, image, audio, created_at, read_at from tattoohub_messages
      where (from_id = $1 and to_id = $2) or (from_id = $2 and to_id = $1)
      order by created_at`,
    [userId, withId],
  );
  const typing = await sql.query(
    `select 1 from tattoohub_typing where user_id = $1 and with_id = $2 and updated_at > now() - interval '3 seconds'`,
    [withId, userId],
  );
  return { messages: rows, typing: Boolean(typing[0]) };
}

async function storyReply(sql: Sql, userId: string, body: Record<string, unknown>) {
  const storyId = cleanText(body.storyId, 80);
  const kind = body.kind === "react" ? "react" : "reply";
  const text = cleanText(body.text, 280);
  if (!storyId || !text) throw new Error("پاسخ را بنویس.");
  await sql.query(
    "insert into tattoohub_story_replies (id, story_id, user_id, kind, body) values ($1, $2, $3, $4, $5)",
    [crypto.randomUUID(), storyId, userId, kind, text],
  );
  return { ok: true };
}

async function saveCollection(sql: Sql, userId: string, body: Record<string, unknown>) {
  const name = cleanText(body.name, 40) || "ذخیره‌ها";
  const postId = cleanText(body.postId, 40);
  if (!postId) throw new Error("پست پیدا نشد.");
  const found = await sql.query<{ id: string; post_ids: string[] }>(
    "select id, post_ids from tattoohub_collections where user_id = $1 and name = $2",
    [userId, name],
  );
  if (!found[0]) {
    await sql.query("insert into tattoohub_collections (id, user_id, name, post_ids) values ($1, $2, $3, $4::jsonb)", [
      crypto.randomUUID(),
      userId,
      name,
      JSON.stringify([postId]),
    ]);
    return { saved: true };
  }
  const ids = Array.isArray(found[0].post_ids) ? found[0].post_ids : [];
  const next = ids.includes(postId) ? ids.filter((id) => id !== postId) : ids.concat(postId);
  await sql.query("update tattoohub_collections set post_ids = $2::jsonb where id = $1", [found[0].id, JSON.stringify(next)]);
  return { saved: next.includes(postId) };
}
