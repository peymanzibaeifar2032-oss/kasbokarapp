/** Shared Postgres URL for migrate / backup / restore. Never log the value. */
export function postgresUrl() {
  const keys = [
    "DATABASE_URL",
    "NETLIFY_DATABASE_URL",
    "NETLIFY_DATABASE_URL_UNPOOLED",
    "NETLIFY_DB_URL",
  ];
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}
