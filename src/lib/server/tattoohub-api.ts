import { auth } from "@/lib/auth/server";
import { shouldGrantBootstrapAdmin } from "@/lib/server/admin-bootstrap";
import { getSql } from "@/lib/db";
import { canSeePractice, cleanAudio, cleanImage, cleanText, rankForYou } from "@/lib/tattoohub";

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
    if (action === "search") return json(await searchHub(sql, userId, cleanText(body.q, 80)));
    if (!userId) return json({ error: "برای این کار باید با گوگل وارد شوی." }, 401);
    await ensureProfile(sql, userId);
    if (action === "profile") return json(await saveProfile(sql, userId, body));
    if (action === "post") return json(await createPost(sql, userId, body));
    if (action === "like") return json(await toggleLike(sql, userId, cleanText(body.postId, 40)));
    if (action === "comment") return json(await addComment(sql, userId, body));
    if (action === "story") return json(await addStory(sql, userId, body));
    if (action === "storyReply") return json(await storyReply(sql, userId, body));
    if (action === "highlight") return json(await addHighlight(sql, userId, body));
    if (action === "send") return json(await sendMessage(sql, userId, body));
    if (action === "thread") return json(await loadThread(sql, userId, cleanText(body.withId, 80)));
    if (action === "typing") return json(await touchTyping(sql, userId, cleanText(body.withId, 80)));
    if (action === "save") return json(await saveCollection(sql, userId, body));
    if (action === "follow") return json(await toggleFollow(sql, userId, cleanText(body.userId, 80)));
    if (action === "roster") return json(await loadRoster(sql, cleanText(body.userId, 80) || userId));
    if (action === "block") return json(await toggleBlock(sql, userId, cleanText(body.userId, 80)));
    if (action === "report") return json(await fileReport(sql, userId, body));
    if (action === "mentor") return json(await askMentor(sql, userId, cleanText(body.mentorId, 80)));
    if (action === "mentorAnswer") return json(await answerMentor(sql, userId, body));
    if (action === "readNotes") return json(await markNotes(sql, userId));
    if (action === "removePost") return json(await removePost(sql, userId, cleanText(body.postId, 80)));
    if (action === "logout") return json(await logoutToken(sql, request));
    if (action === "reports") return json(await adminReports(sql, userId));
    if (action === "verify") return json(await adminVerify(sql, userId, cleanText(body.userId, 80)));
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
    `select p.id, p.user_id, p.caption, p.image, p.images, p.compare, p.style, p.technique, p.ink, p.needle, p.needle_type, p.machine,
            p.collab, p.practice, p.mentor_id, p.created_at,
            coalesce(pr.name, 'آرتیست') as name, pr.avatar, pr.city, pr.artist_name, pr.verified, pr.note,
            (select count(*)::int from tattoohub_likes l where l.post_id = p.id) as likes,
            exists(select 1 from tattoohub_likes l where l.post_id = p.id and l.user_id = $1) as liked
       from tattoohub_posts p
       left join tattoohub_profiles pr on pr.user_id = p.user_id
      where (p.practice = false or p.user_id = $1 or p.mentor_id = $1)
        and not exists (select 1 from tattoohub_blocks b where (b.blocker_id = $1 and b.blocked_id = p.user_id) or (b.blocker_id = p.user_id and b.blocked_id = $1))
        and ($4::text = 'all' or p.user_id = $1 or exists (select 1 from tattoohub_follows f where f.follower_id = $1 and f.following_id = p.user_id))
      order by p.created_at desc
      limit $2 offset $3`,
    [userId, limit, offset, cleanText(body.mode, 20) === "following" ? "following" : "all"],
  );
  const ids = posts.map((row) => String(row.id));
  const comments = ids.length
    ? await sql.query<Record<string, unknown>>(
        `select c.id, c.post_id, c.body, c.parent_id, c.created_at, coalesce(pr.name, 'آرتیست') as name
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
    `select user_id, name, artist_name, city, country, studio, avatar, cover, bio, styles, role, gear, years, contact, links, note, verified,
            (select count(*)::int from tattoohub_follows f where f.following_id = tattoohub_profiles.user_id) as followers,
            (select count(*)::int from tattoohub_follows f where f.follower_id = tattoohub_profiles.user_id) as following,
            exists(select 1 from tattoohub_follows f where f.follower_id = $1 and f.following_id = tattoohub_profiles.user_id) as followed
       from tattoohub_profiles
      where not exists (select 1 from tattoohub_blocks b where (b.blocker_id = $1 and b.blocked_id = user_id) or (b.blocker_id = user_id and b.blocked_id = $1))
      order by updated_at desc limit 80`,
    [userId],
  );
  const me = userId
    ? (await sql.query<Record<string, unknown>>(
        `select user_id, name, artist_name, city, country, studio, avatar, cover, bio, styles, role, gear, years, contact, links, note, verified,
                (select count(*)::int from tattoohub_follows f where f.following_id = $1) as followers,
                (select count(*)::int from tattoohub_follows f where f.follower_id = $1) as following
           from tattoohub_profiles where user_id = $1`,
        [userId],
      ))[0] || null
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
  const highlights = await sql.query(
    `select id, user_id, title, image, created_at from tattoohub_highlights order by created_at desc limit 80`,
  );
  const notes = userId
    ? await sql.query(
        `select n.id, n.kind, n.actor_id, n.ref_id, n.body, n.read_at, n.created_at, coalesce(pr.name, 'آرتیست') as name
           from tattoohub_notifications n
           left join tattoohub_profiles pr on pr.user_id = n.actor_id
          where n.user_id = $1 order by n.created_at desc limit 40`,
        [userId],
      )
    : [];
  const noteUnread = userId
    ? await sql.query<{ c: number }>(`select count(*)::int as c from tattoohub_notifications where user_id = $1 and read_at is null`, [userId])
    : [];
  const following = userId
    ? await sql.query<{ following_id: string }>(`select following_id from tattoohub_follows where follower_id = $1`, [userId])
    : [];
  const mentors = userId
    ? await sql.query(`select apprentice_id, mentor_id, status from tattoohub_mentors where apprentice_id = $1 or mentor_id = $1`, [userId])
    : [];
  const emailRows = userId ? await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]) : [];
  const mode = cleanText(body.mode, 20);
  const visible = posts.filter((row) =>
    canSeePractice({ userId: String(row.user_id), practice: Boolean(row.practice), mentorId: String(row.mentor_id || "") }, userId),
  );
  const ranked =
    mode === "foryou"
      ? rankForYou(
          visible.map((row) => ({
            id: String(row.id),
            userId: String(row.user_id),
            caption: String(row.caption || ""),
            image: String(row.image || ""),
            createdAt: new Date(String(row.created_at)).getTime() || 0,
            style: String(row.style || ""),
            likes: Number(row.likes || 0),
          })),
          { following: following.map((row) => row.following_id), styles: Array.isArray(me?.styles) ? (me.styles as string[]) : [] },
        ).map((item) => visible.find((row) => String(row.id) === item.id)!)
      : visible;
  const byPost = new Map<string, Record<string, unknown>[]>();
  for (const comment of comments) {
    const key = String(comment.post_id);
    const list = byPost.get(key) || [];
    list.push({ id: comment.id, name: comment.name, text: comment.body, parentId: comment.parent_id || "" });
    byPost.set(key, list);
  }
  return {
    me,
    people,
    stories,
    posts: ranked.map((row) => ({ ...row, comments: byPost.get(String(row.id)) || [] })),
    unread: unreadRows[0]?.c || 0,
    activity: noteUnread[0]?.c || 0,
    notes,
    highlights,
    following: following.map((row) => row.following_id),
    mentors,
    admin: shouldGrantBootstrapAdmin(emailRows[0]?.email),
    recent,
    saved: savedRows[0]?.post_ids || [],
  };
}

async function saveProfile(sql: Sql, userId: string, body: Record<string, unknown>) {
  const name = cleanText(body.name, 80);
  if (name.length < 2) throw new Error("نام را بنویس.");
  const avatar = body.avatar ? cleanImage(body.avatar) : "";
  const cover = body.cover ? cleanImage(body.cover) : "";
  const styles = Array.isArray(body.styles) ? body.styles.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 8) : [];
  const role = ["artist", "apprentice", "mentor", "studio"].includes(String(body.role)) ? String(body.role) : "artist";
  await sql.query(
    `insert into tattoohub_profiles (user_id, name, bio, city, styles, avatar, cover, artist_name, country, studio, contact, links, role, gear, years, note, updated_at)
     values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
     on conflict (user_id) do update set
       name=$2, bio=$3, city=$4, styles=$5::jsonb,
       avatar=case when $6='' then tattoohub_profiles.avatar else $6 end,
       cover=case when $7='' then tattoohub_profiles.cover else $7 end,
       artist_name=$8, country=$9, studio=$10, contact=$11, links=$12, role=$13, gear=$14, years=$15, note=$16, updated_at=now()`,
    [
      userId,
      name,
      cleanText(body.bio, 280),
      cleanText(body.city, 60),
      JSON.stringify(styles),
      avatar,
      cover,
      cleanText(body.artistName, 80),
      cleanText(body.country, 60),
      cleanText(body.studio, 80),
      cleanText(body.contact, 80),
      cleanText(body.links, 180),
      role,
      cleanText(body.gear, 160),
      cleanText(body.years, 20),
      cleanText(body.note, 60),
    ],
  );
  return { ok: true };
}

async function createPost(sql: Sql, userId: string, body: Record<string, unknown>) {
  const caption = cleanText(body.caption, 1500);
  const image = body.image ? cleanImage(body.image) : "";
  const images = Array.isArray(body.images) ? body.images.map((item) => cleanImage(item)).filter(Boolean).slice(0, 5) : [];
  const compareIn = body.compare && typeof body.compare === "object" ? (body.compare as Record<string, unknown>) : null;
  const compare = compareIn
    ? {
        sketch: compareIn.sketch ? cleanImage(compareIn.sketch) : "",
        fresh: compareIn.fresh ? cleanImage(compareIn.fresh) : "",
        healed: compareIn.healed ? cleanImage(compareIn.healed) : "",
      }
    : null;
  if (!image && !images.length && !compare) throw new Error("حداقل یک عکس از گالری انتخاب کن.");
  if (compare && !compare.sketch && !compare.fresh && !compare.healed) throw new Error("حداقل یک عکس از گالری انتخاب کن.");
  const id = crypto.randomUUID();
  const practice = body.practice === true;
  await sql.query(
    `insert into tattoohub_posts (id, user_id, caption, image, images, compare, style, technique, ink, needle, needle_type, machine, collab, practice, mentor_id)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      userId,
      caption,
      image || images[0] || "",
      JSON.stringify(images.length ? images : image ? [image] : []),
      compare ? JSON.stringify(compare) : null,
      cleanText(body.style, 40),
      cleanText(body.technique, 40),
      cleanText(body.ink, 40),
      cleanText(body.needle, 40),
      cleanText(body.type, 40),
      cleanText(body.machine, 40),
      cleanText(body.collab, 80),
      practice,
      cleanText(body.mentorId, 80),
    ],
  );
  return { id };
}

