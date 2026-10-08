import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tattoo-apk")({
  server: {
    handlers: {
      GET: async () => new Response("اپ اندروید حذف شده است.", { status: 410, headers: { "Cache-Control": "no-store" } }),
    },
  },
});
