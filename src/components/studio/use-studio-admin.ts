import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";
import { syncStudioOwnerChrome } from "@/lib/studio-notices";
import { isStudioOwnerEmail } from "@/lib/studio-owner";
import type { Profile } from "@/lib/types";

/** Admin entry is the studio mailbox only. The Android bar follows the same rule. */
export function useStudioAdminEntry() {
  const { user } = useCurrentUserState();
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const owner = isStudioOwnerEmail(user?.primaryEmail);
    setShowAdmin(owner);
    setIsAdmin(owner);
    syncStudioOwnerChrome(owner);
    if (!user?.id || !owner) return;
    void saveAction<Profile>("profile")
      .then((profile) => {
        const admin = Boolean(profile?.isAdmin) && owner;
        setIsAdmin(admin);
        setShowAdmin(owner);
        syncStudioOwnerChrome(owner);
      })
      .catch(() => {
        setIsAdmin(false);
        setShowAdmin(owner);
      });
  }, [user?.id, user?.primaryEmail]);

  return { showAdmin, isAdmin, user };
}
