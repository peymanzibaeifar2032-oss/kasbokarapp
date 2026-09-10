const SECRET_LINE =
  /(password|passwd|secret|token|api[_-]?key|authorization|bearer|otp|cvv|cvc)\s*[:=]\s*\S+/gi;

const CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi;

export function redactSecrets(input: string): string {
  return input
    .replace(SECRET_LINE, "$1: [حذف‌شده]")
    .replace(BEARER, "Bearer [حذف‌شده]")
    .replace(JWT, "[توکن حذف‌شده]")
    .replace(CARD, "[شماره کارت حذف‌شده]");
}

export function looksLikeInjection(text: string): boolean {
  const t = text.toLowerCase();
  const patterns = [
    "ignore previous",
    "ignore all instructions",
    "system prompt",
    "developer mode",
    "jailbreak",
    "you are now",
    "reveal the prompt",
    "show your instructions",
    "دستورات قبلی را نادیده",
    "دستورات سیستم را نادیده",
    "نقش خود را عوض",
    "نقش خود را تغییر",
    "پرامپت سیستم",
    "کلید api",
    "api key را بگو",
    "راز سیستم",
  ];
  return patterns.some((p) => t.includes(p));
}

export function isClearlyOffTopic(text: string): boolean {
  const t = text.toLowerCase();
  const off = [
    "انتخابات",
    "سیاست",
    "رئیس جمهور",
    "فوتبال",
    "اسپریپت",
    "دستور پخت",
    "آب و هوا",
    "bitcoin",
    "crypto",
    "weather",
    "javascript tutorial",
    "python code",
    "chatgpt",
    "اخبار",
    "پزشکی تشخیص",
    "نسخه دارو",
  ];
  return off.some((p) => t.includes(p));
}
