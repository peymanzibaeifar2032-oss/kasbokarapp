import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { recordAppDownloadEvent } from "@/lib/server/app-analytics";
import { allowRate, clientKey } from "@/lib/server/rate-limit";

const FILE = "taghvim-nobat.apk";

async function apkBytes() {
  const paths = [
    join(process.cwd(), ".output", "public", FILE),
    join(process.cwd(), "public", FILE),
  ];
  for (const path of paths) {
    try {
      return await readFile(path);
    } catch {
      /* next */
    }
  }
  return null;
}

export const Route = createFileRoute("/api/booking-apk")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const bytes = await apkBytes();
        if (!bytes) {
          return new Response("فایل نصب هنوز روی سرور نیست.", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }
        // Count only real served bytes, at most once per IP per hour (retries/range loops don't inflate).
        if (allowRate(`apk-dl:${clientKey(request)}`, 1, 60 * 60 * 1000)) {
          try {
            await recordAppDownloadEvent({ fileName: FILE });
          } catch {
            // Download still proceeds even if analytics insert fails.
          }
        }
        return new Response(new Uint8Array(bytes), {
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${FILE}"`,
            "Content-Length": String(bytes.length),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
