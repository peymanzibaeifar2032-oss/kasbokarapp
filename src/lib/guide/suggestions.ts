export type GuideSuggestion = { label: string; text: string };

export function suggestionsForPath(path: string): GuideSuggestion[] {
  if (path.startsWith("/business/")) {
    return [
      { label: "رزرو نوبت", text: "چطور از صفحه این کسب‌وکار نوبت رزرو کنم؟" },
      { label: "ثبت نظر", text: "چطور برای این کسب‌وکار نظر و امتیاز ثبت کنم؟" },
      { label: "مسیر نشان", text: "دکمه مسیر نشان چه کار می‌کند؟" },
    ];
  }
  if (path.startsWith("/dashboard")) {
    return [
      { label: "ثبت کسب‌وکار", text: "چطور کسب‌وکار خودم را ثبت کنم تا روی نقشه بیاید؟" },
      { label: "تأیید و آزمایشی", text: "بعد از ثبت، تأیید مدیریت و ۷ روز رایگان یعنی چه؟" },
      { label: "رزروهای مشتری", text: "در پنل، رزرو مشتری را چطور تأیید یا لغو کنم؟" },
    ];
  }
  if (path.startsWith("/account")) {
    return [
      { label: "رزروهای من", text: "رزروهای خودم را کجا ببینم و چطور لغو کنم؟" },
      { label: "ذخیره‌ها", text: "کسب‌وکارهای ذخیره‌شده با قلب کجا هستند؟" },
    ];
  }
  if (path.startsWith("/login")) {
    return [
      { label: "ورود با ایمیل", text: "چطور با ایمیل و رمز وارد شوم یا حساب بسازم؟" },
      { label: "بعد از ورود", text: "بعد از ورود به همان صفحه رزرو یا ثبت برمی‌گردم؟" },
    ];
  }
  if (path.startsWith("/admin")) {
    return [
      { label: "تأیید صفحه", text: "مدیر چطور کسب‌وکار را تأیید یا رد می‌کند؟" },
      { label: "گزارش باگ", text: "گزارش‌های باگ را در پنل مدیریت کجا ببینم؟" },
    ];
  }
  if (path.startsWith("/download") || path.startsWith("/about")) {
    return [
      { label: "نصب روی گوشی", text: "چطور وب‌اپ کسب‌وکار را روی گوشی نصب کنم؟" },
      { label: "ثبت کسب‌وکار", text: "صاحب کسب‌وکار از کجا صفحه خودش را ثبت می‌کند؟" },
    ];
  }
  return [
    { label: "پیدا کردن نزدیک", text: "چطور کسب‌وکار نزدیک را روی نقشه پیدا کنم؟" },
    { label: "ثبت روی نقشه", text: "چطور محل کسب‌وکار را روی نقشه انتخاب کنم؟" },
    { label: "رزرو وقت", text: "برای گرفتن نوبت چه کارهایی لازم است؟" },
  ];
}
