import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";
import {
  ensureStudioPhoneNotices,
  markStudioNoticesSeen,
  showStudioOsNotice,
  unseenStudioNoticeIds,
} from "@/lib/studio-notices";
import type { NotificationItem } from "@/lib/types";

export function useStudioNotices() {
  const { user } = useCurrentUserState();
  const [banner, setBanner] = useState<NotificationItem | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void ensureStudioPhoneNotices().catch(() => undefined);
    async function tick() {
      try {
        const r = await saveAction<{ items: NotificationItem[]; unread: number }>("notifications");
        if (cancelled) return;
        const items = r.items ?? [];
        setUnread(r.unread || 0);
        const freshIds = unseenStudioNoticeIds(items.map((n) => n.id));
        const latest = items.find((n) => freshIds.includes(n.id));
        if (latest) {
          setBanner(latest);
          showStudioOsNotice(latest.title, latest.body, latest.id);
          markStudioNoticesSeen(freshIds);
        }
      } catch {
        /* ignore poll errors */
      }
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  return { unread, banner, dismiss: () => setBanner(null) };
}

export function StudioNoticeBanner({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: () => void;
}) {
  return (
    <Link
      to="/studio/status"
      className="block border-b border-black/10 bg-[#b7955b] px-4 py-3 text-sm font-bold text-black"
      onClick={onDismiss}
    >
      <span className="mx-auto flex max-w-6xl items-start gap-2">
        <Bell className="mt-0.5 size-4 shrink-0" />
        <span>
          {item.title}
          {item.body ? <span className="mt-1 block font-normal opacity-80">{item.body}</span> : null}
        </span>
      </span>
    </Link>
  );
}
