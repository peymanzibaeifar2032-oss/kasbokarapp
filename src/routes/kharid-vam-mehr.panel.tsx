import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/kharid-vam-mehr/panel")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/admin" });
  },
  component: function MehrPanelRedirect() {
    return null;
  },
});
