import { toEnDigits } from "../format.ts";

/** Real routes that exist in the site's owner panel (src/routes/studio.admin.tsx validateSearch `tab`). */
export const STUDIO_PANEL_ORIGIN = "https://kasbokarapp.com";
export const STUDIO_PANEL_TABS = ["requests", "messages", "calendar", "money", "jobs", "apprentices", "club"] as const;
export type StudioPanelTab = (typeof STUDIO_PANEL_TABS)[number];
export const studioPanelUrl = (tab: StudioPanelTab) => `${STUDIO_PANEL_ORIGIN}/studio/admin?tab=${tab}`;

export function usablePhone(raw: string | null | undefined) {
  const digits = toEnDigits(raw || "").replace(/[^\d]/g, "");
  return digits.length >= 10 ? (raw || "").trim() : "";
}

/** Plain SMS composer link (no body) for any profession. */
export function plainSmsLink(raw: string) {
  const digits = toEnDigits(raw).replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  const local = digits.startsWith("98") ? `0${digits.slice(2)}` : digits.startsWith("0") ? digits : `0${digits}`;
  return `sms:${local}`;
}
