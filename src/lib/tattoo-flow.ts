export function makeTattooTrackingCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function normalizeTattooTrackingCode(value: string) {
  const fold = value
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  return fold;
}

export const TATTOO_REPLY_WAIT_NOTE =
  "هر جلسه تاتو حدود ۶ ساعت طول می‌کشد و لیست درخواست‌ها دیر‌به‌دیر چک می‌شود. اگر جواب کمی دیر آمد، درخواست گم نشده؛ با کد پیگیری همین صفحه را دوباره باز کن.";
