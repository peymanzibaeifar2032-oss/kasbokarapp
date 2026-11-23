/**
 * Bilingual query expansion for Persian ↔ English search.
 * Uses an internal dictionary of common terms. No external translation API required.
 */
const DICT: Record<string, string[]> = {
  "وی پی ان": ["VPN", "v2ray", "proxy", "فیلترشکن"],
  "فیلترشکن": ["VPN", "proxy", "v2ray", "Xray"],
  "پروکسی": ["proxy", "VPN"],
  "تاتو": ["tattoo", "تتو"],
  "آموزش": ["tutorial", "course", "learn"],
  "برنامه": ["app", "application", "software"],
  "اندروید": ["android"],
  "هوش مصنوعی": ["AI", "artificial intelligence", "machine learning"],
  "یوتیوب": ["youtube"],
  "گیت‌هاب": ["github"],
  "دانلود": ["download", "apk"],
  "نوبت": ["appointment", "booking", "calendar"],
  "تقویم": ["calendar"],
  "vpn": ["وی پی ان", "فیلترشکن", "proxy", "v2ray"],
  "proxy": ["پروکسی", "وی پی ان", "فیلترشکن"],
  "v2ray": ["وی‌ری", "فیلترشکن", "proxy"],
  "xray": ["ایکس‌ری", "فیلترشکن"],
  "hiddify": ["هیدیفای", "فیلترشکن"],
  "sing-box": ["سینگ‌باکس", "فیلترشکن"],
  "clash": ["کلش", "فیلترشکن"],
  "wireguard": ["وایرگارد", "VPN"],
  "ai": ["هوش مصنوعی", "artificial intelligence"],
  "android": ["اندروید"],
  "tattoo": ["تاتو", "تتو"],
  "tutorial": ["آموزش", "course"],
  "course": ["دوره", "آموزش"],
  "machine learning": ["یادگیری ماشین", "هوش مصنوعی"],
  "python": ["پایتون"],
  "javascript": ["جاوااسکریپت"],
  "react": ["ری‌اکت"],
  "kotlin": ["کاتلین"],
};

function normalize(q: string): string {
  return q.trim().toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک");
}

export function expandQuery(raw: string): string[] {
  const q = normalize(raw);
  if (!q) return [];
  const set = new Set<string>([raw.trim()]);
  for (const [key, values] of Object.entries(DICT)) {
    if (q.includes(key) || key.includes(q)) {
      set.add(key);
      for (const v of values) set.add(v);
    }
  }
  // Always include the original and a simple English-looking variant
  if (/[\u0600-\u06FF]/.test(q)) {
    // Persian input — keep original
  } else {
    // English input — already covered by dict
  }
  return Array.from(set).slice(0, 8);
}

export function isPersian(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
