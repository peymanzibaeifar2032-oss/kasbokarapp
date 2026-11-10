import type { ImageSlot } from "../types.ts";

/** Diagram drawn for this curriculum (docs/tattoo-curriculum/diagrams/<diagram>.svg), Persian labels. */
export function svg(id: string, diagram: string, brief: string, alt: string, caption: string): ImageSlot {
  return {
    id,
    kind: "svg",
    diagram,
    brief,
    alt,
    caption,
    credit: "نمودار آموزشی اختصاصی درس‌نامهٔ استودیو پیمان زیبائی‌فر",
    license: "متعلق به استودیو؛ استفاده در سایت و کتاب همین استودیو",
  };
}

/** A slot only the studio can fill: a real photo of its own work, taken with the client's written permission. */
export function photo(id: string, brief: string, alt: string, caption: string): ImageSlot {
  return {
    id,
    kind: "photo-needed",
    brief,
    alt,
    caption,
    credit: "عکس کار خود استودیو — هنوز فراهم نشده",
    license: "با رضایت کتبی مشتری؛ بدون چهره و نشانهٔ هویتی",
  };
}

export const STUDIO_NOTE = "کارآموز روی پوست مشتری تاتو نمی‌زند؛ همهٔ تمرین‌ها روی کاغذ، پوست مصنوعی یا میوه انجام می‌شود.";
