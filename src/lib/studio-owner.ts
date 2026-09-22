export const STUDIO_OWNER_EMAIL = "peyman.zibaeifar2032@gmail.com";

export function normalizeOwnerEmail(raw: string | null | undefined) {
  const email = raw?.trim().toLowerCase() ?? "";
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at).replace(/\./g, "");
  const domain = email.slice(at + 1).replace(/^googlemail\.com$/, "gmail.com");
  if (domain === "gmail.com") return `${local}@gmail.com`;
  return email;
}

/** Tattoo admin chrome is this mailbox only — not a display name, not any similar address. */
export function isStudioOwnerEmail(raw: string | null | undefined) {
  const email = normalizeOwnerEmail(raw);
  return Boolean(email) && email === normalizeOwnerEmail(STUDIO_OWNER_EMAIL);
}

export function isStudioOwnerName(name: string | null | undefined) {
  const raw = name || "";
  const fa = raw.replace(/[\s\u200c\u200d]+/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");
  if (fa.includes("پیمان") && (fa.includes("زیبائیفر") || fa.includes("زیبایفر"))) return true;
  const ascii = raw.toLowerCase().replace(/[^a-z]/g, "");
  return ascii.includes("peyman") && ascii.includes("zibaeifar");
}
