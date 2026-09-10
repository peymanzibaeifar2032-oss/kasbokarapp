#!/usr/bin/env node
/**
 * Logical backup of app tables to JSON (no secrets). Requires DATABASE_URL.
 * Usage: node scripts/backup.mjs [out-dir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[backup] DATABASE_URL is required.");
  process.exit(1);
}

const tables = [
  "profiles",
  "categories",
  "businesses",
  "bookings",
  "reviews",
  "favorites",
  "bug_reports",
];

const outDir = process.argv[2] || join(process.cwd(), "backups", new Date().toISOString().slice(0, 10));

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
try {
  await mkdir(outDir, { recursive: true });
  for (const table of tables) {
    const res = await pool.query(`select * from ${table}`);
    const file = join(outDir, `${table}.json`);
    await writeFile(file, JSON.stringify(res.rows, null, 2));
    console.log(`[backup] ${table}: ${res.rows.length} rows → ${file}`);
  }
  console.log(`[backup] done → ${outDir}`);
} finally {
  await pool.end();
}
