import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/admin" });
  },
  component: function AdminRedirect() {
    return null;
  },
});
