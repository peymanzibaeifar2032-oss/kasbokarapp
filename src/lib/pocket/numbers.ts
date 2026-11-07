/** Numeric keyboards may emit Persian or Arabic digits on Android. */
export function latinPocketDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
}
export function pocketAmountDigits(value: string) {
  return latinPocketDigits(value).replace(/\D/g, "");
}
