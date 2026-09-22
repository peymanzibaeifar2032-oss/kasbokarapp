import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";
import { inStudioApp } from "@/lib/studio-notices";
import type { Profile } from "@/lib/types";

/** Gold admin entry: visible in the Android app always, and on the site only for the owner. */
export function useStudioAdminEntry() {
  const { user } = useCurrentUserState();
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (inStudioApp()) setShowAdmin(true);
    if (!user?.id) return;
    void saveAction<Profile>("profile")
      .then((profile) => {
        const admin = Boolean(profile?.isAdmin);
        setIsAdmin(admin);
        if (admin) setShowAdmin(true);
      })
      .catch(() => undefined);
  }, [user?.id]);

  return { showAdmin, isAdmin, user };
}
