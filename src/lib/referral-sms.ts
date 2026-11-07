/**
 * Referral-club ("باشگاه مشتریان") SMS texts. Single source shared by the site panel
 * (components/studio/referral-admin.tsx) and the Pocket app, so both produce identical text.
 * Moved verbatim from referral-admin.tsx; owner-customised texts live in studio_referral_settings.
 */
export type ReferralSmsSettings = {
  prize5: string;
  prize10: string;
  smsSubmitted: string;
  smsPriced: string;
  smsBooked: string;
  smsPrize5: string;
  smsPrize10: string;
};

/** Panel fallback when the server settings are not loaded (identical to the server DEFAULT_SMS / PRIZE5 / PRIZE10). */
export const FALLBACK_CLUB_SMS: ReferralSmsSettings = {
  smsSubmitted: "یکی از دوستانی که با کد معرف شما درخواست داده، وارد مرحله بررسی شد.\nکد عضویت شما: {code}",
  smsPriced: "برای یکی از معرفی‌های شما قیمت و شرایط مشخص شد.\nکد عضویت شما: {code}",
  smsBooked: "یک معرفی موفق برای شما ثبت شد. اکنون {count} معرفی موفق از ۱۰ معرفی دارید.\nکد عضویت شما: {code}",
  smsPrize5: "تبریک! شما ۵ معرفی موفق دارید. جایزه شما فعال شد: {prize}. برای هماهنگی ثبت نوبت از پنل خود اقدام کنید.\nکد عضویت شما: {code}",
  smsPrize10: "تبریک! شما ۱۰ معرفی موفق دارید. جایزه دوم شما فعال شد: {prize}.\nکد عضویت شما: {code}",
  prize5: "یک طرح مینیمال تا ۱۲ سانتی‌متر",
  prize10: "یک طرح تا ۲۶ سانتی‌متر",
};

export function fillClubSms(text: string, count: number, prize: string, code: string) {
  const body = text
    .replaceAll("{count}", new Intl.NumberFormat("fa-IR").format(count))
    .replaceAll("{prize}", prize)
    .replaceAll("{code}", code);
  if (!code || body.includes(code)) return body;
  return `${body}\nکد عضویت شما: ${code}`;
}

export type ClubSmsKind = "club-code" | "club-submitted" | "club-priced" | "club-booked" | "club-prize5" | "club-prize10";

/** The six buttons of the panel's «پیامک از گوشی خودت» block, in the same order and with the same labels. */
export function clubMemberSms(
  person: { name: string; phone: string; code: string },
  success: number,
  rewards: { milestone: number; title: string; status: string }[],
  settings?: ReferralSmsSettings,
): { kind: ClubSmsKind; label: string; body: string }[] {
  const prize5 = rewards.find((item) => item.milestone === 5)?.title || settings?.prize5 || FALLBACK_CLUB_SMS.prize5;
  const prize10 = rewards.find((item) => item.milestone === 10)?.title || settings?.prize10 || FALLBACK_CLUB_SMS.prize10;
  const texts = settings || FALLBACK_CLUB_SMS;
  return [
    {
      kind: "club-code",
      label: "کد عضویت",
      body: `سلام ${person.name}\nکد عضویت باشگاه مشتریان تو: ${person.code}\nاین کد را به دوستت بده. وقتی نوبت او قطعی شد، یک معرفی موفق برای تو ثبت می‌شود.\n۵ معرفی موفق: ${prize5}\n۱۰ معرفی موفق: ${prize10}`,
    },
    { kind: "club-submitted", label: "وارد بررسی شد", body: fillClubSms(texts.smsSubmitted, success, "", person.code) },
    { kind: "club-priced", label: "قیمت اعلام شد", body: fillClubSms(texts.smsPriced, success, "", person.code) },
    { kind: "club-booked", label: "معرفی موفق", body: fillClubSms(texts.smsBooked, success, "", person.code) },
    { kind: "club-prize5", label: "جایزه ۵", body: fillClubSms(texts.smsPrize5, success, prize5, person.code) },
    { kind: "club-prize10", label: "جایزه ۱۰", body: fillClubSms(texts.smsPrize10, success, prize10, person.code) },
  ];
}
