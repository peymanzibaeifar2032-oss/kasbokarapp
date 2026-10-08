import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pocket-request")({
  server: {
    handlers: {
      POST: async () => Response.json({ error: "اپ آفلاین حذف شده است. درخواست را از سایت بفرست." }, { status: 410 }),
    },
  },
});
