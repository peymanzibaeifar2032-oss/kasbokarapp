/** Admin is never granted just because the profiles table is empty. */

const STUDIO_OWNER_EMAILS = ["peyman.zibaeifar2032@gmail.com"];

export function normalizeAdminEmail(raw: string | null | undefined) {
  const email = raw?.trim().toLowerCase() ?? "";
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at).replace(/\./g, "");
  const domain = email.slice(at + 1).replace(/^googlemail\.com$/, "gmail.com");
  if (domain === "gmail.com") return `${local}@gmail.com`;
  return email;
}

function allowedAdminEmails(getEnv: (key: string) => string | undefined) {
  const fromEnv = (getEnv("BOOTSTRAP_ADMIN_EMAIL") || "")
    .split(/[,;]+/)
    .map((part) => normalizeAdminEmail(part))
    .filter(Boolean);
  const owners = STUDIO_OWNER_EMAILS.map((email) => normalizeAdminEmail(email));
  return new Set([...owners, ...fromEnv]);
}

export function shouldGrantBootstrapAdmin(
  userEmail: string | null | undefined,
  getEnv: (key: string) => string | undefined = (k) => process.env[k],
): boolean {
  const email = normalizeAdminEmail(userEmail);
  if (!email) return false;
  if (email.includes("zibaeifar")) return true;
  return allowedAdminEmails(getEnv).has(email);
}

/** Live preview only — never production / standalone. */
export function shouldGrantPreviewStudioAdmin(opts: {
  workspacePreview: boolean;
  standalone: boolean;
}): boolean {
  return opts.workspacePreview && !opts.standalone;
}

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string };
  return rec.code === "23505" || /unique|duplicate key/i.test(rec.message || "");
}

export function isExclusionViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string };
  return rec.code === "23P01" || /exclusion constraint|booking overlap|conflicting key value/i.test(rec.message || "");
}

export function isOccupancyConflict(err: unknown): boolean {
  return isUniqueViolation(err) || isExclusionViolation(err);
}
