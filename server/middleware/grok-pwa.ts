/**
 * Production-inert for Grok App Builder chrome so Nitro `serverDir: "./server"`
 * still loads `security-headers.ts`. Preview PWA/install stays in
 * `scripts/grok-pwa-plugin.mjs`. On Kasbokar Production, leftover `/__grok/*`
 * requests (old PWA cache) must 404 — never 500 and never serve Grok assets.
 */
function isProductionIsolated(): boolean {
  const stand = process.env.STANDALONE?.trim();
  if (stand === "true" || stand === "1") return true;
  return process.env.NODE_ENV === "production";
}

function requestPath(event: unknown): string {
  if (!event || typeof event !== "object") return "";
  const rec = event as { url?: unknown; path?: unknown; req?: { url?: unknown } };
  if (rec.url instanceof URL) return rec.url.pathname;
  if (typeof rec.url === "string") {
    try {
      return new URL(rec.url, "http://localhost").pathname;
    } catch {
      return rec.url.split("?")[0] ?? "";
    }
  }
  if (typeof rec.path === "string") return rec.path.split("?")[0] ?? "";
  if (typeof rec.req?.url === "string") {
    try {
      return new URL(rec.req.url, "http://localhost").pathname;
    } catch {
      return rec.req.url.split("?")[0] ?? "";
    }
  }
  return "";
}

export default async function grokPwaMiddleware(
  event: unknown,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = requestPath(event);
  if (isProductionIsolated() && (path === "/__grok" || path.startsWith("/__grok/"))) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return next();
}
