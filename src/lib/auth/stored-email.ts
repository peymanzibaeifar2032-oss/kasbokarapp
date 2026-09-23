import { getSql } from "@/lib/db";

/** Match the saved account even if Gmail dots or +tags differ. */
export async function findStoredEmail(raw: string): Promise<string | null> {
  const email = raw.trim().toLowerCase();
  if (!email.includes("@")) return null;
  const sql = await getSql();
  const rows = await sql.query<{ email: string }>(
    `select email from "user"
     where lower(email) = $1
        or (
          split_part(lower(email), '@', 2) in ('gmail.com', 'googlemail.com')
          and split_part($1, '@', 2) in ('gmail.com', 'googlemail.com')
          and replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '')
            = replace(split_part(split_part($1, '@', 1), '+', 1), '.', '')
        )
     limit 1`,
    [email],
  );
  return rows[0]?.email ?? null;
}