async function toggleLike(sql: Sql, userId: string, postId: string) {
  if (!postId) throw new Error("پست پیدا نشد.");
  const existing = await sql.query("select 1 from tattoohub_likes where post_id = $1 and user_id = $2", [postId, userId]);
  if (existing[0]) await sql.query("delete from tattoohub_likes where post_id = $1 and user_id = $2", [postId, userId]);
  else {
    await sql.query("insert into tattoohub_likes (post_id, user_id) values ($1, $2)", [postId, userId]);
    const owner = await sql.query<{ user_id: string }>("select user_id from tattoohub_posts where id = $1", [postId]);
    await notify(sql, owner[0]?.user_id || "", "like", userId, postId, "پستت را پسندید");
  }
  return { ok: true };
}

async function addComment(sql: Sql, userId: string, body: Record<string, unknown>) {
  const text = cleanText(body.text, 500);
  const postId = cleanText(body.postId, 40);
  if (text.length < 1 || !postId) throw new Error("نظر را بنویس.");
  const parent = cleanText(body.parentId, 80);
  await sql.query(
    "insert into tattoohub_comments (id, post_id, user_id, body, parent_id) values ($1, $2, $3, $4, $5)",
    [crypto.randomUUID(), postId, userId, text, parent],
  );
  const owner = await sql.query<{ user_id: string }>("select user_id from tattoohub_posts where id = $1", [postId]);
  await notify(sql, owner[0]?.user_id || "", "comment", userId, postId, text);
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
  const id = /^[0-9a-f-]{36}$/i.test(String(body.clientId || "")) ? String(body.clientId) : crypto.randomUUID();
  const storyId = cleanText(body.storyId, 80);
  await sql.query(
    `insert into tattoohub_messages (id, from_id, to_id, body, image, audio, story_id) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do nothing`,
    [id, userId, to, text, image, audio, storyId],
  );
  await notify(sql, to, "message", userId, to, text || (image ? "عکس" : "ویس"));
  return loadThread(sql, userId, to);
}

