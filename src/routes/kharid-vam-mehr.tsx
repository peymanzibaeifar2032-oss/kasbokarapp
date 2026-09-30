import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/kharid-vam-mehr")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
  component: function MehrRedirect() {
    return null;
  },
});
