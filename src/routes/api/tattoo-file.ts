import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/tattoo-file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") || "";
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("پیدا نشد", { status: 404 });
        const sql = await getSql();
        const rows = await sql.query<{ data: string }>(`select data from tattoo_request_files where id=$1`, [id]);
        const data = rows[0]?.data || "";
        const match = data.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i);
        if (!match) return new Response("پیدا نشد", { status: 404 });
        const bytes = Buffer.from(match[2], "base64");
        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": match[1],
            "Cache-Control": "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
