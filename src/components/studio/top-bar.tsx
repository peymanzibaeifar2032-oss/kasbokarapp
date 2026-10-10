import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { StudioNoticeBanner, useStudioNotices } from "@/components/studio/notice-watcher";
import { useStudioAdminEntry } from "@/components/studio/use-studio-admin";
import { inStudioApp } from "@/lib/studio-notices";

const ADMIN_URL = "https://kasbokarapp.com/studio/admin";
const LOGIN_URL = "https://kasbokarapp.com/login?next=/studio/admin";
const LOGOUT_URL = "https://kasbokarapp.com/login?out=1";

export function StudioTopBar({ compact, light }: { compact?: boolean; light?: boolean }) {
  const { unread, banner, dismiss } = useStudioNotices();
  const { showAdmin } = useStudioAdminEntry();
  const [inApp, setInApp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setInApp(inStudioApp()), []);
  return (
    <>
      {banner ? <StudioNoticeBanner item={banner} onDismiss={dismiss} /> : null}
      <header className={light ? "sticky top-0 z-40 border-b border-slate-200 bg-white text-[#1c1917]" : inApp ? "border-b border-white/10 bg-[#0b0b0c]" : "sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0c]/95 backdrop-blur-xl"}>
        {inApp ? (
          <div className="px-4 py-3">
            <button
              type="button"
              className={`flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-black ${light ? "bg-[#2f80ed] text-white" : "bg-[#b7955b] text-black"}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              منوی استودیو
              <span>{menuOpen ? "بستن" : "باز کردن"}</span>
            </button>
            {menuOpen ? (
              <nav className="mt-3 grid grid-cols-2 gap-2" aria-label="منوی استودیو">
                <Link to="/studio/request" className={`flex h-14 items-center justify-center rounded-2xl text-sm font-bold ${light ? "bg-[#2f80ed] text-white" : "bg-[#b7955b] text-black"}`}>
                  درخواست نوبت
                </Link>
                <Link to="/studio/status" className={`flex h-14 items-center justify-center rounded-2xl text-sm ${light ? "bg-slate-100" : "bg-white/[.06]"}`}>
                  وضعیت نوبت{unread > 0 ? ` · ${new Intl.NumberFormat("fa-IR").format(unread)}` : ""}
                </Link>
                <Link to="/studio/open" className={`col-span-2 flex h-14 items-center justify-center rounded-2xl text-sm font-bold ${light ? "bg-emerald-50 text-emerald-900" : "bg-emerald-500/20 text-emerald-50"}`}>
                  روزهای خالی
                </Link>
                <button
                  type="button"
                  className={`col-span-2 flex h-12 items-center justify-center rounded-2xl border text-sm ${light ? "border-slate-200" : "border-white/10"}`}
                  onClick={() => setMoreOpen((open) => !open)}
                >
                  {moreOpen ? "بستن بقیه" : "بیشتر"}
                </button>
                {moreOpen ? (
                  <>
                    <Link to="/studio/club" className={`flex h-14 items-center justify-center rounded-2xl text-sm ${light ? "bg-slate-100" : "bg-white/[.06]"}`}>باشگاه</Link>
                    <Link to="/studio/care" className={`flex h-14 items-center justify-center rounded-2xl text-sm ${light ? "bg-slate-100" : "bg-white/[.06]"}`}>مراقبت</Link>
                    <Link to="/studio/guide" className={`flex h-14 items-center justify-center rounded-2xl text-sm ${light ? "bg-slate-100" : "bg-white/[.06]"}`}>آموزش فرم</Link>
                    <Link to="/studio/designs" className={`flex h-14 items-center justify-center rounded-2xl text-sm ${light ? "bg-slate-100" : "bg-white/[.06]"}`}>انتخاب طرح</Link>
                  </>
                ) : null}
                <a href={ADMIN_URL} className={`col-span-2 flex h-14 items-center justify-center rounded-2xl text-sm font-bold ${light ? "bg-[#1c3d52] text-white" : "bg-black text-[#b7955b]"}`}>
                  پنل ادمین · در مرورگر
                </a>
                <a href={LOGIN_URL} className={`flex h-14 items-center justify-center rounded-2xl border text-sm ${light ? "border-slate-200" : "border-white/10"}`}>ورود</a>
                <a href={LOGOUT_URL} className={`flex h-14 items-center justify-center rounded-2xl border text-sm ${light ? "border-slate-200" : "border-white/10"}`}>خروج</a>
              </nav>
            ) : null}
          </div>
        ) : (
          <>
            {showAdmin ? (
              <a href={ADMIN_URL} className={`block px-4 py-3.5 text-center text-[15px] font-black ${light ? "bg-[#2f80ed] text-white" : "bg-[#b7955b] text-black"}`}>
                پنل ادمین من · درخواست‌ها، تقویم، درآمد
              </a>
            ) : null}
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:py-0">
              <Link to="/studio" className="leading-tight sm:min-w-0 sm:flex-1">
                <strong className="block text-sm tracking-wide">پیمان زیبائی‌فر</strong>
                {compact ? null : (
                  <span className={`hidden text-[11px] sm:block ${light ? "text-slate-400" : "text-white/45"}`}>TATTOO ARTIST · KERMANSHAH</span>
                )}
              </Link>
              <nav className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Link
                to="/studio/request"
                className={`inline-flex h-12 items-center justify-center gap-1 rounded-2xl px-3 text-sm font-bold ${light ? "bg-[#2f80ed] text-white" : "bg-[#b7955b] text-black"}`}
              >
                درخواست
              </Link>
              <Link
                to="/studio/status"
                className={`relative inline-flex h-12 items-center justify-center gap-1 rounded-2xl border px-3 text-sm ${light ? "border-slate-200 text-slate-700" : "border-[#b7955b]/45 text-[#e5d2ae]"}`}
              >
                <Bell className="size-4" />
                وضعیت
                {unread > 0 ? (
                  <span className={`absolute -left-1 -top-1 min-w-4 rounded-full px-1 text-center text-[10px] font-bold ${light ? "bg-[#eb5757] text-white" : "bg-[#b7955b] text-black"}`}>
                    {unread > 9 ? "۹+" : new Intl.NumberFormat("fa-IR").format(unread)}
                  </span>
                ) : null}
              </Link>
              <Link
                to="/studio/open"
                className={`inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm ${light ? "border-emerald-200 text-emerald-800" : "border-emerald-300/40 text-emerald-100"}`}
              >
                روز خالی
              </Link>
              <button
                type="button"
                className={`inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm ${light ? "border-slate-200 text-slate-700" : "border-white/15 text-white/80"}`}
                onClick={() => setMoreOpen((open) => !open)}
              >
                {moreOpen ? "بستن" : "بیشتر"}
              </button>
              {moreOpen ? (
                <>
                  <Link to="/studio/club" className={`inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm ${light ? "border-slate-200 text-slate-700" : "border-[#b7955b]/40 text-[#e5d2ae]"}`}>باشگاه</Link>
                  <Link to="/studio/care" className={`inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm ${light ? "border-slate-200 text-slate-700" : "border-white/15 text-white/80"}`}>مراقبت</Link>
                  <Link to="/studio/guide" className={`inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm ${light ? "border-slate-200 text-slate-700" : "border-white/15 text-white/80"}`}>آموزش</Link>
                  <Link to="/studio/designs" className={`inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm ${light ? "border-slate-200 text-slate-700" : "border-white/15 text-white/80"}`}>طرح</Link>
                </>
              ) : null}
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  );
}