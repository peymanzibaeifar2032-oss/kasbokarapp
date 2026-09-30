import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/admin" });
  },
  component: function DashboardRedirect() {
    return null;
  },
});
