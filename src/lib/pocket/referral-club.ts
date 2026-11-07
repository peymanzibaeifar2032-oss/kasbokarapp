import { z } from "zod";
import { FALLBACK_CLUB_SMS, type ReferralSmsSettings } from "../referral-sms.ts";
import { assertCanMutate } from "./license-gate.ts";

/**
 * Owner's referral club («باشگاه مشتریان») cached on the phone from the owner-verified site export.
 * Holds only what the site's club panel shows the owner: member name/phone/code, success count, rewards,
 * the owner-edited SMS settings and the site's unsent outbox. No referred-friend data, no auth, no license data.
 */
const s = (n: number) => z.string().max(n);
export const clubSettingsSchema = z.object({
  prize5: s(160), prize10: s(160), smsSubmitted: s(320), smsPriced: s(320), smsBooked: s(320), smsPrize5: s(320), smsPrize10: s(320),
});
export const referralClubSchema = z.object({
  status: z.literal("ok"),
  generatedAt: s(80),
  settings: clubSettingsSchema.nullable(),
  members: z.array(z.object({
    id: s(120), name: s(200), phone: s(40), code: s(60), active: z.boolean(), tier: s(40),
    successful: z.number().int().min(0), total: z.number().int().min(0),
    rewards: z.array(z.object({ milestone: z.number().int(), title: s(160), status: s(40) })).max(50),
  })).max(2000),
  outbox: z.array(z.object({ id: s(120), phone: s(40), body: s(1000), referrerId: s(120) })).max(50),
  truncated: z.boolean(),
});
export type PocketReferralClub = z.infer<typeof referralClubSchema>;
export type PocketReferralState = { club: PocketReferralClub | null; localSettings: ReferralSmsSettings | null };
export const referralStateSchema = z.object({ club: referralClubSchema.nullable(), localSettings: clubSettingsSchema.nullable() });

const KEY = "pocket.referral.v1";

export function parseReferralClub(raw: unknown): PocketReferralClub | null {
  const r = referralClubSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function readReferralState(): PocketReferralState {
  if (typeof localStorage === "undefined") return { club: null, localSettings: null };
  try {
    const parsed = referralStateSchema.safeParse(JSON.parse(localStorage.getItem(KEY) || "null"));
    return parsed.success ? parsed.data : { club: null, localSettings: null };
  } catch {
    return { club: null, localSettings: null };
  }
}

export function writeReferralState(next: PocketReferralState) {
  assertCanMutate();
  if (typeof localStorage === "undefined") return; // node tests / non-browser
  localStorage.setItem(KEY, JSON.stringify(next));
}

/** Site snapshot replaces the cached club; the owner's phone-only text edits are kept. */
export function applyServerClub(club: PocketReferralClub) {
  const prev = readReferralState();
  writeReferralState({ club, localSettings: prev.localSettings });
}

/** Text used for the club SMS: phone edit > site settings > panel defaults (same order as the site). */
export function effectiveClubSettings(state: PocketReferralState): { settings: ReferralSmsSettings; source: "phone" | "site" | "default" } {
  if (state.localSettings) return { settings: state.localSettings, source: "phone" };
  if (state.club?.settings) return { settings: state.club.settings, source: "site" };
  return { settings: FALLBACK_CLUB_SMS, source: "default" };
}

/** Same bounds as the site's saveReferralSettings (trimmed, prize 4–160, texts 4–320). */
export function validateClubSettings(raw: ReferralSmsSettings): string | null {
  for (const [k, max] of [["prize5", 160], ["prize10", 160], ["smsSubmitted", 320], ["smsPriced", 320], ["smsBooked", 320], ["smsPrize5", 320], ["smsPrize10", 320]] as const) {
    const v = raw[k].trim();
    if (v.length < 4 || v.length > max) return `«${k}» باید بین ۴ و ${max} نویسه باشد.`;
  }
  return null;
}
