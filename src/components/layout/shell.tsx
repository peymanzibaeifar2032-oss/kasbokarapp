import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CalendarDays, LayoutGrid, MapPinned, Store, UserRound } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { t } from "@/lib/i18n";
import { saveAction } from "@/lib/save";

function NoticeBell() {
  const { user } = useCurrentUserState();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) return;
    void saveAction<{ unread: number }>("notifications")
      .then((r) => setUnread(r.unread || 0))
      .catch(() => setUnread(0));
  }, [user]);
  if (!user) return null;
  return (
    <Link
      to="/notifications"
      className="relative inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface"
      aria-label={t("navNotices")}
    >
      <Bell className="size-5" />
      {unread > 0 ? (
        <span className="absolute -left-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-[10px] text-accent-fg">
          {unread > 9 ? "۹+" : new Intl.NumberFormat("fa-IR").format(unread)}
        </span>
      ) : null}
    </Link>
  );
}

function AuthSlot() {
  const { user } = useCurrentUserState();
  if (user) return <UserButton />;
  return (
    <a
      href="/login"
      className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-fg"
    >
      {t("navSignIn")}
    </a>
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
              <strong className="block text-[15px] font-semibold">{t("appName")}</strong>
              <small className="text-xs text-muted">{t("tagline")}</small>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              {t("navDiscover")}
            </Link>
            <Link
              to="/about"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              {t("navAbout")}
            </Link>
            <Link
              to="/download"
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              {t("navInstall")}
            </Link>
            <SignedIn>
              <Link
                to="/account"
                className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                {t("navBookings")}
              </Link>
              <Link
                to="/dashboard"
                search={{}}
                className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                {t("navPanel")}
              </Link>
              <Link
                to="/dashboard"
                search={{}}
                className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                {t("navCalendar")}
              </Link>
            </SignedIn>
          </nav>
          <div className="flex items-center gap-2">
            <SignedIn>
              <NoticeBell />
            </SignedIn>
            <SignedOut>
              <Link
                to="/dashboard"
                search={{}}
                className="hidden h-11 items-center rounded-md border border-border bg-surface px-3 text-sm md:inline-flex"
              >
                {t("navRegister")}
              </Link>
            </SignedOut>
            <AuthSlot />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:pb-16">{children}</main>
      <footer className="hidden border-t border-border py-8 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted">
          <p>{t("footerMade")}</p>
          <div className="flex gap-4">
            <Link to="/about">{t("footerAbout")}</Link>
            <Link to="/download">{t("footerInstall")}</Link>
            <Link to="/dashboard" search={{}}>{t("navRegister")}</Link>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          <a href="/" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <MapPinned className="size-5" />
            {t("navMap")}
          </a>
          <a href="/#cats" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <LayoutGrid className="size-5" />
            {t("navCategories")}
          </a>
          <a href="/dashboard" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-primary">
            <span className="-mt-5 grid size-10 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
              <Store className="size-5" />
            </span>
            {t("navCreate")}
          </a>
          <a href="/account" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <CalendarDays className="size-5" />
            {t("navBookings")}
          </a>
          <a href="/dashboard" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <UserRound className="size-5" />
            {t("navAccount")}
          </a>
        </div>
      </nav>
    </div>
  );
}
