import { createFileRoute } from "@tanstack/react-router";
import { TattooPrepDesk } from "@/components/tattoo-prep/desk";

export const Route = createFileRoute("/tattoo-prep")({
  component: TattooPrepPage,
  head: () => ({
    meta: [
      { title: "ابزارهای آماده‌سازی طرح تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "فرم ایده، استخراج طرح، طراحی، استنسیل، پرینت اندازه واقعی و آماده‌سازی عکس تاتو.",
      },
    ],
  }),
});

function TattooPrepPage() {
  return <TattooPrepDesk />;
}
