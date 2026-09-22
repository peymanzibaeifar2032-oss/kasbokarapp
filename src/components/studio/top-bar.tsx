import { Link } from "@tanstack/react-router";
import { Bell, ChevronLeft } from "lucide-react";
import { StudioNoticeBanner, useStudioNotices } from "@/components/studio/notice-watcher";

export function StudioTopBar({ compact }: { compact?: boolean }) {
  const { unread, banner, dismiss } = useStudioNotices();
  return (
    <>
      {banner ? <StudioNoticeBanner item={banner} onDismiss={dismiss} /> : null}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0c]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link to="/studio" className="min-w-0 flex-1 leading-tight">
            <strong className="block truncate text-sm tracking-wide">پیمان زیبائی‌فر</strong>
            {compact ? null : (
              <span className="hidden text-[11px] text-white/45 sm:block">TATTOO ARTIST · KERMANSHAH</span>
            )}
          </Link>
          <Link
            to="/studio/status"
            className="relative inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-[#b7955b]/45 px-3 text-sm text-[#e5d2ae]"
          >
            <Bell className="size-4" />
            وضعیت
            {unread > 0 ? (
              <span className="absolute -left-1 -top-1 min-w-4 rounded-full bg-[#b7955b] px-1 text-center text-[10px] font-bold text-black">
                {unread > 9 ? "۹+" : new Intl.NumberFormat("fa-IR").format(unread)}
              </span>
            ) : null}
          </Link>
          <Link
            to="/studio/admin"
            className="inline-flex h-10 shrink-0 items-center rounded-full border border-white/15 px-3 text-sm text-white/70"
          >
            پنل ادمین
          </Link>
          <Link
            to="/studio/request"
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#b7955b] px-3 text-sm font-semibold text-black sm:px-4"
          >
            درخواست
            <ChevronLeft className="size-4" />
          </Link>
        </div>
      </header>
    </>
  );
}
