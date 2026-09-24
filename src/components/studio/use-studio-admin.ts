import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";
import { inStudioApp, syncStudioOwnerChrome } from "@/lib/studio-notices";
import { isStudioOwnerEmail } from "@/lib/studio-owner";
import type { Profile } from "@/lib/types";

const OWNER_DEVICE_KEY = "studio-owner-device";

function rememberedOwnerDevice() {
  try {
    return localStorage.getItem(OWNER_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Admin entry is this studio phone: the owner mailbox, a phone that already signed in as him, or the studio app. */
export function useStudioAdminEntry() {
  const { user } = useCurrentUserState();
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const owner = isStudioOwnerEmail(user?.primaryEmail);
    if (owner) {
      try {
        localStorage.setItem(OWNER_DEVICE_KEY, "1");
      } catch {
        /* private mode */
      }
    }
    const visible = owner || rememberedOwnerDevice() || inStudioApp();
    setShowAdmin(visible);
    setIsAdmin(owner);
    syncStudioOwnerChrome(false);
    if (!user?.id || !owner) return;
    void saveAction<Profile>("profile")
      .then((profile) => {
        const admin = Boolean(profile?.isAdmin) && owner;
        setIsAdmin(admin);
        setShowAdmin(true);
        syncStudioOwnerChrome(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setShowAdmin(visible);
      });
  }, [user?.id, user?.primaryEmail]);

  return { showAdmin, isAdmin, user };
}