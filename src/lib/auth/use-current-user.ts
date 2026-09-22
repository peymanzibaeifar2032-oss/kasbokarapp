import { useEffect, useMemo, useState } from "react";
import { authClient, authEnabled } from "./client";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
};

export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

export type CurrentUserState = {
  user: AppUser | null;
  isPending: boolean;
  sessionError: boolean;
  retry: () => void;
};

const SESSION_WAIT_MS = 4000;

export function useCurrentUserState(): CurrentUserState {
  if (!authEnabled) {
    return { user: DEV_USER, isPending: false, sessionError: false, retry: () => undefined };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- authEnabled is constant for the app's lifetime
  const session = authClient.useSession();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [gaveUp, setGaveUp] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!session.isPending) {
      setGaveUp(false);
      return;
    }
    const id = window.setTimeout(() => setGaveUp(true), SESSION_WAIT_MS);
    return () => window.clearTimeout(id);
  }, [session.isPending]);

  const raw = session.data?.user;
  const user = useMemo(
    () =>
      raw
        ? {
            id: raw.id,
            displayName: raw.name ?? null,
            primaryEmail: raw.email ?? null,
            profileImageUrl: raw.image ?? null,
            isDevFallback: false,
          }
        : null,
    [raw?.id, raw?.name, raw?.email, raw?.image],
  );
  const sessionError = Boolean(session.error) || (gaveUp && session.isPending);
  return {
    user,
    isPending: Boolean(session.isPending && !gaveUp && !session.error),
    sessionError,
    retry: () => {
      setGaveUp(false);
      const refetch = (session as { refetch?: () => unknown }).refetch;
      if (typeof refetch === "function") void refetch();
      else if (typeof window !== "undefined") window.location.reload();
    },
  };
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
