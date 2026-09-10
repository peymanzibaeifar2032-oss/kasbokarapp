import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";

const KEY = "kasb:favorites";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const { user, isPending } = useCurrentUserState();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setIds(read());
      return;
    }
    void saveAction<string[]>("favorites")
      .then((next) => {
        setIds(next);
        write(next);
      })
      .catch(() => setIds(read()));
  }, [user, isPending]);

  function toggle(id: string) {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      write(next);
      return next;
    });
    if (user) {
      void saveAction<string[]>("favoriteToggle", { id })
        .then((next) => {
          setIds(next);
          write(next);
        })
        .catch(() => {
          /* local cache already updated */
        });
    }
  }

  function has(id: string) {
    return ids.includes(id);
  }

  return { ids, toggle, has };
}
