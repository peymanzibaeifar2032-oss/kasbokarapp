import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mehr-loan-leads")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ error: "بخش وام مهر حذف شده است." }, { status: 410 }),
      POST: async () =>
        Response.json({ error: "بخش وام مهر حذف شده است." }, { status: 410 }),
    },
  },
});
