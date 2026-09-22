import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

const NAMES = ["rezerv-vaght-tatoo-v3.apk", "rezerv-vaght-tatoo.apk"];

function apkBuffer() {
  const roots = [process.cwd(), join(process.cwd(), ".output/public"), join(process.cwd(), "public"), "/app", "/app/.output/public", "/app/public"];
  for (const root of roots) {
    for (const name of NAMES) {
      const path = join(root, "apps", name);
      if (existsSync(path)) return readFileSync(path);
      const alt = join(root, name);
      if (existsSync(alt)) return readFileSync(alt);
    }
  }
  return null;
}

export const Route = createFileRoute("/api/tattoo-apk")({
  server: {
    handlers: {
      GET: async () => {
        const body = apkBuffer();
        if (!body) {
          return new Response("apk missing", { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": 'attachment; filename="rezerv-vaght-tatoo.apk"',
            "Cache-Control": "no-store",
            "Content-Length": String(body.byteLength),
          },
        });
      },
    },
  },
});
