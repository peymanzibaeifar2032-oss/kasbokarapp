import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { allowRate, clientKey } from "@/lib/server/rate-limit";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: async ({ request }) => {
        const path = new URL(request.url).pathname;
        const tight = /sign-in|sign-up|forget|reset|request-password/i.test(path);
        const max = tight ? 8 : 40;
        if (!allowRate(`auth:${clientKey(request)}:${tight ? "auth" : "other"}`, max, 60_000)) {
          return Response.json({ message: "تعداد تلاش زیاد است. کمی بعد دوباره بزنید." }, { status: 429 });
        }
        return auth.handler(request);
      },
    },
  },
});
