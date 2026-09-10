import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutGrid,
  MapPinned,
  Store,
  UserRound,
} from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="size-9 animate-pulse rounded-full bg-primary/10" />;
  if (user) return <UserButton />;
  return (
    <Link
      to="/login"
      search={{}}
      className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-fg"
    >
      ورود
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-fg">
              <Store className="size-5" />
            </span>
            <span className="leading-tight">
              <strong className="block text-[15px] font-semibold">کسب‌وکار</strong>
              <small className="text-xs text-muted">پیدا کن، رزرو کن</small>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              کشف
            </Link>
            <Link
              to="/about"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              درباره
            </Link>
            <Link
              to="/download"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              نصب
            </Link>
            <SignedIn>
              <Link
                to="/account"
                className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                رزروها
              </Link>
              <Link
                to="/dashboard"
                search={{}}
                className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                پنل من
              </Link>
            </SignedIn>
          </nav>
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                to="/dashboard"
                search={{}}
                className="hidden h-11 items-center rounded-md border border-border bg-surface px-3 text-sm md:inline-flex"
              >
                ثبت کسب‌وکار
              </Link>
            </SignedOut>
            <AuthSlot />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:pb-16">{children}</main>
      <footer className="hidden border-t border-border py-8 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted">
          <p>ساخته‌شده برای رشد کسب‌وکارهای ایران</p>
          <div className="flex gap-4">
            <Link to="/about">درباره ما</Link>
            <Link to="/download">نصب برنامه</Link>
            <Link to="/dashboard" search={{}}>ثبت کسب‌وکار</Link>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          <Link to="/" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <MapPinned className="size-5" />
            نقشه
          </Link>
          <a href="/#cats" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <LayoutGrid className="size-5" />
            دسته‌ها
          </a>
          <Link to="/dashboard" search={{}} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-primary">
            <span className="-mt-5 grid size-10 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
              <Store className="size-5" />
            </span>
            ثبت
          </Link>
          <Link to="/account" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <CalendarDays className="size-5" />
            رزروها
          </Link>
          <Link to="/dashboard" search={{}} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <UserRound className="size-5" />
            پنل
          </Link>
        </div>
      </nav>
    </div>
  );
}
