import { faIR, type MessageKey } from "./fa.ts";

export type LocaleId = "fa-IR" | "en";

export const defaultLocale: LocaleId = "fa-IR";
export const defaultDir = "rtl" as const;

const catalogs: Record<LocaleId, Record<string, string>> = {
  "fa-IR": faIR,
  en: faIR,
};

export function t(key: MessageKey, locale: LocaleId = defaultLocale): string {
  return catalogs[locale]?.[key] || faIR[key] || key;
}

export function dirFor(locale: LocaleId = defaultLocale): "rtl" | "ltr" {
  return locale === "fa-IR" ? "rtl" : "ltr";
}

export type { MessageKey };
