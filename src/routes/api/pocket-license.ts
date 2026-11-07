import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { logError } from "@/lib/log";

// Public, cookie-less license endpoint for the Pocket app (activation code / signed-token refresh).
// Never logs codes, tokens or device ids. Rate limited per client IP.
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

async function handle(request: Request) {
  const lic = await import("@/lib/server/pocket-license");
  const ip = clientKey(request);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const op = typeof body?.op === "string" ? body.op : "";
  if (op === "activate" ? !allowRate(`lic-act:${ip}`, 10, 10 * 60_000) : !allowRate(`lic-ref:${ip}`, 60, 10 * 60_000)) {
    return json({ error: "تلاش زیاد بود. چند دقیقه بعد دوباره امتحان کنید.", code: "rate_limited" }, 429);
  }
  try {
    const sql = await getSql();
    if (op === "activate") return json(await lic.activateWithCode(sql, { code: body?.code, device: body?.device, label: body?.label }));
    if (op === "refresh") return json(await lic.refreshLicense(sql, { token: body?.token, device: body?.device }));
    return json({ error: "درخواست نامعتبر است.", code: "bad_request" }, 400);
  } catch (err) {
    if (err instanceof lic.LicenseError) {
      const status = err.code === "unavailable" ? 503 : err.code === "bad_request" ? 400 : 403;
      return json({ error: err.message, code: err.code }, status);
    }
    logError("api.pocket-license", err, { op });
    return json({ error: "سرور مجوز در دسترس نیست.", code: "unavailable" }, 503);
  }
}

async function keys() {
  try {
    const lic = await import("@/lib/server/pocket-license");
    return json({ iss: lic.LICENSE_ISS, aud: lic.LICENSE_AUD, keys: await lic.publicKeys(await getSql()) });
  } catch {
    return json({ error: "سرور مجوز پیکربندی نشده است.", code: "unavailable" }, 503);
  }
}

export const Route = createFileRoute("/api/pocket-license")({
  server: { handlers: { POST: ({ request }) => handle(request), GET: () => keys() } },
});