async function notify(sql: Sql, userId: string, kind: string, actorId: string, refId: string, body: string) {
  if (!userId || userId === actorId) return;
  await sql.query(
    "insert into tattoohub_notifications (id, user_id, kind, actor_id, ref_id, body) values ($1, $2, $3, $4, $5, $6)",
    [crypto.randomUUID(), userId, kind, actorId, refId, cleanText(body, 180)],
  );
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
    `select id, from_id, to_id, body, image, audio, story_id, created_at, read_at from tattoohub_messages
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
  const story = await sql.query<{ user_id: string }>("select user_id from tattoohub_stories where id = $1", [storyId]);
  const owner = story[0]?.user_id || "";
  await sql.query(
    "insert into tattoohub_story_replies (id, story_id, user_id, kind, body) values ($1, $2, $3, $4, $5)",
    [crypto.randomUUID(), storyId, userId, kind, text],
  );
  if (owner && owner !== userId && kind === "reply") {
    await sendMessage(sql, userId, { to: owner, text: `پاسخ استوری: ${text}`, storyId });
  } else if (owner) {
    await notify(sql, owner, "story", userId, storyId, kind === "react" ? "به استوری‌ات واکنش داد" : text);
  }
  return { ok: true, withId: owner };
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

async function searchHub(sql: Sql, userId: string, q: string) {
  if (q.length < 1) return { people: [], posts: [] };
  const like = `%${q}%`;
  const people = await sql.query(
    `select user_id, name, artist_name, city, country, avatar, role, styles from tattoohub_profiles
      where name ilike $1 or artist_name ilike $1 or city ilike $1 or studio ilike $1 or styles::text ilike $1
      limit 20`,
    [like],
  );
  const posts = await sql.query(
    `select id, user_id, caption, image, style, ink from tattoohub_posts
      where practice = false and (caption ilike $1 or style ilike $1 or ink ilike $1 or needle_type ilike $1)
      order by created_at desc limit 24`,
    [like],
  );
  return { people, posts, q };
}

async function toggleFollow(sql: Sql, userId: string, other: string) {
  if (!other || other === userId) throw new Error("این حساب را نمی‌شود دنبال کرد.");
  const existing = await sql.query("select 1 from tattoohub_follows where follower_id = $1 and following_id = $2", [userId, other]);
  if (existing[0]) {
    await sql.query("delete from tattoohub_follows where follower_id = $1 and following_id = $2", [userId, other]);
    return { followed: false };
  }
  await sql.query("insert into tattoohub_follows (follower_id, following_id) values ($1, $2)", [userId, other]);
  await notify(sql, other, "follow", userId, other, "تو را دنبال کرد");
  return { followed: true };
}

async function toggleBlock(sql: Sql, userId: string, other: string) {
  if (!other || other === userId) throw new Error("این کار ممکن نیست.");
  const existing = await sql.query("select 1 from tattoohub_blocks where blocker_id = $1 and blocked_id = $2", [userId, other]);
  if (existing[0]) await sql.query("delete from tattoohub_blocks where blocker_id = $1 and blocked_id = $2", [userId, other]);
  else {
    await sql.query("insert into tattoohub_blocks (blocker_id, blocked_id) values ($1, $2)", [userId, other]);
    await sql.query("delete from tattoohub_follows where (follower_id = $1 and following_id = $2) or (follower_id = $2 and following_id = $1)", [userId, other]);
  }
  return { blocked: !existing[0] };
}

async function fileReport(sql: Sql, userId: string, body: Record<string, unknown>) {
  const reason = cleanText(body.reason, 280);
  const targetId = cleanText(body.targetId, 80);
  const targetType = cleanText(body.targetType, 20) || "post";
  if (reason.length < 3 || !targetId) throw new Error("دلیل گزارش را بنویس.");
  await sql.query(
    "insert into tattoohub_reports (id, reporter_id, target_type, target_id, reason) values ($1, $2, $3, $4, $5)",
    [crypto.randomUUID(), userId, targetType, targetId, reason],
  );
  return { ok: true };
}

async function addHighlight(sql: Sql, userId: string, body: Record<string, unknown>) {
  const title = cleanText(body.title, 40);
  const image = cleanImage(body.image);
  if (title.length < 1 || !image) throw new Error("برای هایلایت عنوان و عکس لازم است.");
  await sql.query("insert into tattoohub_highlights (id, user_id, title, image) values ($1, $2, $3, $4)", [crypto.randomUUID(), userId, title, image]);
  return { ok: true };
}

async function askMentor(sql: Sql, userId: string, mentorId: string) {
  if (!mentorId || mentorId === userId) throw new Error("استاد را انتخاب کن.");
  await sql.query(
    `insert into tattoohub_mentors (apprentice_id, mentor_id, status) values ($1, $2, 'pending')
     on conflict (apprentice_id, mentor_id) do update set status = 'pending'`,
    [userId, mentorId],
  );
  await notify(sql, mentorId, "mentor", userId, userId, "درخواست کارآموزی داد");
  return { ok: true };
}

async function answerMentor(sql: Sql, userId: string, body: Record<string, unknown>) {
  const apprenticeId = cleanText(body.apprenticeId, 80);
  const status = body.accept === true ? "active" : "rejected";
  await sql.query(
    "update tattoohub_mentors set status = $3 where mentor_id = $1 and apprentice_id = $2",
    [userId, apprenticeId, status],
  );
  await notify(sql, apprenticeId, "mentor", userId, userId, status === "active" ? "درخواست کارآموزی را پذیرفت" : "درخواست را رد کرد");
  return { ok: true };
}

async function markNotes(sql: Sql, userId: string) {
  await sql.query("update tattoohub_notifications set read_at = now() where user_id = $1 and read_at is null", [userId]);
  return { ok: true };
}

async function loadRoster(sql: Sql, userId: string) {
  const followers = await sql.query(
    `select p.user_id, p.name, p.avatar from tattoohub_follows f
      join tattoohub_profiles p on p.user_id = f.follower_id where f.following_id = $1`,
    [userId],
  );
  const following = await sql.query(
    `select p.user_id, p.name, p.avatar from tattoohub_follows f
      join tattoohub_profiles p on p.user_id = f.following_id where f.follower_id = $1`,
    [userId],
  );
  return { followers, following };
}

async function removePost(sql: Sql, userId: string, postId: string) {
  if (!postId) throw new Error("پست پیدا نشد.");
  await sql.query("delete from tattoohub_posts where id = $1 and user_id = $2", [postId, userId]);
  return { ok: true };
}

async function logoutToken(sql: Sql, request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token.startsWith("th_")) await sql.query("delete from tattoohub_tokens where token = $1", [token]);
  return { ok: true };
}

async function requireAdmin(sql: Sql, userId: string) {
  const rows = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  if (!shouldGrantBootstrapAdmin(rows[0]?.email)) throw new Error("دسترسی مدیریت نداری.");
}

async function adminReports(sql: Sql, userId: string) {
  await requireAdmin(sql, userId);
  const reports = await sql.query(
    `select r.id, r.target_type, r.target_id, r.reason, r.created_at, coalesce(pr.name, '') as name
       from tattoohub_reports r left join tattoohub_profiles pr on pr.user_id = r.reporter_id
      order by r.created_at desc limit 50`,
  );
  return { reports };
}

async function adminVerify(sql: Sql, userId: string, other: string) {
  await requireAdmin(sql, userId);
  if (!other) throw new Error("حساب را انتخاب کن.");
  await sql.query("update tattoohub_profiles set verified = not verified where user_id = $1", [other]);
  return { ok: true };
}

