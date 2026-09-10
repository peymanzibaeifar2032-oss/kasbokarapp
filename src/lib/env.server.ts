export function env(key: string): string | undefined {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  try {
    const netlify = (
      globalThis as {
        Netlify?: { env?: { get?: (k: string) => string | undefined } };
      }
    ).Netlify;
    const fromNetlify = netlify?.env?.get?.(key)?.trim();
    return fromNetlify || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}

/** Independent production (own domain + own Postgres). Preview stays unchanged. */
export function isStandalone(): boolean {
  const v = env("STANDALONE");
  return v === "true" || v === "1";
}

/** Postgres URL for production: explicit DATABASE_URL or Netlify DB. */
export function postgresUrl(): string | undefined {
  return (
    env("DATABASE_URL") ||
    env("NETLIFY_DATABASE_URL") ||
    env("NETLIFY_DATABASE_URL_UNPOOLED") ||
    env("NETLIFY_DB_URL")
  );
}

function originOf(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function withWwwTwin(origin: string): string[] {
  try {
    const u = new URL(origin);
    const host = u.hostname;
    const twin = host.startsWith("www.") ? host.slice(4) : host.includes(".") ? `www.${host}` : null;
    return twin ? [origin, `${u.protocol}//${twin}`] : [origin];
  } catch {
    return [origin];
  }
}

/** Public origins for CSRF / Better Auth (apex + www). */
export function siteOrigins(): string[] {
  const listed = [env("BETTER_AUTH_URL"), env("SITE_URL"), env("APP_URL")].filter(Boolean) as string[];
  const extra = (env("TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = new Set<string>();
  for (const raw of [...listed, ...extra]) {
    const origin = originOf(raw);
    if (!origin) continue;
    for (const o of withWwwTwin(origin)) out.add(o);
  }
  return [...out];
}
