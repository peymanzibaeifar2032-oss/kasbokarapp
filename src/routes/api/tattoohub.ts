import { createFileRoute } from "@tanstack/react-router";
import { handleTattooHub } from "@/lib/server/tattoohub-api";

export const Route = createFileRoute("/api/tattoohub")({
  server: {
    handlers: {
      POST: ({ request }) => handleTattooHub(request),
      OPTIONS: ({ request }) => handleTattooHub(request),
    },
  },
});
