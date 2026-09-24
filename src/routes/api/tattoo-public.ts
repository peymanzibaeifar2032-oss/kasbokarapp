import { createFileRoute } from "@tanstack/react-router";
import { handleTattooPublic } from "@/lib/server/tattoo-public-handlers";

export const Route = createFileRoute("/api/tattoo-public")({
  server: {
    handlers: {
      POST: ({ request }) => handleTattooPublic(request),
    },
  },
});
