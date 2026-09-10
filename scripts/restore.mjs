#!/usr/bin/env node
/**
 * Restore JSON backups created by scripts/backup.mjs.
 * Default is insert-or-skip (ON CONFLICT DO NOTHING). Pass --replace to upsert.
 * Requires DATABASE_URL and --yes.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[restore] DATABASE_URL is required.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error("[restore] pass --yes to confirm.");
  process.exit(1);
}

const replace = process.argv.includes("--replace");
const args = process.argv.slice(2).filter((a) => a !== "--yes" && a !== "--replace");
const dir = args[0] || join(process.cwd(), "backups");

const tables = [
  { file: "user", sql: '"user"', pk: "id" },
  { file: "session", sql: '"session"', pk: "id" },
  { file: "account", sql: '"account"', pk: "id" },
  { file: "verification", sql: '"verification"', pk: "id" },
  { file: "profiles", sql: "profiles", pk: "user_id" },
  { file: "categories", sql: "categories", pk: "id" },
  { file: "businesses", sql: "businesses", pk: "id" },
  { file: "bookings", sql: "bookings", pk: "id" },
  { file: "reviews", sql: "reviews", pk: "id" },
  { file: "favorites", sql: "favorites", pk: null },
  { file: "bug_reports", sql: "bug_reports", pk: "id" },
];

function ident(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`bad column ${name}`);
  return `"${name}"`;
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  const files = new Set(await readdir(dir));
  await client.query("BEGIN");
  for (const table of tables) {
    const name = `${table.file}.json`;
    if (!files.has(name)) continue;
    const rows = JSON.parse(await readFile(join(dir, name), "utf8"));
    if (!Array.isArray(rows) || rows.length === 0) continue;
    let n = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const colSql = cols.map(ident).join(", ");
      const params = cols.map((_, i) => `$${i + 1}`);
      const values = cols.map((c) => row[c]);
      let sql = `insert into ${table.sql} (${colSql}) values (${params.join(",")})`;
      if (replace && table.pk && cols.includes(table.pk)) {
        const rest = cols.filter((c) => c !== table.pk);
        if (rest.length) {
          sql += ` on conflict (${ident(table.pk)}) do update set ${rest.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(", ")}`;
        } else {
          sql += ` on conflict (${ident(table.pk)}) do nothing`;
        }
      } else {
        sql += " on conflict do nothing";
      }
      await client.query(sql, values);
      n += 1;
    }
    console.log(`[restore] ${table.file}: ${n} rows`);
  }
  await client.query("COMMIT");
  console.log("[restore] done");
} catch (err) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* ignore */
  }
  throw err;
} finally {
  client.release();
  await pool.end();
}
