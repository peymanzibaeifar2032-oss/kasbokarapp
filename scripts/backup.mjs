#!/usr/bin/env node
/**
 * Logical backup of app + auth tables to JSON. Requires DATABASE_URL.
 * Password column in "account" is a hash, not plaintext — still treat backups as secret.
 * Usage: node scripts/backup.mjs [out-dir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import { postgresUrl } from "./db-url.mjs";

const databaseUrl = postgresUrl();
if (!databaseUrl) {
  console.error("[backup] DATABASE_URL is required.");
  process.exit(1);
}

/** Identifiers only — never interpolate user input here. */
const tables = [
  { file: "user", sql: '"user"' },
  { file: "session", sql: '"session"' },
  { file: "account", sql: '"account"' },
  { file: "verification", sql: '"verification"' },
  { file: "profiles", sql: "profiles" },
  { file: "categories", sql: "categories" },
  { file: "businesses", sql: "businesses" },
  { file: "bookings", sql: "bookings" },
  { file: "reviews", sql: "reviews" },
  { file: "favorites", sql: "favorites" },
  { file: "bug_reports", sql: "bug_reports" },
];

const outDir = process.argv[2] || join(process.cwd(), "backups", new Date().toISOString().slice(0, 10));

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
try {
  await mkdir(outDir, { recursive: true });
  const manifest = { at: new Date().toISOString(), tables: [] };
  for (const table of tables) {
    const res = await pool.query(`select * from ${table.sql}`);
    const file = join(outDir, `${table.file}.json`);
    await writeFile(file, JSON.stringify(res.rows, null, 2));
    manifest.tables.push({ name: table.file, rows: res.rows.length });
    console.log(`[backup] ${table.file}: ${res.rows.length} rows`);
  }
  await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`[backup] done → ${outDir}`);
} finally {
  await pool.end();
}
