import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
  component: function BusinessRedirect() {
    return null;
  },
});
