/**
 * Production security headers. Frame-blocking only in STANDALONE so the Grok
 * live-preview iframe keeps working.
 */
interface HeaderEvent {
  req: { method?: string; headers: Headers };
}

function isStandalone(): boolean {
  const v = process.env.STANDALONE?.trim();
  return v === "true" || v === "1";
}

export default async function securityHeadersMiddleware(
  _event: HeaderEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Permissions-Policy", "camera=(), microphone=(), payment=()");
  if (isStandalone()) {
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
