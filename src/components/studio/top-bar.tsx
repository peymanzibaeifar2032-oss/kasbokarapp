import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setInApp(inStudioApp()), []);
  return (
    <>
      {banner ? <StudioNoticeBanner item={banner} onDismiss={dismiss} /> : null}
      <header className={inApp ? "border-b border-white/10 bg-[#0b0b0c]" : "sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0c]/95 backdrop-blur-xl"}>
        {inApp ? (
          <div className="px-4 py-3">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-[#b7955b] px-4 text-sm font-black text-black"
              onClick={() => setMenuOpen((open) => !open)}
            >
              منوی استودیو
              <span>{menuOpen ? "بستن" : "باز کردن"}</span>
            </button>
            {menuOpen ? (
              <nav className="mt-3 grid grid-cols-2 gap-2" aria-label="منوی استودیو">
                <Link to="/studio" className="flex h-14 items-center justify-center rounded-2xl bg-white/[.06] text-sm">
                  صفحه استودیو
                </Link>
                <Link to="/studio/request" className="flex h-14 items-center justify-center rounded-2xl bg-[#b7955b] text-sm font-bold text-black">
                  درخواست نوبت
                </Link>
                <Link to="/studio/status" className="flex h-14 items-center justify-center rounded-2xl bg-white/[.06] text-sm">
                  وضعیت نوبت{unread > 0 ? ` · ${new Intl.NumberFormat("fa-IR").format(unread)}` : ""}
                </Link>
                <Link to="/studio/designs" className="flex h-14 items-center justify-center rounded-2xl bg-white/[.06] text-sm">
                  انتخاب طرح
                </Link>
                <Link to="/studio/guide" className="flex h-14 items-center justify-center rounded-2xl bg-white/[.06] text-sm">
                  آموزش فرم
                </Link>
                <Link to="/studio/care" className="flex h-14 items-center justify-center rounded-2xl bg-white/[.06] text-sm">
                  مراقبت
                </Link>
                <a href={ADMIN_URL} className="col-span-2 flex h-14 items-center justify-center rounded-2xl bg-black text-sm font-bold text-[#b7955b]">
                  پنل ادمین · در مرورگر
                </a>
                <a href={LOGIN_URL} className="flex h-14 items-center justify-center rounded-2xl border border-white/10 text-sm">
                  ورود
                </a>
                <a href={LOGOUT_URL} className="flex h-14 items-center justify-center rounded-2xl border border-white/10 text-sm">
                  خروج
                </a>
              </nav>
            ) : null}
          </div>
        ) : (
          <>
            {showAdmin ? (
              <a href={ADMIN_URL} className="block bg-[#b7955b] px-4 py-3.5 text-center text-[15px] font-black text-black">
                پنل ادمین من · درخواست‌ها، تقویم، درآمد
              </a>
            ) : null}
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:py-0">
              <Link to="/studio" className="leading-tight sm:min-w-0 sm:flex-1">
                <strong className="block text-sm tracking-wide">پیمان زیبائی‌فر</strong>
                {compact ? null : (
                  <span className="hidden text-[11px] text-white/45 sm:block">TATTOO ARTIST · KERMANSHAH</span>
                )}
              </Link>
              <nav className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Link
                to="/studio/request"
                className="inline-flex h-12 items-center justify-center gap-1 rounded-2xl bg-[#b7955b] px-3 text-sm font-bold text-black"
              >
                درخواست
              </Link>
              <Link
                to="/studio/status"
                className="relative inline-flex h-12 items-center justify-center gap-1 rounded-2xl border border-[#b7955b]/45 px-3 text-sm text-[#e5d2ae]"
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
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-3 text-sm text-white/80"
              >
                طرح
              </Link>
              <Link
                to="/studio/guide"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-3 text-sm text-white/80"
              >
                آموزش
              </Link>
              <Link
                to="/studio/care"
                className="col-span-2 inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-3 text-sm text-white/80 sm:col-span-1"
              >
                مراقبت قبل و بعد
              </Link>
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  );
}