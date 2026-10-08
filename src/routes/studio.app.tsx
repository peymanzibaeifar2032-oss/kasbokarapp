import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/app")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/request" });
  },
  component: function AppRedirect() {
    return null;
  },
});
