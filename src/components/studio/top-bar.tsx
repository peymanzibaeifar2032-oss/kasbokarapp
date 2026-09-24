import { Link } from "@tanstack/react-router";
import { Bell, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { StudioNoticeBanner, useStudioNotices } from "@/components/studio/notice-watcher";
import { useStudioAdminEntry } from "@/components/studio/use-studio-admin";
import { inStudioApp } from "@/lib/studio-notices";

const ADMIN_URL = "https://kasbokarapp.com/studio/admin";
const LOGIN_URL = "https://kasbokarapp.com/login?next=/studio/admin";
const LOGOUT_URL = "https://kasbokarapp.com/login?out=1";

export function StudioTopBar({ compact }: { compact?: boolean }) {
  const { unread, banner, dismiss } = useStudioNotices();
  const { showAdmin } = useStudioAdminEntry();
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(inStudioApp()), []);
  return (
    <>
      {banner ? <StudioNoticeBanner item={banner} onDismiss={dismiss} /> : null}
      <header className={inApp ? "border-b border-white/10 bg-[#0b0b0c]" : "sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0c]/95 backdrop-blur-xl"}>
        {inApp ? (
          <nav className="grid gap-2 px-4 py-3" aria-label="منوی استودیو">
            <p className="text-xs text-[#b7955b]">منوی استودیو</p>
            <Link to="/studio" className="rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
              صفحه استودیو
            </Link>
            <Link to="/studio/request" className="rounded-2xl bg-[#b7955b] px-4 py-3 text-sm font-bold text-black">
              درخواست نوبت
            </Link>
            <Link to="/studio/status" className="rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
              وضعیت نوبت{unread > 0 ? ` · ${new Intl.NumberFormat("fa-IR").format(unread)}` : ""}
            </Link>
            <Link to="/studio/designs" className="rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
              انتخاب طرح
            </Link>
            <Link to="/studio/guide" className="rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
              آموزش و مراقبت
            </Link>
            <a href={ADMIN_URL} className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-[#b7955b]">
              پنل ادمین · در مرورگر
            </a>
            <a href={LOGIN_URL} className="rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
              ورود
            </a>
            <a href={LOGOUT_URL} className="rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
              خروج
            </a>
          </nav>
        ) : (
          <>
            {showAdmin ? (
              <a href={ADMIN_URL} className="block bg-[#b7955b] px-4 py-3.5 text-center text-[15px] font-black text-black">
                پنل ادمین من · درخواست‌ها، تقویم، درآمد
              </a>
            ) : null}
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
                to="/studio/designs"
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-white/15 px-3 text-sm text-white/80"
              >
                طرح
              </Link>
              <Link
                to="/studio/guide"
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-white/15 px-3 text-sm text-white/80"
              >
                آموزش
              </Link>
              <Link
                to="/studio/request"
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#b7955b] px-3 text-sm font-semibold text-black sm:px-4"
              >
                درخواست
                <ChevronLeft className="size-4" />
              </Link>
            </div>
          </>
        )}
      </header>
    </>
  );
}