import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tattoo-prep")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/admin", search: { tab: "prep" } });
  },
  component: function TattooPrepRedirect() {
    return null;
  },
});
