import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { recordAppDownloadEvent } from "@/lib/server/app-analytics";

const FILE = "taghvim-nobat.apk";

async function apkBytes() {
  const paths = [
    join(process.cwd(), ".output", "public", FILE),
    join(process.cwd(), "public", FILE),
    join(process.cwd(), "dist", "taghvim-nobat-TEST-debug.apk"),
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
        const url = new URL(request.url);
        const installId = url.searchParams.get("installId");
        const accountEmail = url.searchParams.get("email");
        try {
          await recordAppDownloadEvent({
            fileName: FILE,
            installId: installId && installId.length >= 8 ? installId : null,
            accountEmail: accountEmail || null,
          });
        } catch {
          // Download still proceeds even if analytics insert fails.
        }
        const bytes = await apkBytes();
        if (!bytes) {
          return new Response("فایل نصب هنوز روی سرور نیست.", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }
        return new Response(bytes, {
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
