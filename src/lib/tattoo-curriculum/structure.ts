import type { Chapter, Part } from "./types.ts";

export const PARTS: Part[] = [
  { id: "p1", order: 1, level: "مبتدی", title: "بخش ۱ — پایه و ایمنی", description: "مسیر کارآموزی، پوست و ترمیم، کنترل عفونت. پیش از دست زدن به دستگاه." },
  { id: "p2", order: 2, level: "مبتدی", title: "بخش ۲ — ابزار و مواد", description: "دستگاه، سوزن، کارتریج و رنگ؛ شناختن ابزار پیش از تمرین روی پوست مصنوعی." },
  { id: "p3", order: 3, level: "مبتدی", title: "بخش ۳ — طراحی و بدن", description: "طراحی روی کاغذ، نوشته، مرجع، جای طرح روی بدن و استنسیل." },
  { id: "p4", order: 4, level: "متوسط", title: "بخش ۴ — اجرا", description: "مشتری و رضایت، کار دست روی پوست، خط، سایه، رنگ، مراقبت و عوارض." },
  { id: "p5", order: 5, level: "پیشرفته", title: "بخش ۵ — پیشرفته و حرفه‌ای", description: "ترمیم، کاور، پروژهٔ بزرگ، سبک‌ها، نمونه‌کار، قیمت‌گذاری و مسئولیت حرفه‌ای." },
];

export const CHAPTERS: Chapter[] = [
  { id: "c01", part: "p1", order: 1, title: "فصل ۱ — ورود به حرفه" },
  { id: "c02", part: "p1", order: 2, title: "فصل ۲ — پوست و ترمیم" },
  { id: "c03", part: "p1", order: 3, title: "فصل ۳ — کنترل عفونت" },
  { id: "c04", part: "p2", order: 4, title: "فصل ۴ — دستگاه تاتو" },
  { id: "c05", part: "p2", order: 5, title: "فصل ۵ — سوزن و کارتریج" },
  { id: "c06", part: "p2", order: 6, title: "فصل ۶ — رنگ تاتو" },
  { id: "c07", part: "p3", order: 7, title: "فصل ۷ — طراحی" },
  { id: "c08", part: "p3", order: 8, title: "فصل ۸ — بدن و استنسیل" },
  { id: "c09", part: "p4", order: 9, title: "فصل ۹ — مشتری و جلسه" },
  { id: "c10", part: "p4", order: 10, title: "فصل ۱۰ — دست روی پوست" },
  { id: "c11", part: "p4", order: 11, title: "فصل ۱۱ — خط، سایه و رنگ" },
  { id: "c12", part: "p4", order: 12, title: "فصل ۱۲ — بعد از جلسه" },
  { id: "c13", part: "p5", order: 13, title: "فصل ۱۳ — کار پیشرفته" },
  { id: "c14", part: "p5", order: 14, title: "فصل ۱۴ — سبک‌ها" },
  { id: "c15", part: "p5", order: 15, title: "فصل ۱۵ — حرفه و مسئولیت" },
];
