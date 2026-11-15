import { isStudioOwnerEmail } from "../studio-owner.ts";

/**
 * The studio/teach API gate, kept pure so it is tested: the caller passes the email of the *server-side session*
 * (never an email from the request body or a header). No session, or a session that is not the studio owner, is 401;
 * a cross-site browser request is 403 before the session is even read.
 */
export function teachGate(input: { secFetchSite: string | null; sessionEmail: string | null | undefined }): { status: 401 | 403; error: string } | null {
  const site = input.secFetchSite;
  if (site && site !== "same-origin" && site !== "none") return { status: 403, error: "این درخواست مجاز نیست." };
  if (!isStudioOwnerEmail(input.sessionEmail)) return { status: 401, error: "فقط از پنل مدیر." };
  return null;
}
