import { createFileRoute } from "@tanstack/react-router";

const CURRENT = "https://kasbokarapp.netlify.app/downloads/tattoo-class-1.6.0.apk";

export const Route = createFileRoute("/api/tattoo-apk")({
  server: {
    handlers: {
      GET: async () => Response.redirect(CURRENT, 302),
    },
  },
});
