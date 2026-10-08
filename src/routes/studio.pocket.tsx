import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/pocket")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/request" });
  },
  component: function PocketRedirect() {
    return null;
  },
});
