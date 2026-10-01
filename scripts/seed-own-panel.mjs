import { randomUUID } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

const email = "hanazibaeifar88h@gmail.com";
const name = "هانا زیبائی‌فر";
const password = "Hana#Studio88";
const ownerEmails = ["peyman.zibaeifar2032@gmail.com", "peymanzibaeifar2032@gmail.com"];

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("OWN_PANEL skip no-database");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url });
try {
  const owner = await pool.query(`select id from "user" where lower(email) = any($1::text[]) limit 1`, [ownerEmails]);
  const ownerId = owner.rows[0]?.id;
  if (ownerId) {
    await pool.query(
      `insert into studio_artists (id, owner_user_id, email, name, deal, percent, amount_toman, active)
       select 'artist-hana-zibaeifar', $1, $2, $3, 'own', 0, 0, true
        where not exists (select 1 from studio_artists where lower(email) = $2)`,
      [ownerId, email, name],
    );
    await pool.query(`update studio_artists set name = $2 where lower(email) = $1`, [email, name]);
  }

  const existing = await pool.query(`select id from "user" where lower(email) = $1 limit 1`, [email]);
  let userId = existing.rows[0]?.id;
  const now = new Date();
  if (!userId) {
    userId = randomUUID();
    await pool.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ($1,$2,$3,true,$4,$4)`,
      [userId, name, email, now],
    );
  } else {
    await pool.query(`update "user" set name = $2, "updatedAt" = $3 where id = $1`, [userId, name, now]);
  }
  const credential = await pool.query(
    `select id from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [userId],
  );
  if (!credential.rows[0]) {
    const hash = await hashPassword(password);
    await pool.query(
      `insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       values ($1,$2,'credential',$3,$4,$5,$5)`,
      [randomUUID(), userId, userId, hash, now],
    );
  }
  await pool.query(
    `insert into profiles (user_id, display_name, is_admin)
     values ($1,$2,false)
     on conflict (user_id) do update set is_admin = false`,
    [userId, name],
  );
  console.log("OWN_PANEL ready");
} catch (error) {
  console.log(`OWN_PANEL warn ${error instanceof Error ? error.message : "failed"}`);
  process.exit(0);
} finally {
  await pool.end();
}
