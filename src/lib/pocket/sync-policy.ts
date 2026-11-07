import { isStudioOwnerEmail } from "../studio-owner.ts";
import { canRequestServerSync, type ProfessionId } from "./professions.ts";

/**
 * Server pocket download/upload is only for Peyman:
 * - profession pack must allow server sync (tattoo artist only)
 * - signed-in account must be the studio owner email
 * Collaborating artists and other professions stay fully offline.
 */
export function pocketServerSyncAllowed(input: {
  professionId: ProfessionId | null | undefined;
  accountEmail: string | null | undefined;
}) {
  if (!canRequestServerSync(input.professionId)) return false;
  return isStudioOwnerEmail(input.accountEmail);
}

export const POCKET_SYNC_DENIED_MESSAGE =
  "بارگذاری از سرور فقط برای صاحب استودیو با ایمیل ثبت‌شده فعال است.";
