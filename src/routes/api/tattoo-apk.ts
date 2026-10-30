import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

const FILE = "tattoo-class-1.3.0.apk";

async function apkBytes() {
  const paths = [
    join(process.cwd(), ".output", "public", FILE),
    join(process.cwd(), "public", FILE),
    join(process.cwd(), ".output", "public", "tattoo-class-1.2.0.apk"),
    join(process.cwd(), "public", "tattoo-class-1.2.0.apk"),
  ];
  for (const path of paths) {
    try {
      return await readFile(path);
    } catch {
      // Try the next location. The install file is copied into the built site.
    }
  }
  return null;
}

export const Route = createFileRoute("/api/tattoo-apk")({
  server: {
    handlers: {
      GET: async () => {
        const bytes = await apkBytes();
        if (!bytes) return new Response("فایل نصب هنوز روی سرور نیست.", { status: 404, headers: { "Cache-Control": "no-store" } });
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
