import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

const PAGE_TITLE = "خرید وام و امتیاز وام مهر ایران | عرفان حق‌شنو";
const PAGE_DESCRIPTION = "خریدار مستقیم امتیاز وام بانک قرض‌الحسنه مهر ایران؛ ثبت رایگان درخواست فروش، بررسی سریع و تماس مستقیم عرفان حق‌شنو در اسلامشهر.";

export const Route = createFileRoute("/kharid-vam-mehr")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://kasbokarapp.com/kharid-vam-mehr" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://kasbokarapp.com/kharid-vam-mehr" }],
  }),
  component: MehrLoanPage,
});

function MehrLoanPage() {
  const location = useLocation();

  if (location.pathname === "/kharid-vam-mehr/panel") return <Outlet />;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f7f8f5] px-4" dir="rtl">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold text-[#087a55]">آرشیو</p>
        <h1 className="mt-2 text-2xl font-black">وام بانک مهر کنار گذاشته شد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          درخواست جدید گرفته نمی‌شود. اطلاعات قبلی پاک نشده و رزرو تاتو جدا از این بخش است.
        </p>
        <a href="/studio" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#087a55] px-5 text-sm font-bold text-white">
          استودیو تاتو
        </a>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#334d47]"><span className="mb-2 block">{label}</span>{children}</label>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#d2e2d7] bg-white/80 p-4 [&_svg]:size-5 [&_svg]:text-[#087a55]"><div className="flex items-center gap-2 font-bold">{icon}{title}</div><p className="mt-1 text-xs text-[#667b74]">{text}</p></div>;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return <details className="group py-5"><summary className="flex list-none items-center justify-between gap-4 font-bold"><span>{q}</span><span className="text-xl text-[#087a55] group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-[#5b6e68]">{children}</p></details>;
}
