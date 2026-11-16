import { isStudioOwnerEmail, STUDIO_OWNER_EMAIL } from "../studio-owner.ts";

/**
 * Why an email/password sign-up must be refused, or null when it may go ahead.
 *
 * Gmail ignores dots, so `p.eyman...@gmail.com` is the same inbox as the owner's
 * address, but Better Auth stores it as a different user. The owner check
 * (`isStudioOwnerEmail`) compares Gmail addresses without dots, so a stranger who
 * signed up with a dotted twin of the owner's address would get the owner panel
 * (no email verification is required). Refuse such a sign-up, and refuse any
 * sign-up whose address is a Gmail twin of an account that already exists.
 *
 * `storedTwin` is the email of an existing account with the same Gmail inbox
 * (from `findStoredEmail`), or null.
 */
export function signUpBlockReason(rawEmail: string, storedTwin: string | null): string | null {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) return null;
  if (storedTwin) return "این ایمیل قبلاً ثبت شده است. از «ورود» یا «فراموشی رمز» استفاده کنید.";
  if (isStudioOwnerEmail(email) && email !== STUDIO_OWNER_EMAIL.toLowerCase()) {
    return "این ایمیل قابل ثبت نیست.";
  }
  return null;
}
