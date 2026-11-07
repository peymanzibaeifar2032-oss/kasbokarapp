import { type PocketLocale, type ProfessionId, getProfessionPack } from "./professions.ts";

const KEY = "pocket.app.settings.v1";

export type PocketSettings = {
  locale: PocketLocale;
  professionId: ProfessionId;
  onboarded: boolean;
};

export const DEFAULT_POCKET_SETTINGS: PocketSettings = {
  locale: "fa",
  professionId: "tattoo_artist",
  onboarded: false,
};

export function readPocketSettings(): PocketSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_POCKET_SETTINGS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_POCKET_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PocketSettings>;
    const locale: PocketLocale = parsed.locale === "en" ? "en" : "fa";
    const professionId = (parsed.professionId && getProfessionPack(parsed.professionId).id === parsed.professionId
      ? parsed.professionId
      : "tattoo_artist") as ProfessionId;
    return {
      locale,
      professionId,
      onboarded: Boolean(parsed.onboarded && parsed.professionId),
    };
  } catch {
    return { ...DEFAULT_POCKET_SETTINGS };
  }
}

export function writePocketSettings(next: PocketSettings) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function completeOnboarding(locale: PocketLocale, professionId: ProfessionId): PocketSettings {
  const next: PocketSettings = { locale, professionId, onboarded: true };
  writePocketSettings(next);
  return next;
}
