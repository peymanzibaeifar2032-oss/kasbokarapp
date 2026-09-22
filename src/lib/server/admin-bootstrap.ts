/** Admin is never granted just because the profiles table is empty. */

export function shouldGrantBootstrapAdmin(
  userEmail: string | null | undefined,
  getEnv: (key: string) => string | undefined = (k) => process.env[k],
): boolean {
  const allow = getEnv("BOOTSTRAP_ADMIN_EMAIL")?.trim().toLowerCase();
  const email = userEmail?.trim().toLowerCase();
  if (!allow || !email) return false;
  return allow === email;
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
