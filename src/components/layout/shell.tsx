import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BookOpen, CalendarDays, PenLine, UserRound } from "lucide-react";
import { SignedIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

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
      to="/studio/status"
      className="relative inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface"
      aria-label="وضعیت نوبت"
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
    <Link
      to="/login"
      search={{ next: "/studio/request" }}
      className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-fg"
    >
      ورود
    </Link>
  );
}

const headerLink =
  "inline-flex h-10 shrink-0 items-center rounded-md px-3 text-sm text-fg hover:bg-surface";
const tabClass =
  "flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted";

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  const owner = isStudioOwnerEmail(user?.primaryEmail);
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <Link to="/studio" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-fg text-xs font-black">
              تاتو
            </span>
            <strong className="text-sm font-semibold">رزرو وقت تاتو</strong>
          </Link>
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
            <Link to="/studio/request" className={headerLink}>
              درخواست
            </Link>
            <Link to="/studio/status" className={headerLink}>
              وضعیت
            </Link>
            {owner ? (
              <Link to="/studio/admin" className={headerLink}>
                پنل مدیریت
              </Link>
            ) : null}
            <SignedIn>
              <NoticeBell />
            </SignedIn>
            <AuthSlot />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5">
          <Link to="/studio" className={tabClass}>
            <span className="text-[11px] font-bold">استودیو</span>
          </Link>
          <Link to="/studio/guide" className={tabClass}>
            <BookOpen className="size-5" />
            آموزش
          </Link>
          <Link to="/studio/request" className={`${tabClass} text-primary`}>
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
              <PenLine className="size-5" />
            </span>
            درخواست
          </Link>
          <Link to="/studio/status" className={tabClass}>
            <CalendarDays className="size-5" />
            وضعیت
          </Link>
          <Link to={owner ? "/studio/admin" : "/account"} className={tabClass}>
            <UserRound className="size-5" />
            {owner ? "مدیریت" : "حساب"}
          </Link>
        </div>
      </nav>
    </div>
  );
}