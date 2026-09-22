export function isStudioOwnerName(name: string | null | undefined) {
  const raw = name || "";
  const fa = raw.replace(/[\s\u200c\u200d]+/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");
  if (fa.includes("پیمان") && (fa.includes("زیبائیفر") || fa.includes("زیبایفر"))) return true;
  const ascii = raw.toLowerCase().replace(/[^a-z]/g, "");
  return ascii.includes("peyman") && ascii.includes("zibaeifar");
}
