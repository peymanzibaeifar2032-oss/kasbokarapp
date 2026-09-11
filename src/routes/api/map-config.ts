import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env.server";
import { resolveMapTiles } from "@/lib/map/tiles";

export const Route = createFileRoute("/api/map-config")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = resolveMapTiles((key) => env(key));
        return Response.json(cfg, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
